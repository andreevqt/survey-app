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
