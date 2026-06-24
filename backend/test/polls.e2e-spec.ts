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
  process.env.SKIP_EMAIL_VERIFICATION = 'true';

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

describe('polls e2e', () => {
  let owner: ReturnType<typeof request.agent>;
  let pollId: string;
  let pollSlug: string;

  const validPollBody = {
    title: 'Favourite colour?',
    description: 'A fun poll',
    visibility: 'PUBLIC',
    isActive: true,
    questions: [
      {
        type: 'SINGLE_CHOICE',
        text: 'Pick your colour',
        isRequired: true,
        options: [{ text: 'Red' }, { text: 'Blue' }],
      },
    ],
  };

  it('register and login owner', async () => {
    owner = request.agent(app.getHttpServer());
    await owner
      .post('/api/v1/auth/register')
      .send({ email: 'owner@polls.test', name: 'Owner', password: 'hunter22!' })
      .expect(201);
  });

  it('POST /polls valid → 201 with id and slug', async () => {
    const res = await owner.post('/api/v1/polls').send(validPollBody).expect(201);
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.slug).toEqual(expect.any(String));
    pollId = res.body.id;
    pollSlug = res.body.slug;
  });

  it('GET /polls → contains the new poll with responseCount=0', async () => {
    const res = await owner.get('/api/v1/polls').expect(200);
    expect(res.body.items).toEqual(expect.any(Array));
    const found = res.body.items.find((p: any) => p.id === pollId);
    expect(found).toBeDefined();
    expect(found.responseCount).toBe(0);
  });

  it('GET /polls/:id → full structure with questions', async () => {
    const res = await owner.get(`/api/v1/polls/${pollId}`).expect(200);
    expect(res.body.id).toBe(pollId);
    expect(res.body.slug).toBe(pollSlug);
    expect(res.body.questions).toEqual(expect.any(Array));
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].options).toHaveLength(2);
  });

  it('PATCH /polls/:id with metadata change → 200', async () => {
    const res = await owner
      .patch(`/api/v1/polls/${pollId}`)
      .send({ ...validPollBody, title: 'Updated title' })
      .expect(200);
    expect(res.body.title).toBe('Updated title');
  });

  it('POST /public/polls/:slug/responses as anonymous agent → 201', async () => {
    const publicRes = await owner.get(`/api/v1/polls/${pollId}`).expect(200);
    const questionId = publicRes.body.questions[0].id;
    const optionId = publicRes.body.questions[0].options[0].id;

    const anonAgent = request.agent(app.getHttpServer());
    const res = await anonAgent
      .post(`/api/v1/public/polls/${pollSlug}/responses`)
      .send({
        answers: [{ questionId, optionIds: [optionId] }],
      })
      .expect(201);
    expect(res.body.submittedAt).toEqual(expect.any(String));
  });

  it('PATCH /polls/:id with structural change after response exists → 409 POLL_LOCKED_HAS_RESPONSES', async () => {
    const res = await owner
      .patch(`/api/v1/polls/${pollId}`)
      .send({
        ...validPollBody,
        questions: [
          {
            type: 'SINGLE_CHOICE',
            text: 'A completely different question',
            isRequired: true,
            options: [{ text: 'Yes' }, { text: 'No' }],
          },
        ],
      })
      .expect(409);
    expect(res.body.code).toBe('POLL_LOCKED_HAS_RESPONSES');
  });

  it('PATCH /polls/:id/active → flips isActive', async () => {
    const res = await owner
      .patch(`/api/v1/polls/${pollId}/active`)
      .send({ isActive: false })
      .expect(200);
    expect(res.body.isActive).toBe(false);

    const res2 = await owner
      .patch(`/api/v1/polls/${pollId}/active`)
      .send({ isActive: true })
      .expect(200);
    expect(res2.body.isActive).toBe(true);
  });

  it('DELETE /polls/:id → 204; GET /polls/:id afterwards → 404', async () => {
    await owner.delete(`/api/v1/polls/${pollId}`).expect(204);
    const res = await owner.get(`/api/v1/polls/${pollId}`).expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
