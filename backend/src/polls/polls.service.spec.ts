import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { SlugService } from './slug.service';
import { PollsService } from './polls.service';
import { QuestionType, Visibility } from '@prisma/client';

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
