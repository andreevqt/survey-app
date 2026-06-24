import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TokensService } from './tokens.service';
import { AuthService } from './auth.service';
import { Role, AuthTokenType } from '@prisma/client';

function mailMock() {
  return { sendVerificationEmail: jest.fn(), sendPasswordResetEmail: jest.fn() };
}

describe('AuthService.register', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'a-secret';
    process.env.JWT_REFRESH_SECRET = 'r-secret';
    process.env.SKIP_EMAIL_VERIFICATION = 'true';
  });

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        TokensService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailMock() },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('creates a user with a bcrypt hash and issues a token pair (skip flag on)', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, emailVerified: true,
      passwordHash: 'h', createdAt: new Date(), updatedAt: new Date(),
    } as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const result = await svc.register({ email: 'A@B.com', name: 'A', password: 'hunter22!' });

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ email: 'a@b.com', role: Role.USER }),
    }));
    const hashed: string = (prisma.user.create.mock.calls[0][0] as any).data.passwordHash;
    expect(await bcrypt.compare('hunter22!', hashed)).toBe(true);

    expect(result.status).toBe('verified');
    if (result.status !== 'verified') throw new Error('expected verified');
    expect(result.user.email).toBe('a@b.com');
    expect(result.tokens.accessToken).toEqual(expect.any(String));
    expect(result.tokens.refreshToken).toEqual(expect.any(String));
    expect(prisma.refreshToken.create).toHaveBeenCalled();
  });

  it('requires verification + sends an email when the skip flag is off', async () => {
    process.env.SKIP_EMAIL_VERIFICATION = '';
    const mail = mailMock();
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        TokensService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    const localSvc = mod.get(AuthService);

    prisma.user.findUnique.mockResolvedValueOnce(null);
    prisma.user.create.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, emailVerified: false,
      passwordHash: 'h', createdAt: new Date(), updatedAt: new Date(),
    } as any);

    const result = await localSvc.register({ email: 'a@b.com', name: 'A', password: 'hunter22!' });

    expect(result.status).toBe('verification_required');
    expect(mail.sendVerificationEmail).toHaveBeenCalledWith('a@b.com', expect.any(String));
    expect(prisma.authToken.create).toHaveBeenCalled();
    process.env.SKIP_EMAIL_VERIFICATION = 'true';
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
        { provide: MailService, useValue: mailMock() },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('returns user + tokens on a valid password', async () => {
    const hash = await bcrypt.hash('hunter22!', 4);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: hash, emailVerified: true,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const r = await svc.login({ email: 'a@b.com', password: 'hunter22!' });
    expect(r.user.id).toBe('u1');
    expect(r.tokens.accessToken).toEqual(expect.any(String));
  });

  it('rejects an unverified account with EMAIL_NOT_VERIFIED', async () => {
    const hash = await bcrypt.hash('hunter22!', 4);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: hash, emailVerified: false,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    await expect(svc.login({ email: 'a@b.com', password: 'hunter22!' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects on unknown email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.login({ email: 'x@y.z', password: 'x' }))
      .rejects.toThrow(/UNAUTHENTICATED|Unauthorized/);
  });

  it('rejects on wrong password', async () => {
    const hash = await bcrypt.hash('correct', 4);
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: hash, emailVerified: true,
      createdAt: new Date(), updatedAt: new Date(),
    } as any);
    await expect(svc.login({ email: 'a@b.com', password: 'wrong' }))
      .rejects.toThrow(/UNAUTHENTICATED|Unauthorized/);
  });
});

describe('AuthService.verifyEmail', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;
  let tokens: TokensService;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        TokensService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailMock() },
      ],
    }).compile();
    svc = mod.get(AuthService);
    tokens = mod.get(TokensService);
  });

  it('verifies, clears tokens, and issues a session', async () => {
    prisma.authToken.findUnique.mockResolvedValueOnce({
      id: 't1', userId: 'u1', type: AuthTokenType.EMAIL_VERIFY,
      tokenHash: tokens.hashUrlToken('raw'), expiresAt: new Date(Date.now() + 10000), createdAt: new Date(),
    } as any);
    prisma.user.update.mockResolvedValueOnce({
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, emailVerified: true,
      passwordHash: 'h', createdAt: new Date(), updatedAt: new Date(),
    } as any);
    prisma.refreshToken.create.mockResolvedValueOnce({} as any);

    const r = await svc.verifyEmail('raw');
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { emailVerified: true } });
    expect(prisma.authToken.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(r.tokens.accessToken).toEqual(expect.any(String));
  });

  it('rejects an unknown token with TOKEN_INVALID', async () => {
    prisma.authToken.findUnique.mockResolvedValueOnce(null);
    await expect(svc.verifyEmail('nope')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an expired token with TOKEN_EXPIRED', async () => {
    prisma.authToken.findUnique.mockResolvedValueOnce({
      id: 't1', userId: 'u1', type: AuthTokenType.EMAIL_VERIFY,
      tokenHash: 'x', expiresAt: new Date(Date.now() - 1000), createdAt: new Date(),
    } as any);
    prisma.authToken.delete.mockResolvedValueOnce({} as any);
    await expect(svc.verifyEmail('raw')).rejects.toMatchObject({ response: { code: 'TOKEN_EXPIRED' } });
  });
});

describe('AuthService.forgotPassword', () => {
  let svc: AuthService;
  let prisma: DeepMockProxy<PrismaService>;
  let mail: ReturnType<typeof mailMock>;

  beforeEach(async () => {
    prisma = mockDeep<PrismaService>();
    mail = mailMock();
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [
        AuthService,
        TokensService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mail },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('is a silent no-op for an unknown email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(svc.forgotPassword('nobody@x.com')).resolves.toBeUndefined();
    expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(prisma.authToken.create).not.toHaveBeenCalled();
  });

  it('creates a reset token and sends a mail for a known email', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'a@b.com' } as any);
    await svc.forgotPassword('a@b.com');
    expect(prisma.authToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'u1', type: AuthTokenType.PASSWORD_RESET }),
    }));
    expect(mail.sendPasswordResetEmail).toHaveBeenCalledWith('a@b.com', expect.any(String));
  });
});

describe('AuthService.resetPassword', () => {
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
        { provide: MailService, useValue: mailMock() },
      ],
    }).compile();
    svc = mod.get(AuthService);
  });

  it('updates the password and revokes sessions in a transaction', async () => {
    prisma.authToken.findUnique.mockResolvedValueOnce({
      id: 't1', userId: 'u1', type: AuthTokenType.PASSWORD_RESET,
      tokenHash: 'x', expiresAt: new Date(Date.now() + 10000), createdAt: new Date(),
    } as any);
    prisma.$transaction.mockResolvedValueOnce([] as any);

    await svc.resetPassword('raw', 'newpassword1');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects an expired token with TOKEN_EXPIRED', async () => {
    prisma.authToken.findUnique.mockResolvedValueOnce({
      id: 't1', userId: 'u1', type: AuthTokenType.PASSWORD_RESET,
      tokenHash: 'x', expiresAt: new Date(Date.now() - 1000), createdAt: new Date(),
    } as any);
    prisma.authToken.delete.mockResolvedValueOnce({} as any);
    await expect(svc.resetPassword('raw', 'newpassword1'))
      .rejects.toMatchObject({ response: { code: 'TOKEN_EXPIRED' } });
  });

  it('rejects an EMAIL_VERIFY token used as a reset token', async () => {
    prisma.authToken.findUnique.mockResolvedValueOnce({
      id: 't1', userId: 'u1', type: AuthTokenType.EMAIL_VERIFY,
      tokenHash: 'x', expiresAt: new Date(Date.now() + 10000), createdAt: new Date(),
    } as any);
    await expect(svc.resetPassword('raw', 'newpassword1'))
      .rejects.toMatchObject({ response: { code: 'TOKEN_INVALID' } });
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
        { provide: MailService, useValue: mailMock() },
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
      id: 'u1', email: 'a@b.com', name: 'A', role: Role.USER, passwordHash: 'x', emailVerified: true,
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
      providers: [
        AuthService, TokensService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailMock() },
      ],
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
