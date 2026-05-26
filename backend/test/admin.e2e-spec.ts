import 'reflect-metadata';
import { execSync } from 'node:child_process';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { buildApp } from '../src/main';
import type { INestApplication } from '@nestjs/common';

jest.setTimeout(120_000);

let pg: StartedPostgreSqlContainer;
let app: INestApplication;

const ADMIN_EMAIL = 'admin@polls.local';
const ADMIN_PASSWORD = 'admin';

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

  execSync('npx prisma db seed', {
    cwd: __dirname + '/..',
    env: {
      ...process.env,
      DATABASE_URL: pg.getConnectionUri(),
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
    },
    stdio: 'inherit',
  });

  app = await buildApp();
  await app.init();
});

afterAll(async () => {
  await app?.close();
  await pg?.stop();
});

describe('admin e2e', () => {
  let admin: ReturnType<typeof request.agent>;
  let regularUser: ReturnType<typeof request.agent>;
  let regularUserId: string;
  let adminId: string;
  let regularUserRefreshCookie: string;

  beforeAll(async () => {
    // Login as seeded admin
    admin = request.agent(app.getHttpServer());
    await admin
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);

    // Get admin's own id from /auth/me
    const meRes = await admin.get('/api/v1/auth/me').expect(200);
    adminId = meRes.body.id;

    // Register a regular user — capture the refresh cookie
    const regRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'regular@admin.test', name: 'Regular User', password: 'hunter22!' })
      .expect(201);

    regularUserId = regRes.body.user.id;

    const setCookies = regRes.headers['set-cookie'] as unknown as string[];
    regularUserRefreshCookie = setCookies.find((c) => c.startsWith('refresh_token='))!;
    if (!regularUserRefreshCookie) throw new Error('no refresh_token cookie for regular user');

    // Build an authenticated agent for the regular user
    regularUser = request.agent(app.getHttpServer());
    await regularUser
      .post('/api/v1/auth/login')
      .send({ email: 'regular@admin.test', password: 'hunter22!' })
      .expect(200);
  });

  it('admin GET /admin/users → 200, contains both admin + new user (total ≥ 2)', async () => {
    const res = await admin.get('/api/v1/admin/users').expect(200);
    expect(res.body.items).toEqual(expect.any(Array));
    expect(res.body.total).toBeGreaterThanOrEqual(2);

    const emails = res.body.items.map((u: any) => u.email);
    expect(emails).toContain(ADMIN_EMAIL);
    expect(emails).toContain('regular@admin.test');
  });

  it('non-admin GET /admin/users → 403', async () => {
    await regularUser.get('/api/v1/admin/users').expect(403);
  });

  it('admin PATCH /admin/users/:id/role → 200, role flipped to ADMIN', async () => {
    const res = await admin
      .patch(`/api/v1/admin/users/${regularUserId}/role`)
      .send({ role: 'ADMIN' })
      .expect(200);
    expect(res.body.role).toBe('ADMIN');
  });

  it('promoted user\'s old refresh cookie is invalidated → 401 REFRESH_INVALID', async () => {
    const replay = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', regularUserRefreshCookie)
      .expect(401);
    expect(replay.body.code).toBe('REFRESH_INVALID');
  });

  it('admin POST /admin/users/bulk-delete with own id → 403 SELF_DELETION_FORBIDDEN', async () => {
    const res = await admin
      .post('/api/v1/admin/users/bulk-delete')
      .send({ ids: [adminId] })
      .expect(403);
    expect(res.body.code).toBe('SELF_DELETION_FORBIDDEN');
  });

  it('admin GET /admin/users/export.csv → 200, content-type starts with text/csv, first non-BOM line is CSV header', async () => {
    const res = await admin.get('/api/v1/admin/users/export.csv').expect(200);

    const contentType: string = res.headers['content-type'] ?? '';
    expect(contentType.toLowerCase()).toContain('text/csv');

    const body: string = res.text;
    // Strip BOM if present
    const stripped = body.startsWith('﻿') ? body.slice(1) : body;
    const firstLine = stripped.split('\n')[0];
    expect(firstLine).toBe('id,name,email,role,createdAt');
  });
});
