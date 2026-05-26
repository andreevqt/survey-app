import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResponsesService } from './responses.service';

describe('ResponsesService.getPublic', () => {
  let svc: ResponsesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [ResponsesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(ResponsesService);
  });

  const basePoll = {
    id: 'p1', title: 'T', description: null, isActive: true, expiresAt: null,
    questions: [
      { id: 'q1', order: 0, type: 'SINGLE_CHOICE', text: 'Pick', isRequired: true,
        options: [{ id: 'o1', order: 0, text: 'A' }, { id: 'o2', order: 1, text: 'B' }] },
    ],
  };

  it('returns the poll with closed=false when active and not expired', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(basePoll as any);
    const r = await svc.getPublic('abc');
    expect(r.closed).toBe(false);
    expect(r.questions[0].options.length).toBe(2);
  });

  it('returns closed=true when isActive=false', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce({ ...basePoll, isActive: false } as any);
    expect((await svc.getPublic('abc')).closed).toBe(true);
  });

  it('returns closed=true when expiresAt is in the past', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce({
      ...basePoll, expiresAt: new Date(Date.now() - 1000),
    } as any);
    expect((await svc.getPublic('abc')).closed).toBe(true);
  });

  it('throws NOT_FOUND for unknown slug', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(null);
    await expect(svc.getPublic('nope')).rejects.toThrow(/NOT_FOUND|Not Found/);
  });
});

describe('ResponsesService.submit', () => {
  let svc: ResponsesService;
  let prisma: DeepMockProxy<PrismaService>;

  function pollWith(opts: Partial<{ isActive: boolean; expiresAt: Date | null; questions: any[] }> = {}) {
    return {
      id: 'p1', isActive: true, expiresAt: null,
      questions: [
        { id: 'q1', type: QuestionType.SINGLE_CHOICE, isRequired: true,
          options: [{ id: 'o1' }, { id: 'o2' }] },
        { id: 'q2', type: QuestionType.MULTIPLE_CHOICE, isRequired: false,
          options: [{ id: 'o3' }, { id: 'o4' }] },
        { id: 'q3', type: QuestionType.TEXT, isRequired: true, options: [] },
      ],
      ...opts,
    };
  }

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [ResponsesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(ResponsesService);
  });

  it('happy path: persists Response + Answers + AnswerOption rows', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
    prisma.response.create.mockResolvedValueOnce({ id: 'resp1', createdAt: new Date('2026-05-26T00:00:00Z') } as any);

    const r = await svc.submit({
      slug: 's', respondentCookie: 'c1',
      answers: [
        { questionId: 'q1', optionIds: ['o1'] },
        { questionId: 'q2', optionIds: ['o3', 'o4'] },
        { questionId: 'q3', textValue: 'Yes' },
      ],
    });

    expect(r.submittedAt).toBe('2026-05-26T00:00:00.000Z');
    expect(prisma.response.create).toHaveBeenCalledTimes(1);
  });

  it('returns 403 POLL_CLOSED when isActive=false', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(pollWith({ isActive: false }) as any);
    await expect(svc.submit({ slug: 's', respondentCookie: 'c1', answers: [] }))
      .rejects.toThrow(/POLL_CLOSED/);
  });

  it('returns 403 POLL_CLOSED when expiresAt past', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(pollWith({ expiresAt: new Date(Date.now() - 1000) }) as any);
    await expect(svc.submit({ slug: 's', respondentCookie: 'c1', answers: [] }))
      .rejects.toThrow(/POLL_CLOSED/);
  });

  it('returns 409 ALREADY_RESPONDED on unique-constraint violation', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
    prisma.response.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '5' } as any),
    );
    await expect(svc.submit({
      slug: 's', respondentCookie: 'c1',
      answers: [
        { questionId: 'q1', optionIds: ['o1'] },
        { questionId: 'q3', textValue: 'Y' },
      ],
    })).rejects.toThrow(/ALREADY_RESPONDED/);
  });

  it('rejects missing required answer', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
    await expect(svc.submit({
      slug: 's', respondentCookie: 'c1',
      answers: [{ questionId: 'q1', optionIds: ['o1'] }], // missing q3
    })).rejects.toThrow(/VALIDATION_FAILED/);
  });

  it('rejects SINGLE_CHOICE with multiple optionIds', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
    await expect(svc.submit({
      slug: 's', respondentCookie: 'c1',
      answers: [
        { questionId: 'q1', optionIds: ['o1', 'o2'] },
        { questionId: 'q3', textValue: 'Y' },
      ],
    })).rejects.toThrow(/VALIDATION_FAILED/);
  });

  it('rejects optionId not belonging to this question', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
    await expect(svc.submit({
      slug: 's', respondentCookie: 'c1',
      answers: [
        { questionId: 'q1', optionIds: ['o3'] }, // o3 belongs to q2
        { questionId: 'q3', textValue: 'Y' },
      ],
    })).rejects.toThrow(/VALIDATION_FAILED/);
  });

  it('rejects TEXT required with empty textValue', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(pollWith() as any);
    await expect(svc.submit({
      slug: 's', respondentCookie: 'c1',
      answers: [
        { questionId: 'q1', optionIds: ['o1'] },
        { questionId: 'q3', textValue: '  ' },
      ],
    })).rejects.toThrow(/VALIDATION_FAILED/);
  });
});
