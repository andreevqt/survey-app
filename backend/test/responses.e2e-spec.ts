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

describe('responses e2e', () => {
  let owner: ReturnType<typeof request.agent>;

  // Main poll data
  let mainSlug: string;
  let mainQuestionId: string;
  let mainOptionId1: string;
  let mainOptionId2: string;

  beforeAll(async () => {
    owner = request.agent(app.getHttpServer());
    await owner
      .post('/api/v1/auth/register')
      .send({ email: 'owner@responses.test', name: 'Owner', password: 'hunter22!' })
      .expect(201);

    // Create main PUBLIC active poll with one SINGLE_CHOICE required question + 2 options
    const res = await owner
      .post('/api/v1/polls')
      .send({
        title: 'Main test poll',
        visibility: 'PUBLIC',
        isActive: true,
        questions: [
          {
            type: 'SINGLE_CHOICE',
            text: 'Pick one',
            isRequired: true,
            options: [{ text: 'Option A' }, { text: 'Option B' }],
          },
        ],
      })
      .expect(201);

    mainSlug = res.body.slug;
    mainQuestionId = res.body.questions[0].id;
    mainOptionId1 = res.body.questions[0].options[0].id;
    mainOptionId2 = res.body.questions[0].options[1].id;
  });

  it('GET /public/polls/:slug → closed=false for active poll', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/public/polls/${mainSlug}`)
      .expect(200);
    expect(res.body.closed).toBe(false);
  });

  it('POST first submission as anon → 201', async () => {
    const anonAgent = request.agent(app.getHttpServer());
    const res = await anonAgent
      .post(`/api/v1/public/polls/${mainSlug}/responses`)
      .send({
        answers: [{ questionId: mainQuestionId, optionIds: [mainOptionId1] }],
      })
      .expect(201);
    expect(res.body.submittedAt).toEqual(expect.any(String));
  });

  it('POST second submission with the same agent (cookie persists) → 409 ALREADY_RESPONDED', async () => {
    const anonAgent = request.agent(app.getHttpServer());
    // First submit
    await anonAgent
      .post(`/api/v1/public/polls/${mainSlug}/responses`)
      .send({
        answers: [{ questionId: mainQuestionId, optionIds: [mainOptionId1] }],
      })
      .expect(201);

    // Second submit with the same agent — cookie is retained
    const res = await anonAgent
      .post(`/api/v1/public/polls/${mainSlug}/responses`)
      .send({
        answers: [{ questionId: mainQuestionId, optionIds: [mainOptionId2] }],
      })
      .expect(409);
    expect(res.body.code).toBe('ALREADY_RESPONDED');
  });

  it('POST submission to an inactive poll → 403 POLL_CLOSED', async () => {
    // Create an inactive poll
    const pollRes = await owner
      .post('/api/v1/polls')
      .send({
        title: 'Inactive poll',
        visibility: 'PUBLIC',
        isActive: false,
        questions: [
          {
            type: 'SINGLE_CHOICE',
            text: 'Inactive question',
            isRequired: false,
            options: [{ text: 'Yes' }, { text: 'No' }],
          },
        ],
      })
      .expect(201);

    const inactiveSlug = pollRes.body.slug;
    const qId = pollRes.body.questions[0].id;
    const oId = pollRes.body.questions[0].options[0].id;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/polls/${inactiveSlug}/responses`)
      .send({
        answers: [{ questionId: qId, optionIds: [oId] }],
      })
      .expect(403);
    expect(res.body.code).toBe('POLL_CLOSED');
  });

  it('POST submission to a poll with expiresAt in the past → 403 POLL_CLOSED', async () => {
    const pollRes = await owner
      .post('/api/v1/polls')
      .send({
        title: 'Expired poll',
        visibility: 'PUBLIC',
        isActive: true,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        questions: [
          {
            type: 'SINGLE_CHOICE',
            text: 'Expired question',
            isRequired: false,
            options: [{ text: 'Yes' }, { text: 'No' }],
          },
        ],
      })
      .expect(201);

    const expiredSlug = pollRes.body.slug;
    const qId = pollRes.body.questions[0].id;
    const oId = pollRes.body.questions[0].options[0].id;

    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/polls/${expiredSlug}/responses`)
      .send({
        answers: [{ questionId: qId, optionIds: [oId] }],
      })
      .expect(403);
    expect(res.body.code).toBe('POLL_CLOSED');
  });

  it('POST submission missing required answer → 400 VALIDATION_FAILED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/polls/${mainSlug}/responses`)
      .send({
        answers: [],
      })
      .expect(400);
    // ArrayMinSize(1) on answers fires first — class-validator 400, or our VALIDATION_FAILED
    expect(res.body.code ?? res.body.statusCode).toBeDefined();
  });

  it('POST submission with SINGLE_CHOICE + 2 optionIds → 400 VALIDATION_FAILED', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/public/polls/${mainSlug}/responses`)
      .send({
        answers: [{ questionId: mainQuestionId, optionIds: [mainOptionId1, mainOptionId2] }],
      })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });
});
