import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { SlugService } from './slug.service';
import { PollsService } from './polls.service';
import { QuestionType, Visibility } from '@prisma/client';

describe('PollsService.findMine', () => {
  let svc: PollsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [
        PollsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlugService, useValue: mockDeep<SlugService>() },
      ],
    }).compile();
    svc = mod.get(PollsService);
  });

  it('returns owner polls paginated newest-first with response counts', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      [
        { id: 'p2', slug: 's2', title: 'B', description: null, visibility: 'PRIVATE',
          isActive: true, expiresAt: null, createdAt: new Date(), _count: { responses: 3 } },
        { id: 'p1', slug: 's1', title: 'A', description: 'd', visibility: 'PUBLIC',
          isActive: false, expiresAt: null, createdAt: new Date(), _count: { responses: 0 } },
      ],
      2,
    ] as any);

    const r = await svc.findMine('u1', { page: 1, pageSize: 20 });
    expect(r.total).toBe(2);
    expect(r.items[0].id).toBe('p2');
    expect(r.items[0].responseCount).toBe(3);
    expect(r.items[1].responseCount).toBe(0);
  });
});

describe('PollsService.findOne (owner-scoped)', () => {
  let svc: PollsService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [
        PollsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlugService, useValue: mockDeep<SlugService>() },
      ],
    }).compile();
    svc = mod.get(PollsService);
  });

  it('returns the poll with questions, options, responseCount for the owner', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce({
      id: 'p1', slug: 's', ownerId: 'u1', title: 'T', description: null,
      visibility: 'PRIVATE', isActive: true, expiresAt: null,
      createdAt: new Date(), updatedAt: new Date(),
      questions: [], _count: { responses: 5 },
    } as any);

    const p = await svc.findOne('u1', 'p1');
    expect(p.id).toBe('p1');
    expect(p.responseCount).toBe(5);
  });

  it('throws 404 when poll is not owned by the user', async () => {
    prisma.poll.findFirst.mockResolvedValueOnce(null);
    await expect(svc.findOne('u1', 'p1')).rejects.toThrow(/NOT_FOUND|Not Found/);
  });
});

describe('PollsService.create', () => {
  let svc: PollsService;
  let prisma: DeepMockProxy<PrismaService>;
  let slug: DeepMockProxy<SlugService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    slug = mockDeep<SlugService>();
    const mod = await Test.createTestingModule({
      providers: [
        PollsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SlugService, useValue: slug },
      ],
    }).compile();
    svc = mod.get(PollsService);
  });

  it('creates a poll with nested questions and options, assigning order indices', async () => {
    slug.generate.mockResolvedValueOnce('abc1234567');
    prisma.poll.create.mockResolvedValueOnce({
      id: 'p1', slug: 'abc1234567', ownerId: 'u1', title: 'T',
      description: null, visibility: Visibility.PRIVATE, isActive: true,
      expiresAt: null, createdAt: new Date(), updatedAt: new Date(),
      questions: [
        { id: 'q1', order: 0, type: QuestionType.SINGLE_CHOICE, text: 'Color?', isRequired: true,
          options: [{ id: 'o1', order: 0, text: 'Red' }, { id: 'o2', order: 1, text: 'Blue' }] },
        { id: 'q2', order: 1, type: QuestionType.TEXT, text: 'Why?', isRequired: false, options: [] },
      ],
    } as any);

    const r = await svc.create('u1', {
      title: 'T', visibility: Visibility.PRIVATE, isActive: true,
      questions: [
        { type: QuestionType.SINGLE_CHOICE, text: 'Color?', isRequired: true,
          options: [{ text: 'Red' }, { text: 'Blue' }] },
        { type: QuestionType.TEXT, text: 'Why?', isRequired: false },
      ],
    });

    // The orders must be assigned by the service, not trusted from input.
    const callArg = prisma.poll.create.mock.calls[0][0] as any;
    const qs = callArg.data.questions.create as any[];
    expect(qs[0].order).toBe(0);
    expect(qs[1].order).toBe(1);
    const opts = qs[0].options.create as any[];
    expect(opts[0].order).toBe(0);
    expect(opts[1].order).toBe(1);
    // TEXT questions: no options to nest.
    expect(qs[1].options).toBeUndefined();

    expect(r.slug).toBe('abc1234567');
  });
});
