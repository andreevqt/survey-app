import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { QuestionType } from '@prisma/client';

describe('AnalyticsService.getOwnerAnalytics', () => {
  let svc: AnalyticsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AnalyticsService);
  });

  function pollFixture() {
    return {
      id: 'p1', title: 'T', ownerId: 'u1',
      _count: { responses: 5 },
      questions: [
        {
          id: 'q1', order: 0, text: 'Pick', type: QuestionType.SINGLE_CHOICE,
          options: [
            { id: 'o1', order: 0, text: 'A' },
            { id: 'o2', order: 1, text: 'B' },
          ],
          _count: { answers: 5 },
        },
        {
          id: 'q2', order: 1, text: 'Why?', type: QuestionType.TEXT,
          options: [],
          _count: { answers: 3 },
        },
      ],
    } as any;
  }

  it('returns total responses and per-question option counts', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce(pollFixture());
    prisma.answerOption.groupBy.mockResolvedValueOnce([
      { optionId: 'o1', _count: { optionId: 3 } },
      { optionId: 'o2', _count: { optionId: 2 } },
    ] as any);

    const r = await svc.getOwnerAnalytics('u1', 'p1');
    expect(r.pollId).toBe('p1');
    expect(r.totalResponses).toBe(5);
    expect(r.questions).toHaveLength(2);

    const q1 = r.questions[0];
    expect(q1.options.find((o) => o.optionId === 'o1')!.count).toBe(3);
    expect(q1.options.find((o) => o.optionId === 'o2')!.count).toBe(2);

    const q2 = r.questions[1];
    expect(q2.type).toBe(QuestionType.TEXT);
    expect(q2.textAnswerCount).toBe(3);
    expect(q2.options).toEqual([]);
  });

  it('returns zero counts for options that received no votes', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce(pollFixture());
    prisma.answerOption.groupBy.mockResolvedValueOnce([
      { optionId: 'o1', _count: { optionId: 5 } },
    ] as any);

    const r = await svc.getOwnerAnalytics('u1', 'p1');
    expect(r.questions[0].options.find((o) => o.optionId === 'o2')!.count).toBe(0);
  });

  it('throws NOT_FOUND when poll is not owned by the user', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce(null);
    await expect(svc.getOwnerAnalytics('u1', 'p1')).rejects.toThrow(/NOT_FOUND|Not Found/);
  });
});

describe('AnalyticsService.analyzeFreeTextQuestion', () => {
  let svc: AnalyticsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AnalyticsService);
  });

  it('returns neutral 100% with "No responses yet." when there are no answers', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce({ id: 'p1' } as any);
    prisma.question.findFirst.mockResolvedValueOnce({ id: 'q1', type: QuestionType.TEXT } as any);
    prisma.answer.findMany.mockResolvedValueOnce([] as any);

    const out = await svc.analyzeFreeTextQuestion('u1', 'p1', 'q1');
    expect(out.sentiment).toEqual({ positive: 0, neutral: 100, negative: 0 });
    expect(out.summary).toBe('No responses yet.');
    expect(out.themes).toEqual([]);
  });

  it('builds themes ordered by frequency and sentiment summing to 100', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce({ id: 'p1' } as any);
    prisma.question.findFirst.mockResolvedValueOnce({ id: 'q1', type: QuestionType.TEXT } as any);
    prisma.answer.findMany.mockResolvedValueOnce([
      { textValue: 'The pricing is great and the support is helpful' },
      { textValue: 'Pricing is too high but support is amazing' },
      { textValue: 'Confusing pricing page, otherwise fine' },
    ] as any);

    const out = await svc.analyzeFreeTextQuestion('u1', 'p1', 'q1');
    expect(out.sentiment.positive + out.sentiment.neutral + out.sentiment.negative).toBe(100);
    expect(out.themes[0].label).toBe('pricing');
    expect(out.themes[0].count).toBe(3);
    expect(out.summary.startsWith('3 responses')).toBe(true);
  });

  it('throws when the question is not TEXT', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce({ id: 'p1' } as any);
    prisma.question.findFirst.mockResolvedValueOnce({ id: 'q1', type: QuestionType.SINGLE_CHOICE } as any);

    await expect(svc.analyzeFreeTextQuestion('u1', 'p1', 'q1')).rejects.toThrow(/free-text/);
  });

  it('throws NOT_FOUND when the poll is not owned by the caller', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce(null);
    await expect(svc.analyzeFreeTextQuestion('u1', 'p1', 'q1')).rejects.toThrow(/NOT_FOUND|Not Found/);
  });
});

describe('AnalyticsService.getSystemAnalytics', () => {
  let svc: AnalyticsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AnalyticsService);
  });

  it('aggregates user / poll / response totals', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      42, 3, 17, 9, 233,
    ] as any);
    const r = await svc.getSystemAnalytics();
    expect(r).toEqual({
      totalUsers: 42,
      totalAdmins: 3,
      totalPolls: 17,
      activePolls: 9,
      totalResponses: 233,
    });
  });
});
