import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { TokensService } from './tokens.service';
import { AuthService } from './auth.service';
import { Role } from '@prisma/client';

describe('AuthService.register', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'a-secret';
    process.env.JWT_REFRESH_SECRET = 'r-secret';
  });

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        TokensService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('creates a user with a bcrypt hash and issues a token pair', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER,
      passwordHash: 'h', createdAt: new Date(), updatedAt: new Date(),
    } as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const result = await svc.register({ email: 'A@B.com', name: 'A', password: 'hunter22!' });

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'a@b.com', role: Role.USER }),
    }));
    const hashed: string = (prisma.user.create.mock.calls[0][0] as any).data.passwordHash;
    expect(await bcrypt.compare('hunter22!', hashed)).toBe(true);

    expect(result.user.email).toBe('a@b.com');
    expect(result.tokens.accessToken).toEqual(expect.any(String));
    expect(result.tokens.refreshToken).toEqual(expect.any(String));
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('throws EMAIL_TAKEN when the email already exists', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1' } as any);
    await expect(svc.register({ email: 'a@b.com', name: 'A', password: 'hunter22!' }))
      .rejects.toBeInstanceOf(ConflictException);
  });
});

describe('AuthService.login', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        TokensService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('returns user + tokens on a valid password', async () => {
    const hash = await bcrypt.hash('hunter22!', 4);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: hash,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const r = await svc.login({ email: 'a@b.com', password: 'hunter22!' });
    expect(r.user.id).toBe('u1');
    expect(r.tokens.accessToken).toEqual(expect.any(String));
  });

  it('rejects on unknown email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.login({ email: 'x@y.z', password: 'x' }))
      .rejects.toThrow(/UNAUTHENTICATED|Unauthorized/);
  });

  it('rejects on wrong password', async () => {
    const hash = await bcrypt.hash('correct', 4);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: hash,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    await expect(svc.login({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toThrow(/UNAUTHENTICATED|Unauthorized/);
  });
});

describe('AuthService.refresh (rotation)', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService, TokensService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('rotates: deletes the old refresh row, issues a new pair', async () => {
    const hash = await bcrypt.hash('jti-1', 10);
    prisma.refreshToken.findMany.mockResolvedValueOnce([
      { id: 't1', userId: 'u1', jtiHash: hash, expiresAt: new Date(Date.now() + 10000), createdAt: new Date() } as any,
    ]);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: 'x',
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    prisma.refreshToken.delete.mockResolvedValueOnce({} as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const r = await svc.refresh({ userId: 'u1', jti: 'jti-1' });
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    expect(r.tokens.accessToken).toEqual(expect.any(String));
    expect(r.tokens.refreshToken).toEqual(expect.any(String));
  });

  it('rejects when no matching jti row exists', async () => {
    prisma.refreshToken.findMany.mockResolvedValueOnce([]);
    await expect(svc.refresh({ userId: 'u1', jti: 'nope' }))
      .rejects.toThrow(/REFRESH_INVALID|Unauthorized/);
  });
});

describe('AuthService.logout', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [AuthService, TokensService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('deletes the matching refresh row by jti hash', async () => {
    const hash = await bcrypt.hash('jti-1', 10);
    prisma.refreshToken.findMany.mockResolvedValueOnce([
      { id: 't1', userId: 'u1', jtiHash: hash, expiresAt: new Date(Date.now() + 10000), createdAt: new Date() } as any,
    ]);
    prisma.refreshToken.delete.mockResolvedValueOnce({} as any);
    await svc.logout({ userId: 'u1', jti: 'jti-1' });
    expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });

  it('is a no-op when no matching row', async () => {
    prisma.refreshToken.findMany.mockResolvedValueOnce([]);
    await expect(svc.logout({ userId: 'u1', jti: 'x' })).resolves.toBeUndefined();
    expect(prisma.refreshToken.delete).not.toHaveBeenCalled();
  });
});
