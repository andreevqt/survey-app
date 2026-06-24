import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthTokenType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { TokensService } from './tokens.service';

export interface IssuedTokens { accessToken: string; refreshToken: string }
export interface AuthResult {
  user: { id: string; email: string; name: string; role: 'USER' | 'ADMIN' };
  tokens: IssuedTokens;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
  ) {}

  async register(args: { email: string; name: string; password: string }): Promise<
    | { status: 'verified'; user: AuthResult['user']; tokens: IssuedTokens }
    | { status: 'verification_required'; email: string }
  > {
    const email = args.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
    }
    const passwordHash = await bcrypt.hash(args.password, 10);
    const skip =
      process.env.SKIP_EMAIL_VERIFICATION === 'true' && process.env.NODE_ENV !== 'production';
    const user = await this.prisma.user.create({
      data: { email, name: args.name, passwordHash, role: 'USER', emailVerified: skip },
    });

    if (skip) {
      const tokens = await this.issueTokens(user.id, user.role);
      return {
        status: 'verified',
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        tokens,
      };
    }

    await this.sendVerificationToken(user.id, user.email);
    return { status: 'verification_required', email: user.email };
  }

  private async sendVerificationToken(userId: string, email: string): Promise<void> {
    await this.prisma.authToken.deleteMany({ where: { userId, type: AuthTokenType.EMAIL_VERIFY } });
    const raw = this.tokens.generateUrlToken();
    await this.prisma.authToken.create({
      data: {
        userId,
        type: AuthTokenType.EMAIL_VERIFY,
        tokenHash: this.tokens.hashUrlToken(raw),
        expiresAt: this.tokens.authTokenExpiresAt('EMAIL_VERIFY'),
      },
    });
    await this.mail.sendVerificationEmail(email, raw);
  }

  async login(args: { email: string; password: string }): Promise<AuthResult> {
    const email = args.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED' });
    }
    const ok = await bcrypt.compare(args.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED' });
    }
    if (!user.emailVerified) {
      throw new ForbiddenException({ code: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email first' });
    }
    const tokens = await this.issueTokens(user.id, user.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  async refresh(args: { userId: string; jti: string }): Promise<AuthResult> {
    const row = await this.findRefreshRow(args.userId, args.jti);
    if (!row) {
      throw new UnauthorizedException({ code: 'REFRESH_INVALID' });
    }
    await this.prisma.refreshToken.delete({ where: { id: row.id } });
    const user = await this.prisma.user.findUnique({ where: { id: args.userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 'REFRESH_INVALID' });
    }
    const tokens = await this.issueTokens(user.id, user.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  async logout(args: { userId: string; jti: string }): Promise<void> {
    const row = await this.findRefreshRow(args.userId, args.jti);
    if (row) await this.prisma.refreshToken.delete({ where: { id: row.id } });
  }

  async findUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED' });
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async updateMe(userId: string, dto: { name?: string; email?: string }) {
    const data: { name?: string; email?: string; emailVerified?: boolean } = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
      }
      data.email = email;
    }
    if (Object.keys(data).length === 0) {
      return this.findUserById(userId);
    }
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    const emailChanged = data.email !== undefined && data.email !== current?.email;
    if (emailChanged) data.emailVerified = false;
    const user = await this.prisma.user.update({ where: { id: userId }, data });
    if (emailChanged) await this.sendVerificationToken(user.id, user.email);
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  async changePassword(userId: string, dto: { currentPassword: string; newPassword: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({ code: 'UNAUTHENTICATED' });
    }
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException({ code: 'CURRENT_PASSWORD_INVALID', message: 'Current password is incorrect' });
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  async verifyEmail(rawToken: string): Promise<AuthResult> {
    const tokenHash = this.tokens.hashUrlToken(rawToken);
    const row = await this.prisma.authToken.findUnique({ where: { tokenHash } });
    if (!row || row.type !== AuthTokenType.EMAIL_VERIFY) {
      throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Invalid verification link' });
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await this.prisma.authToken.delete({ where: { id: row.id } });
      throw new BadRequestException({ code: 'TOKEN_EXPIRED', message: 'This link has expired' });
    }
    const user = await this.prisma.user.update({
      where: { id: row.userId },
      data: { emailVerified: true },
    });
    await this.prisma.authToken.deleteMany({ where: { userId: user.id } }); // verify + any reset tokens
    const tokens = await this.issueTokens(user.id, user.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
  }

  // TODO: rate-limit — currently an unmetered email-send primitive.
  async resendVerification(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) {
      await this.sendVerificationToken(user.id, user.email);
    }
  }

  // TODO: rate-limit — currently an unmetered email-send primitive.
  async forgotPassword(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return;
    await this.prisma.authToken.deleteMany({
      where: { userId: user.id, type: AuthTokenType.PASSWORD_RESET },
    });
    const raw = this.tokens.generateUrlToken();
    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        type: AuthTokenType.PASSWORD_RESET,
        tokenHash: this.tokens.hashUrlToken(raw),
        expiresAt: this.tokens.authTokenExpiresAt('PASSWORD_RESET'),
      },
    });
    await this.mail.sendPasswordResetEmail(user.email, raw);
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.tokens.hashUrlToken(rawToken);
    const row = await this.prisma.authToken.findUnique({ where: { tokenHash } });
    if (!row || row.type !== AuthTokenType.PASSWORD_RESET) {
      throw new BadRequestException({ code: 'TOKEN_INVALID', message: 'Invalid reset link' });
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await this.prisma.authToken.delete({ where: { id: row.id } });
      throw new BadRequestException({ code: 'TOKEN_EXPIRED', message: 'This link has expired' });
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: row.userId }, data: { passwordHash } }),
      this.prisma.authToken.deleteMany({ where: { userId: row.userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: row.userId } }), // force re-login everywhere
    ]);
  }

  private async findRefreshRow(userId: string, jti: string) {
    const rows = await this.prisma.refreshToken.findMany({ where: { userId } });
    for (const r of rows) {
      if (await this.tokens.compareJti(jti, r.jtiHash)) return r;
    }
    return null;
  }

  private async issueTokens(userId: string, role: 'USER' | 'ADMIN'): Promise<IssuedTokens> {
    const accessToken = await this.tokens.signAccessToken({ sub: userId, role });
    const { token: refreshToken, jti } = await this.tokens.signRefreshToken({ sub: userId });
    const jtiHash = await this.tokens.hashJti(jti);
    await this.prisma.refreshToken.create({
      data: { userId, jtiHash, expiresAt: this.tokens.refreshExpiresAt() },
    });
    return { accessToken, refreshToken };
  }
}
