import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

export interface AccessTokenPayload { sub: string; role: 'USER' | 'ADMIN' }
export interface RefreshTokenPayload { sub: string; jti: string }

@Injectable()
export class TokensService {
  constructor(private readonly jwt: JwtService) {}

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      secret: this.requireEnv('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.requireEnv('JWT_ACCESS_SECRET'),
    });
  }

  async signRefreshToken(args: { sub: string }): Promise<{ token: string; jti: string }> {
    const jti = nanoid(24);
    const token = await this.jwt.signAsync({ sub: args.sub, jti }, {
      secret: this.requireEnv('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
    return { token, jti };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.requireEnv('JWT_REFRESH_SECRET'),
    });
  }

  hashJti(jti: string): Promise<string> {
    return bcrypt.hash(jti, 10);
  }

  compareJti(jti: string, hash: string): Promise<boolean> {
    return bcrypt.compare(jti, hash);
  }

  cookieOptions(kind: 'access' | 'refresh'): {
    httpOnly: true; sameSite: 'lax'; path: string; secure: boolean; maxAge: number;
  } {
    const maxAge = kind === 'access' ? 15 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    return {
      httpOnly: true,
      sameSite: 'lax',
      path: '/api/v1',
      secure: process.env.NODE_ENV === 'production',
      maxAge,
    };
  }

  refreshExpiresAt(): Date {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  private requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var ${name}`);
    return v;
  }
}
