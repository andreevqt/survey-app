import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AiAnalysisDto, SentimentDto, ThemeDto } from './dto/ai-analysis.dto';
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

  async analyzeFreeTextQuestion(
    ownerId: string,
    pollId: string,
    questionId: string,
  ): Promise<AiAnalysisDto> {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, ownerId },
      select: { id: true },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Poll not found' });

    const question = await this.prisma.question.findFirst({
      where: { id: questionId, pollId },
      select: { id: true, type: true },
    });
    if (!question) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Question not found' });
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

    return mockAnalyzeAnswers(answers);
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
