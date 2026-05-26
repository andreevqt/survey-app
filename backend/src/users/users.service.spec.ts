import { Test } from '@nestjs/testing';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService.list', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('returns paginated users newest first', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      [
        { id: 'u2', email: 'b@x.com', name: 'B', role: Role.USER, createdAt: new Date('2026-05-02') },
        { id: 'u1', email: 'a@x.com', name: 'A', role: Role.ADMIN, createdAt: new Date('2026-05-01') },
      ],
      2,
    ] as any);

    const r = await svc.list({ page: 1, pageSize: 20 });
    expect(r.total).toBe(2);
    expect(r.items.map((u) => u.id)).toEqual(['u2', 'u1']);
    expect(r.items[1].role).toBe(Role.ADMIN);
    expect(r.items[0].createdAt).toMatch(/^2026-05-02/);
  });
});
