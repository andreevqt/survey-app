import { ConflictException, Injectable } from '@nestjs/common';
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
