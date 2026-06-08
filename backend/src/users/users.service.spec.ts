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

describe('UsersService.create', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('hashes the password and creates the user', async () => {
    prisma.user.create.mockResolvedValueOnce({
      id: 'u1', email: 'a@x.com', name: 'A', role: Role.USER, createdAt: new Date('2026-05-01T00:00:00Z'),
    } as any);
    const r = await svc.create({ name: 'A', email: 'a@x.com', password: 'secret123', role: Role.USER });
    expect(r.id).toBe('u1');
    expect(r.createdAt).toMatch(/^2026-05-01/);
    const arg = prisma.user.create.mock.calls[0][0] as any;
    expect(arg.data.passwordHash).toBeDefined();
    expect(arg.data.passwordHash).not.toBe('secret123');
    expect(arg.data).not.toHaveProperty('password');
  });

  it('throws EMAIL_TAKEN when the email already exists (P2002)', async () => {
    prisma.user.create.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    await expect(
      svc.create({ name: 'A', email: 'a@x.com', password: 'secret123', role: Role.USER }),
    ).rejects.toThrow(/EMAIL_TAKEN|already/);
  });
});

describe('UsersService.update', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('updates name only and does NOT revoke refresh tokens (single-op transaction)', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ role: Role.USER } as any);
    prisma.$transaction.mockResolvedValueOnce([
      { id: 'u1', email: 'a@x.com', name: 'New', role: Role.USER, createdAt: new Date('2026-05-01T00:00:00Z') },
    ] as any);
    const r = await svc.update({ adminId: 'a1', userId: 'u1', dto: { name: 'New' } });
    expect(r.name).toBe('New');
    const ops = prisma.$transaction.mock.calls[0][0] as unknown as any[];
    expect(ops).toHaveLength(1);
  });

  it('revokes refresh tokens when the role changes (two-op transaction)', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ role: Role.USER } as any);
    prisma.$transaction.mockResolvedValueOnce([
      { id: 'u1', email: 'a@x.com', name: 'A', role: Role.ADMIN, createdAt: new Date() },
      { count: 1 },
    ] as any);
    await svc.update({ adminId: 'a1', userId: 'u1', dto: { role: Role.ADMIN } });
    const ops = prisma.$transaction.mock.calls[0][0] as unknown as any[];
    expect(ops).toHaveLength(2);
  });

  it('revokes refresh tokens when the password changes (two-op transaction)', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ role: Role.USER } as any);
    prisma.$transaction.mockResolvedValueOnce([
      { id: 'u1', email: 'a@x.com', name: 'A', role: Role.USER, createdAt: new Date() },
      { count: 1 },
    ] as any);
    await svc.update({ adminId: 'a1', userId: 'u1', dto: { password: 'newsecret1' } });
    const ops = prisma.$transaction.mock.calls[0][0] as unknown as any[];
    expect(ops).toHaveLength(2);
  });

  it('rejects an admin demoting themselves', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ role: Role.ADMIN } as any);
    await expect(
      svc.update({ adminId: 'a1', userId: 'a1', dto: { role: Role.USER } }),
    ).rejects.toThrow(/SELF_DEMOTION_FORBIDDEN|Forbidden/);
  });

  it('rejects demoting the last admin', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ role: Role.ADMIN } as any);
    prisma.user.count.mockResolvedValueOnce(1);
    prisma.user.findMany.mockResolvedValueOnce([{ role: Role.ADMIN }] as any);
    await expect(
      svc.update({ adminId: 'a1', userId: 'u2', dto: { role: Role.USER } }),
    ).rejects.toThrow(/LAST_ADMIN_FORBIDDEN|Forbidden/);
  });

  it('throws NOT_FOUND when the target user does not exist', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null as any);
    await expect(
      svc.update({ adminId: 'a1', userId: 'u9', dto: { name: 'X' } }),
    ).rejects.toThrow(/NOT_FOUND|Not Found/);
  });

  it('throws EMAIL_TAKEN when the new email collides (P2002)', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ role: Role.USER } as any);
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'P2002' }));
    await expect(
      svc.update({ adminId: 'a1', userId: 'u1', dto: { email: 'b@x.com' } }),
    ).rejects.toThrow(/EMAIL_TAKEN|already/);
  });
});

describe('UsersService.deleteOne', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('deletes the user when not self and not the last admin', async () => {
    prisma.user.count.mockResolvedValueOnce(2);
    prisma.user.findMany.mockResolvedValueOnce([{ role: Role.USER }] as any);
    prisma.user.delete.mockResolvedValueOnce({} as any);
    await svc.deleteOne({ adminId: 'a1', userId: 'u1' });
    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
  });

  it('rejects deleting yourself', async () => {
    await expect(svc.deleteOne({ adminId: 'a1', userId: 'a1' }))
      .rejects.toThrow(/SELF_DELETION_FORBIDDEN|Forbidden/);
  });

  it('rejects deleting the last admin', async () => {
    prisma.user.count.mockResolvedValueOnce(1);
    prisma.user.findMany.mockResolvedValueOnce([{ role: Role.ADMIN }] as any);
    await expect(svc.deleteOne({ adminId: 'a1', userId: 'u2' }))
      .rejects.toThrow(/LAST_ADMIN_FORBIDDEN|Forbidden/);
  });

  it('throws NOT_FOUND when the user is gone (P2025)', async () => {
    prisma.user.count.mockResolvedValueOnce(2);
    prisma.user.findMany.mockResolvedValueOnce([{ role: Role.USER }] as any);
    prisma.user.delete.mockRejectedValueOnce(Object.assign(new Error('nf'), { code: 'P2025' }));
    await expect(svc.deleteOne({ adminId: 'a1', userId: 'u9' }))
      .rejects.toThrow(/NOT_FOUND|Not Found/);
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

describe('UsersService.streamCsv', () => {
  let svc: UsersService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(UsersService);
  });

  it('produces a UTF-8 BOM CSV with all users', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'u1', email: 'a@x.com', name: 'A', role: Role.ADMIN, createdAt: new Date('2026-05-01T00:00:00Z') },
      { id: 'u2', email: 'b@x.com', name: 'B, jr.', role: Role.USER, createdAt: new Date('2026-05-02T00:00:00Z') },
    ] as any);

    const csv = await svc.streamCsv();
    /* eslint-disable no-irregular-whitespace */ // assert the intentional UTF-8 BOM
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.replace(/^﻿/, '').split('\n').filter(Boolean);
    /* eslint-enable no-irregular-whitespace */
    expect(lines[0]).toBe('id,name,email,role,createdAt');
    expect(lines[1]).toBe('u1,A,a@x.com,ADMIN,2026-05-01T00:00:00.000Z');
    // Embedded comma in name → quoted
    expect(lines[2]).toBe('u2,"B, jr.",b@x.com,USER,2026-05-02T00:00:00.000Z');
  });
});
