import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiAnalysisDto, CachedAiAnalysisDto, SentimentDto, ThemeDto } from './dto/ai-analysis.dto';
import { OwnerAnalyticsDto } from './dto/owner-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnerAnalytics(ownerId: string, pollId: string): Promise<OwnerAnalyticsDto> {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, ownerId },
      include: {
        questions: {
          include: {
            options: { orderBy: { order: 'asc' } },
            _count: { select: { answers: true } },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { responses: true } },
      },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });

    const optionIds = poll.questions.flatMap((q: any) => q.options.map((o: any) => o.id));
    const optionCounts = optionIds.length
      ? await this.prisma.answerOption.groupBy({
          by: ['optionId'],
          where: { optionId: { in: optionIds } },
          _count: { optionId: true },
        })
      : [];
    const countByOption = new Map<string, number>();
    for (const row of optionCounts as any[]) {
      countByOption.set(row.optionId, row._count.optionId);
    }

    return {
      pollId: poll.id,
      title: poll.title,
      totalResponses: (poll as any)._count.responses,
      questions: poll.questions.map((q: any) => ({
        questionId: q.id,
        text: q.text,
        order: q.order,
        type: q.type,
        answerCount: q._count.answers,
        options: q.options.map((o: any) => ({
          optionId: o.id,
          text: o.text,
          order: o.order,
          count: countByOption.get(o.id) ?? 0,
        })),
        ...(q.type === QuestionType.TEXT ? { textAnswerCount: q._count.answers } : {}),
      })),
    };
  }

  async getAnalyticsById(pollId: string): Promise<OwnerAnalyticsDto> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        questions: {
          include: {
            options: { orderBy: { order: 'asc' } },
            _count: { select: { answers: true } },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { responses: true } },
      },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });

    const optionIds = poll.questions.flatMap((q: any) => q.options.map((o: any) => o.id));
    const optionCounts = optionIds.length
      ? await this.prisma.answerOption.groupBy({
          by: ['optionId'],
          where: { optionId: { in: optionIds } },
          _count: { optionId: true },
        })
      : [];
    const countByOption = new Map<string, number>();
    for (const row of optionCounts as any[]) {
      countByOption.set(row.optionId, row._count.optionId);
    }

    return {
      pollId: poll.id,
      title: poll.title,
      totalResponses: (poll as any)._count.responses,
      questions: poll.questions.map((q: any) => ({
        questionId: q.id,
        text: q.text,
        order: q.order,
        type: q.type,
        answerCount: q._count.answers,
        options: q.options.map((o: any) => ({
          optionId: o.id,
          text: o.text,
          order: o.order,
          count: countByOption.get(o.id) ?? 0,
        })),
        ...(q.type === QuestionType.TEXT ? { textAnswerCount: q._count.answers } : {}),
      })),
    };
  }

  async getSystemAnalytics() {
    const [totalUsers, totalAdmins, totalPolls, activePolls, totalResponses] =
      await this.prisma.$transaction([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
        this.prisma.poll.count(),
        this.prisma.poll.count({ where: { isActive: true } }),
        this.prisma.response.count(),
      ]);
    return { totalUsers, totalAdmins, totalPolls, activePolls, totalResponses };
  }

  private async loadTextAnswers(
    ownerId: string,
    pollId: string,
    questionId: string,
  ): Promise<{ questionText: string; answers: string[] }> {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, ownerId },
      select: { id: true },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });

    const question = await this.prisma.question.findFirst({
      where: { id: questionId, pollId },
      select: { id: true, type: true, text: true },
    });
    if (!question) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
    if (question.type !== QuestionType.TEXT) {
      throw new BadRequestException({ code: 'QUESTION_NOT_TEXT', message: 'Question is not a free-text question' });
    }

    const rows = await this.prisma.answer.findMany({
      where: { questionId, textValue: { not: null } },
      select: { textValue: true },
    });
    const answers = rows
      .map((r) => r.textValue ?? '')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return { questionText: question.text, answers };
  }

  async analyzeFreeTextQuestion(
    ownerId: string,
    pollId: string,
    questionId: string,
  ): Promise<AiAnalysisDto> {
    const { questionText, answers } = await this.loadTextAnswers(ownerId, pollId, questionId);

    const useProvider = Boolean(process.env.DEEPSEEK_API_KEY);
    if (!useProvider) {
      return mockAnalyzeAnswers(answers);
    }

    const result = await deepseekAnalyzeAnswers(questionText, answers);
    await this.prisma.questionAnalysis.upsert({
      where: { questionId },
      create: {
        questionId,
        // Prisma Json input requires the `unknown` bridge cast for our DTO object.
        result: result as unknown as object,
        answerCount: answers.length,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      },
      update: {
        result: result as unknown as object,
        answerCount: answers.length,
        model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      },
    });
    return result;
  }

  async getQuestionAnalysis(
    ownerId: string,
    pollId: string,
    questionId: string,
  ): Promise<CachedAiAnalysisDto | null> {
    const { answers } = await this.loadTextAnswers(ownerId, pollId, questionId);

    const row = await this.prisma.questionAnalysis.findUnique({ where: { questionId } });
    if (!row) return null;

    const cached = row.result as unknown as AiAnalysisDto;
    return {
      ...cached,
      generatedAt: row.updatedAt.toISOString(),
      stale: row.answerCount !== answers.length,
    };
  }
}

// --- Mock LLM analysis -----------------------------------------------------
// Replace `mockAnalyzeAnswers` with a real provider call (e.g. Anthropic)
// when wiring up production AI. The returned shape MUST stay `AiAnalysisDto`.
// ---------------------------------------------------------------------------

const POSITIVE_WORDS = new Set([
  'good', 'great', 'love', 'loved', 'easy', 'awesome', 'helpful',
  'fast', 'nice', 'perfect', 'useful', 'amazing', 'happy', 'best',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'hate', 'hated', 'slow', 'broken', 'confusing', 'terrible',
  'hard', 'annoying', 'missing', 'useless', 'worst', 'buggy', 'crash',
]);

const STOPWORDS = new Set([
  'the', 'and', 'but', 'with', 'for', 'this', 'that', 'have', 'has',
  'was', 'are', 'you', 'your', 'they', 'their', 'them', 'from',
  'just', 'will', 'would', 'could', 'should', 'about', 'what', 'when',
  'where', 'which', 'into', 'over', 'than', 'very', 'much', 'more',
  'some', 'also', 'because', 'been', 'were',
]);

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function scoreSentiment(answers: string[]): SentimentDto {
  if (answers.length === 0) return { positive: 0, neutral: 100, negative: 0 };
  let pos = 0;
  let neg = 0;
  for (const answer of answers) {
    const tokens = new Set(tokenize(answer));
    const hasPos = [...tokens].some((t) => POSITIVE_WORDS.has(t));
    const hasNeg = [...tokens].some((t) => NEGATIVE_WORDS.has(t));
    if (hasPos && !hasNeg) pos += 1;
    else if (hasNeg && !hasPos) neg += 1;
  }
  const positive = Math.round((pos / answers.length) * 100);
  const negative = Math.round((neg / answers.length) * 100);
  const neutral = Math.max(0, 100 - positive - negative);
  return { positive, neutral, negative };
}

function trimQuote(answer: string): string {
  const collapsed = answer.replace(/\s+/g, ' ').trim();
  return collapsed.length <= 140 ? collapsed : `${collapsed.slice(0, 137)}…`;
}

function buildThemes(answers: string[]): ThemeDto[] {
  if (answers.length === 0) return [];
  const counts = new Map<string, number>();
  for (const a of answers) {
    for (const token of new Set(tokenize(a))) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  let selected = sorted.filter(([, c]) => c >= 2).slice(0, 5);
  if (selected.length < 3) selected = sorted.slice(0, 5);
  return selected.map(([label, count]) => {
    const carrier = answers.find((a) => tokenize(a).includes(label)) ?? '';
    return { label, count, quote: trimQuote(carrier) };
  });
}

function buildSummary(answers: string[], themes: ThemeDto[]): string {
  if (answers.length === 0) return 'No responses yet.';
  const noun = `${answers.length} response${answers.length === 1 ? '' : 's'}`;
  if (themes.length === 0) return `${noun} recorded.`;
  const labels = themes.slice(0, 3).map((t) => t.label);
  if (labels.length === 1) return `${noun}, mostly about ${labels[0]}.`;
  if (labels.length === 2) return `${noun}, mostly about ${labels[0]} and ${labels[1]}.`;
  return `${noun}, mostly about ${labels[0]}, ${labels[1]}, and ${labels[2]}.`;
}

function mockAnalyzeAnswers(answers: string[]): AiAnalysisDto {
  const sentiment = scoreSentiment(answers);
  const themes = buildThemes(answers);
  const summary = buildSummary(answers, themes);
  return { summary, sentiment, themes };
}

// --- DeepSeek provider ----------------------------------------------------
// Called when DEEPSEEK_API_KEY is set. OpenAI-compatible chat-completions
// shape, JSON-mode response, 30s timeout. Errors surface as BadGateway so
// the existing frontend hook renders its red error panel.
// --------------------------------------------------------------------------

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_TIMEOUT_MS = 30_000;

function buildDeepseekPrompt(questionText: string, answers: string[]): string {
  const numbered = answers.length
    ? answers.map((a, i) => `${i + 1}. ${a}`).join('\n')
    : '(no responses)';
  return `Return STRICT JSON of the shape:
{
  "summary": string (1-2 sentences),
  "sentiment": { "positive": number, "neutral": number, "negative": number } (integer percentages, sum 100),
  "themes": [ { "label": string, "count": number, "quote": string } ] (3-5 themes; quote is a short verbatim from the input, ≤ 140 chars)
}
Do not include any prose outside the JSON. Do not wrap in markdown fences.

Question: ${questionText}

Responses:
${numbered}`;
}

function coerceInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function coerceAiAnalysis(raw: unknown): AiAnalysisDto {
  if (!raw || typeof raw !== 'object') {
    throw new Error('schema: not an object');
  }
  const r = raw as Record<string, unknown>;
  const summary = typeof r.summary === 'string' ? r.summary.trim() : '';
  if (!summary) throw new Error('schema: missing summary');

  const sentRaw = (r.sentiment ?? {}) as Record<string, unknown>;
  let positive = Math.max(0, coerceInt(sentRaw.positive, 0));
  let negative = Math.max(0, coerceInt(sentRaw.negative, 0));
  let neutral = Math.max(0, coerceInt(sentRaw.neutral, 0));
  const sum = positive + neutral + negative;
  if (sum !== 100) {
    const drift = 100 - sum;
    neutral = Math.max(0, neutral + drift);
    const total = positive + neutral + negative;
    if (total === 0) {
      neutral = 100;
    } else if (total !== 100) {
      const k = 100 / total;
      positive = Math.round(positive * k);
      negative = Math.round(negative * k);
      neutral = 100 - positive - negative;
      if (neutral < 0) neutral = 0;
    }
  }
  const sentiment: SentimentDto = { positive, neutral, negative };

  const themesRaw = Array.isArray(r.themes) ? r.themes : [];
  const themes: ThemeDto[] = themesRaw
    .slice(0, 5)
    .map((t) => {
      const obj = (t ?? {}) as Record<string, unknown>;
      const label = typeof obj.label === 'string' ? obj.label.trim() : '';
      const count = Math.max(1, coerceInt(obj.count, 1));
      const quote = typeof obj.quote === 'string' ? obj.quote.trim() : '';
      return { label, count, quote };
    })
    .filter((t) => t.label.length > 0);

  return { summary, sentiment, themes };
}

async function deepseekAnalyzeAnswers(
  questionText: string,
  answers: string[],
): Promise<AiAnalysisDto> {
  const apiKey = process.env.DEEPSEEK_API_KEY!;
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You analyze open-text survey responses. Respond with strict JSON only — no prose, no markdown fences.',
      },
      { role: 'user', content: buildDeepseekPrompt(questionText, answers) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 800,
  };

  let response: Response;
  try {
    response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
    });
  } catch (e) {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: `DeepSeek request failed: ${(e as Error).message}`,
    });
  }

  if (!response.ok) {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: `DeepSeek returned HTTP ${response.status}`,
    });
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: 'DeepSeek returned a non-JSON body',
    });
  }

  const content = (payload as any)?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: 'DeepSeek response missing choices[0].message.content',
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: 'DeepSeek content is not valid JSON',
    });
  }

  try {
    return coerceAiAnalysis(parsed);
  } catch (e) {
    throw new BadGatewayException({
      code: 'AI_PROVIDER_ERROR',
      message: `DeepSeek schema mismatch: ${(e as Error).message}`,
    });
  }
}
