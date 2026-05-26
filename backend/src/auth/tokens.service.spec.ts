import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { TokensService } from './tokens.service';

describe('TokensService', () => {
  let svc: TokensService;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'a-secret';
    process.env.JWT_REFRESH_SECRET = 'r-secret';
    const mod = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      providers: [TokensService],
    }).compile();
    svc = mod.get(TokensService);
  });

  it('signs and verifies an access token round-trip', async () => {
    const token = await svc.signAccessToken({ sub: 'u1', role: 'USER' });
    const decoded = await svc.verifyAccessToken(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.role).toBe('USER');
  });

  it('signs a refresh token with a jti and verifies it', async () => {
    const { token, jti } = await svc.signRefreshToken({ sub: 'u1' });
    expect(jti).toMatch(/^[a-z0-9_-]{8,}/i);
    const decoded = await svc.verifyRefreshToken(token);
    expect(decoded.sub).toBe('u1');
    expect(decoded.jti).toBe(jti);
  });

  it('hashes and compares a jti for storage', async () => {
    const h = await svc.hashJti('jti-1');
    expect(h).not.toBe('jti-1');
    expect(await svc.compareJti('jti-1', h)).toBe(true);
    expect(await svc.compareJti('jti-2', h)).toBe(false);
  });

  it('builds cookie options that match the security profile', () => {
    process.env.NODE_ENV = 'production';
    const opts = svc.cookieOptions('access');
    expect(opts).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api/v1', secure: true });
    process.env.NODE_ENV = 'development';
    expect(svc.cookieOptions('access').secure).toBe(false);
  });
});
