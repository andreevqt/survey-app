import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { SlugService } from './slug.service';

describe('SlugService', () => {
  let svc: SlugService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [SlugService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(SlugService);
  });

  it('returns a fresh 10-char nanoid slug on first try', async () => {
    prisma.poll.findUnique.mockResolvedValueOnce(null);
    const slug = await svc.generate();
    expect(slug).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(prisma.poll.findUnique).toHaveBeenCalledTimes(1);
  });

  it('retries on collision until it gets a free one', async () => {
    prisma.poll.findUnique
      .mockResolvedValueOnce({ id: 'x' } as any)
      .mockResolvedValueOnce({ id: 'x' } as any)
      .mockResolvedValueOnce(null);
    const slug = await svc.generate();
    expect(slug).toMatch(/^[A-Za-z0-9_-]{10}$/);
    expect(prisma.poll.findUnique).toHaveBeenCalledTimes(3);
  });

  it('gives up after the configured max attempts', async () => {
    prisma.poll.findUnique.mockResolvedValue({ id: 'x' } as any);
    await expect(svc.generate()).rejects.toThrow(/Could not allocate a unique slug/);
  });
});
