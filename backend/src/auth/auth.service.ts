import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
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
  ) {}

  async register(args: { email: string; name: string; password: string }): Promise<AuthResult> {
    const email = args.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
    }
    const passwordHash = await bcrypt.hash(args.password, 10);
    const user = await this.prisma.user.create({
      data: { email, name: args.name, passwordHash, role: 'USER' },
    });
    const tokens = await this.issueTokens(user.id, user.role);
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      tokens,
    };
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
    const data: { name?: string; email?: string } = {};
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
    const user = await this.prisma.user.update({ where: { id: userId }, data });
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
