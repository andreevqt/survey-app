import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { RefreshTokenPayload } from '../tokens.service';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('Missing JWT_REFRESH_SECRET');
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.refresh_token ?? null,
      secretOrKey: secret,
      ignoreExpiration: false,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: RefreshTokenPayload) {
    const rawToken: string = req.cookies?.refresh_token;
    return { id: payload.sub, jti: payload.jti, rawToken };
  }
}
