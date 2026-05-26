import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../tokens.service';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('Missing JWT_ACCESS_SECRET');
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.access_token ?? null,
      secretOrKey: secret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: AccessTokenPayload) {
    return { id: payload.sub, role: payload.role };
  }
}
