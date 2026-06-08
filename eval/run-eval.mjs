// LLM-analytics quality eval harness.
//
// Scores the free-text analysis against eval/gold-set.json on two axes:
//   1. Sentiment accuracy  — does the dominant sentiment bucket match the human label?
//   2. Theme recall/precision — token overlap between returned theme labels and expected themes.
//
// Two providers, selected by env:
//   DEEPSEEK_API_KEY set  -> evaluates the real DeepSeek output (same call the backend makes)
//   unset                 -> evaluates the deterministic mock analyzer (CI-safe, no network/cost)
//
// Usage:
//   node eval/run-eval.mjs            # mock provider (deterministic, free)
//   DEEPSEEK_API_KEY=sk-... node eval/run-eval.mjs   # real provider
//
// Output: per-case scores + aggregate sentiment accuracy and mean theme recall/precision.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gold = JSON.parse(readFileSync(join(__dirname, 'gold-set.json'), 'utf8'));

// ---- Mock analyzer (mirrors the backend's deterministic fallback) --------
const POSITIVE = new Set(['good','great','love','loved','easy','awesome','helpful','fast','nice','perfect','useful','amazing','happy','best','fair','reasonable']);
const NEGATIVE = new Set(['bad','hate','hated','slow','broken','confusing','terrible','hard','annoying','missing','useless','worst','buggy','crash','painful','brittle','outdated','nightmare','flaky']);
const STOP = new Set(['the','and','but','with','for','this','that','have','has','was','are','you','your','they','their','them','from','just','will','would','could','should','about','what','when','where','which','into','over','than','very','much','more','some','also','because','been','were','its','it','a','an','of','to','in','on','i','my','me','we','is']);

function tokenize(s) {
  return s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((t) => t.length >= 3 && !STOP.has(t));
}
function mockAnalyze(answers) {
  let pos = 0, neg = 0;
  for (const a of answers) {
    const toks = new Set(tokenize(a));
    const hp = [...toks].some((t) => POSITIVE.has(t));
    const hn = [...toks].some((t) => NEGATIVE.has(t));
    if (hp && !hn) pos++; else if (hn && !hp) neg++;
  }
  const positive = Math.round((pos / answers.length) * 100);
  const negative = Math.round((neg / answers.length) * 100);
  const neutral = Math.max(0, 100 - positive - negative);
  const counts = new Map();
  for (const a of answers) for (const t of new Set(tokenize(a))) counts.set(t, (counts.get(t) ?? 0) + 1);
  const themes = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, count]) => ({ label, count }));
  return { sentiment: { positive, neutral, negative }, themes };
}

// ---- Real DeepSeek provider (same prompt the backend uses) ----------------
async function deepseekAnalyze(questionText, answers) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const numbered = answers.map((a, i) => `${i + 1}. ${a}`).join('\n');
  const userPrompt = `Return STRICT JSON of the shape:\n{\n  "summary": string,\n  "sentiment": { "positive": number, "neutral": number, "negative": number },\n  "themes": [ { "label": string, "count": number, "quote": string } ]\n}\nNo prose outside JSON.\n\nQuestion: ${questionText}\n\nResponses:\n${numbered}`;
  const r = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You analyze open-text survey responses. Respond with strict JSON only.' },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 800,
    }),
  });
  if (!r.ok) throw new Error(`DeepSeek ${r.status}`);
  const body = await r.json();
  return JSON.parse(body.choices[0].message.content);
}

// ---- Scoring --------------------------------------------------------------
function dominant(sentiment) {
  const e = Object.entries(sentiment).sort((a, b) => b[1] - a[1]);
  return e[0][0]; // positive | neutral | negative
}
function themeScore(returned, expected) {
  const retTokens = new Set(returned.flatMap((t) => tokenize(String(t.label))));
  const expSet = new Set(expected.map((e) => e.toLowerCase()));
  let hit = 0;
  for (const e of expSet) if ([...retTokens].some((rt) => rt.includes(e) || e.includes(rt))) hit++;
  const recall = expSet.size ? hit / expSet.size : 0;
  const precision = retTokens.size ? hit / retTokens.size : 0;
  return { recall: +recall.toFixed(2), precision: +precision.toFixed(2) };
}

const useReal = Boolean(process.env.DEEPSEEK_API_KEY);
const provider = useReal ? 'deepseek' : 'mock';

let sentHits = 0;
let recallSum = 0;
let precSum = 0;
const rows = [];
for (const c of gold.cases) {
  const out = useReal ? await deepseekAnalyze(c.question, c.answers) : mockAnalyze(c.answers);
  const gotSent = dominant(out.sentiment);
  const sentOk = gotSent === c.expected.dominant_sentiment;
  const ts = themeScore(out.themes ?? [], c.expected.themes);
  if (sentOk) sentHits++;
  recallSum += ts.recall;
  precSum += ts.precision;
  rows.push({ id: c.id, expected_sentiment: c.expected.dominant_sentiment, got_sentiment: gotSent, sentiment_ok: sentOk, theme_recall: ts.recall, theme_precision: ts.precision });
}

const n = gold.cases.length;
const summary = {
  provider,
  cases: n,
  sentiment_accuracy: +(sentHits / n).toFixed(2),
  mean_theme_recall: +(recallSum / n).toFixed(2),
  mean_theme_precision: +(precSum / n).toFixed(2),
};
console.log(JSON.stringify({ summary, rows }, null, 2));
