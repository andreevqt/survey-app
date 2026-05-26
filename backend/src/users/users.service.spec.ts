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

describe('UsersService.changeRole', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('updates role and deletes refresh tokens for that user', async () => {
    prisma.$transaction.mockResolvedValueOnce([
      { id: 'u1', email: 'x@x.com', name: 'X', role: Role.ADMIN, createdAt: new Date() },
      { count: 2 },
    ] as any);
    const r = await svc.changeRole({ adminId: 'a1', userId: 'u1', role: Role.ADMIN });
    expect(r.role).toBe(Role.ADMIN);
    // Transaction must do user.update AND refreshToken.deleteMany (2 ops)
    const ops = prisma.$transaction.mock.calls[0][0] as unknown as any[];
    expect(ops).toHaveLength(2);
  });

  it('throws NOT_FOUND on missing user', async () => {
    prisma.$transaction.mockRejectedValueOnce(
      Object.assign(new Error('record not found'), { code: 'P2025' }),
    );
    await expect(svc.changeRole({ adminId: 'a1', userId: 'u9', role: Role.ADMIN }))
      .rejects.toThrow(/NOT_FOUND|Not Found/);
  });

  it('rejects an admin demoting themselves', async () => {
    await expect(svc.changeRole({ adminId: 'a1', userId: 'a1', role: Role.USER }))
      .rejects.toThrow(/SELF_DEMOTION_FORBIDDEN|Forbidden/);
  });
});

describe('UsersService.bulkDelete', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('deletes the listed users and returns the count', async () => {
    prisma.user.count.mockResolvedValueOnce(3); // total admins
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'u1', role: Role.USER },
      { id: 'u2', role: Role.USER },
    ] as any);
    prisma.user.deleteMany.mockResolvedValueOnce({ count: 2 } as any);
    const r = await svc.bulkDelete({ adminId: 'a1', ids: ['u1', 'u2'] });
    expect(r.count).toBe(2);
  });

  it('rejects when ids include the current admin', async () => {
    await expect(svc.bulkDelete({ adminId: 'a1', ids: ['a1', 'u1'] }))
      .rejects.toThrow(/SELF_DELETION_FORBIDDEN|Forbidden/);
  });

  it('rejects when the operation would remove the last admin', async () => {
    prisma.user.count.mockResolvedValueOnce(2); // total admins
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'u1', role: Role.ADMIN },
      { id: 'u2', role: Role.ADMIN },
    ] as any);
    await expect(svc.bulkDelete({ adminId: 'a1', ids: ['u1', 'u2'] }))
      .rejects.toThrow(/LAST_ADMIN_FORBIDDEN|Forbidden/);
  });
});
