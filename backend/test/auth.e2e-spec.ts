import 'reflect-metadata';
import { execSync } from 'node:child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { buildApp } from '../src/main';
import type { INestApplication } from '@nestjs/common';

jest.setTimeout(120_000);

let pg: StartedPostgreSqlContainer;
let app: INestApplication;

beforeAll(async () => {
  pg = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DATABASE_URL = pg.getConnectionUri();
  process.env.JWT_ACCESS_SECRET = 'a-secret';
  process.env.JWT_REFRESH_SECRET = 'r-secret';
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

  execSync('npx prisma migrate deploy', {
    cwd: __dirname + '/..',
    env: { ...process.env, DATABASE_URL: pg.getConnectionUri() },
    stdio: 'inherit',
  });

  app = await buildApp();
  await app.init();
});

afterAll(async () => {
  await app?.close();
  await pg?.stop();
});

describe('auth e2e', () => {
  const agent = () => request.agent(app.getHttpServer());

  it('register → me → logout → me-fails round trip', async () => {
    const a = agent();
    const reg = await a.post('/api/v1/auth/register').send({
      email: 'eve@example.com', name: 'Eve', password: 'hunter22!',
    }).expect(201);
    expect(reg.body.user.email).toBe('eve@example.com');

    const me = await a.get('/api/v1/auth/me').expect(200);
    expect(me.body.id).toEqual(expect.any(String));

    await a.post('/api/v1/auth/logout').expect(204);

    await a.get('/api/v1/auth/me').expect(401);
  });

  it('login → refresh rotates → reusing the old refresh cookie fails', async () => {
    // Register → capture the initial refresh cookie verbatim from Set-Cookie.
    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'mallory@example.com', name: 'Mallory', password: 'hunter22!' })
      .expect(201);

    const setCookies = reg.headers['set-cookie'] as unknown as string[];
    const refreshCookie = setCookies.find((c) => c.startsWith('refresh_token='));
    if (!refreshCookie) throw new Error('no refresh_token cookie set on register');

    // First use of that refresh cookie — rotates, returns 200.
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(200);

    // Replaying the exact same cookie value — the underlying row was deleted; expect 401.
    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .expect(401);
    expect(replay.body.code).toBe('REFRESH_INVALID');
  });

  it('rejects duplicate registration with EMAIL_TAKEN', async () => {
    const a = agent();
    await a.post('/api/v1/auth/register').send({
      email: 'dup@example.com', name: 'D', password: 'hunter22!',
    }).expect(201);
    const dup = await request(app.getHttpServer()).post('/api/v1/auth/register').send({
      email: 'dup@example.com', name: 'D', password: 'hunter22!',
    }).expect(409);
    expect(dup.body.code).toBe('EMAIL_TAKEN');
  });
});
