import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
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
