// Latency benchmark for survey-app key endpoints.
// Logs in as admin, then measures p50/p95/p99 over N iterations per endpoint.
const BASE = 'http://localhost:3000/api/v1';
const N = 200;

function pct(sorted, p) {
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}
function stats(times) {
  const s = [...times].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    n: s.length,
    mean: +(sum / s.length).toFixed(2),
    p50: +pct(s, 50).toFixed(2),
    p95: +pct(s, 95).toFixed(2),
    p99: +pct(s, 99).toFixed(2),
    min: +s[0].toFixed(2),
    max: +s[s.length - 1].toFixed(2),
  };
}

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@polls.local', password: 'admin' }),
  });
  const cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  if (!r.ok) throw new Error(`login ${r.status}`);
  return cookie;
}

async function timeIt(fn, n) {
  const times = [];
  // warmup
  for (let i = 0; i < 5; i++) await fn();
  for (let i = 0; i < n; i++) {
    const t0 = performance.now();
    await fn();
    times.push(performance.now() - t0);
  }
  return stats(times);
}

const cookie = await login();
const H = { cookie, 'Content-Type': 'application/json' };

const cases = {
  'GET /public/polls/:slug (anon read)': async () => {
    await fetch(`${BASE}/public/polls/framework-prefs`);
  },
  'GET /polls (auth list)': async () => {
    await fetch(`${BASE}/polls`, { headers: H });
  },
  'GET /polls/:id/analytics (owner)': async () => {
    await fetch(`${BASE}/polls/demo_poll_text/analytics`, { headers: H });
  },
  'GET .../analysis (cache MISS, null)': async () => {
    await fetch(`${BASE}/polls/demo_poll_text/questions/demo_q_text/analysis`, { headers: H });
  },
  'POST .../responses (anon submit)': async () => {
    // submit to the single-choice demo poll; cookie-dedup means most are dupes (still exercises the path)
    await fetch(`${BASE}/public/polls/framework-prefs/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: [{ questionId: 'demo_q_single', selectedOptionIds: ['demo_opt_react'] }] }),
    });
  },
};

const results = {};
for (const [name, fn] of Object.entries(cases)) {
  results[name] = await timeIt(fn, N);
}

// Cache before/after: seed a cache row, then measure cache-HIT GET vs the mock POST generate.
// (Mock generate stands in for the provider call's server-side work; real DeepSeek adds network seconds on top.)
results['POST .../analyze (mock generate)'] = await timeIt(async () => {
  await fetch(`${BASE}/polls/demo_poll_text/questions/demo_q_text/analyze`, { method: 'POST', headers: H });
}, N);

console.log(JSON.stringify({ n: N, results }, null, 2));
