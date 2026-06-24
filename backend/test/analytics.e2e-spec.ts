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

describe('analytics e2e', () => {
  let owner: ReturnType<typeof request.agent>;
  let secondUser: ReturnType<typeof request.agent>;
  let pollId: string;
  let pollSlug: string;
  let singleChoiceQuestionId: string;
  let option1Id: string;
  let textQuestionId: string;

  beforeAll(async () => {
    // Register owner
    owner = request.agent(app.getHttpServer());
    await owner
      .post('/api/v1/auth/register')
      .send({ email: 'analytics-owner@polls.test', name: 'Analytics Owner', password: 'hunter22!' })
      .expect(201);

    // Register second user
    secondUser = request.agent(app.getHttpServer());
    await secondUser
      .post('/api/v1/auth/register')
      .send({ email: 'analytics-other@polls.test', name: 'Other User', password: 'hunter22!' })
      .expect(201);

    // Owner creates a poll with SINGLE_CHOICE (2 options) + TEXT question
    const pollRes = await owner
      .post('/api/v1/polls')
      .send({
        title: 'Analytics Test Poll',
        visibility: 'PUBLIC',
        isActive: true,
        questions: [
          {
            type: 'SINGLE_CHOICE',
            text: 'Choose one',
            isRequired: true,
            options: [{ text: 'Option A' }, { text: 'Option B' }],
          },
          {
            type: 'TEXT',
            text: 'Tell us more',
            isRequired: false,
            options: [],
          },
        ],
      })
      .expect(201);

    pollId = pollRes.body.id;
    pollSlug = pollRes.body.slug;

    const scQuestion = pollRes.body.questions.find((q: any) => q.type === 'SINGLE_CHOICE');
    const textQuestion = pollRes.body.questions.find((q: any) => q.type === 'TEXT');

    singleChoiceQuestionId = scQuestion.id;
    option1Id = scQuestion.options[0].id;
    textQuestionId = textQuestion.id;

    // Anonymous user submits a response
    const anonAgent = request.agent(app.getHttpServer());
    await anonAgent
      .post(`/api/v1/public/polls/${pollSlug}/responses`)
      .send({
        answers: [
          { questionId: singleChoiceQuestionId, optionIds: [option1Id] },
          { questionId: textQuestionId, textValue: 'Great poll!' },
        ],
      })
      .expect(201);
  });

  it('owner GET /polls/:id/analytics → 200, totalResponses=1, option counts add up, TEXT textAnswerCount=1', async () => {
    const res = await owner.get(`/api/v1/polls/${pollId}/analytics`).expect(200);

    expect(res.body.pollId).toBe(pollId);
    expect(res.body.totalResponses).toBe(1);

    const scQ = res.body.questions.find((q: any) => q.type === 'SINGLE_CHOICE');
    expect(scQ).toBeDefined();
    const totalOptionCounts = scQ.options.reduce((sum: number, o: any) => sum + o.count, 0);
    expect(totalOptionCounts).toBe(1);

    const textQ = res.body.questions.find((q: any) => q.type === 'TEXT');
    expect(textQ).toBeDefined();
    expect(textQ.textAnswerCount).toBe(1);
  });

  it('second user GET /polls/:id/analytics → 404 (owner-scoped)', async () => {
    await secondUser.get(`/api/v1/polls/${pollId}/analytics`).expect(404);
  });
});
