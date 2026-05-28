import { PrismaClient, QuestionType, Role, Visibility } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function ensureAdmin(prisma: PrismaClient): Promise<string> {
  const email = (process.env.ADMIN_EMAIL ?? 'admin@polls.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'admin';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: admin ${email} already exists; skipping user create.`);
    return existing.id;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const created = await prisma.user.create({
    data: { email, name: 'Admin', passwordHash, role: Role.ADMIN },
  });
  console.log(`Seed: created admin ${email}.`);
  return created.id;
}

interface DemoChoiceOption {
  id: string;
  text: string;
}

interface DemoChoicePoll {
  pollId: string;
  questionId: string;
  slug: string;
  title: string;
  type: typeof QuestionType.SINGLE_CHOICE | typeof QuestionType.MULTIPLE_CHOICE;
  questionText: string;
  options: DemoChoiceOption[];
  // For SINGLE_CHOICE: each entry is [optionId] for one response.
  // For MULTIPLE_CHOICE: each entry is the list of picked optionIds for one response.
  responses: string[][];
}

interface DemoTextPoll {
  pollId: string;
  questionId: string;
  slug: string;
  title: string;
  questionText: string;
  answers: string[];
}

const SINGLE_POLL: DemoChoicePoll = {
  pollId: 'demo_poll_single',
  questionId: 'demo_q_single',
  slug: 'framework-prefs',
  title: 'Which framework do you reach for first?',
  type: QuestionType.SINGLE_CHOICE,
  questionText: 'Which framework do you reach for first?',
  options: [
    { id: 'demo_opt_react', text: 'React' },
    { id: 'demo_opt_vue', text: 'Vue' },
    { id: 'demo_opt_svelte', text: 'Svelte' },
    { id: 'demo_opt_solid', text: 'Solid' },
  ],
  responses: [
    ['demo_opt_react'],
    ['demo_opt_react'],
    ['demo_opt_react'],
    ['demo_opt_react'],
    ['demo_opt_react'],
    ['demo_opt_react'],
    ['demo_opt_react'],
    ['demo_opt_vue'],
    ['demo_opt_vue'],
    ['demo_opt_svelte'],
    ['demo_opt_svelte'],
    ['demo_opt_solid'],
  ],
};

const MULTI_POLL: DemoChoicePoll = {
  pollId: 'demo_poll_multi',
  questionId: 'demo_q_multi',
  slug: 'feature-priorities',
  title: 'Which features matter most to you?',
  type: QuestionType.MULTIPLE_CHOICE,
  questionText: 'Pick the features you would actually use.',
  options: [
    { id: 'demo_opt_analytics', text: 'Analytics' },
    { id: 'demo_opt_export', text: 'CSV export' },
    { id: 'demo_opt_branding', text: 'Custom branding' },
    { id: 'demo_opt_api', text: 'API access' },
    { id: 'demo_opt_sso', text: 'SSO' },
  ],
  responses: [
    ['demo_opt_analytics', 'demo_opt_export'],
    ['demo_opt_analytics', 'demo_opt_api'],
    ['demo_opt_analytics', 'demo_opt_branding', 'demo_opt_export'],
    ['demo_opt_export'],
    ['demo_opt_analytics', 'demo_opt_export', 'demo_opt_api'],
    ['demo_opt_analytics'],
    ['demo_opt_export', 'demo_opt_branding'],
    ['demo_opt_analytics', 'demo_opt_sso'],
    ['demo_opt_analytics', 'demo_opt_export'],
    ['demo_opt_api'],
    ['demo_opt_analytics', 'demo_opt_export', 'demo_opt_sso'],
    ['demo_opt_export'],
    ['demo_opt_analytics', 'demo_opt_branding'],
    ['demo_opt_analytics', 'demo_opt_api', 'demo_opt_sso'],
  ],
};

const TEXT_POLL: DemoTextPoll = {
  pollId: 'demo_poll_text',
  questionId: 'demo_q_text',
  slug: 'service-feedback',
  title: 'What did you think of our service?',
  questionText: 'Tell us, in a sentence or two, what stood out.',
  answers: [
    'Pricing was great and the support team was super helpful',
    'The pricing page is confusing but the product works fine',
    'Love it! Easy to use and pricing is fair',
    'Hated the slow loading. Pricing seems high',
    'Pricing is reasonable, support helped me twice',
    'The export feature is amazing, saved me hours',
    'Documentation could be better, but support filled the gap',
    'Best polling tool I have tried this year',
  ],
};

const TEXT_POLL_2: DemoTextPoll = {
  pollId: 'demo_poll_text2',
  questionId: 'demo_q_text2',
  slug: 'dev-pain-points',
  title: 'What is the biggest pain point in your current workflow?',
  questionText: 'One thing you wish was easier.',
  answers: [
    'Code review takes forever, the queue is always backed up',
    'Slow tests make me dread pushing changes',
    'Onboarding new engineers is painful, docs are scattered',
    'Flaky CI pipelines waste hours every week',
    'Standup meetings are too long and add no value',
    'Deployment process is brittle, breaks half the time',
    'Documentation is outdated, can never trust the README',
    'Too many notifications, real signal gets lost',
    'Local dev environment setup is a nightmare',
    'Code review feels rushed because of deadlines',
  ],
};

async function seedChoicePoll(prisma: PrismaClient, ownerId: string, poll: DemoChoicePoll) {
  const existing = await prisma.poll.findUnique({ where: { id: poll.pollId } });
  if (existing) {
    console.log(`Seed: poll ${poll.slug} already exists; skipping.`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.poll.create({
      data: {
        id: poll.pollId,
        ownerId,
        title: poll.title,
        slug: poll.slug,
        visibility: Visibility.PUBLIC,
        isActive: true,
      },
    });
    await tx.question.create({
      data: {
        id: poll.questionId,
        pollId: poll.pollId,
        text: poll.questionText,
        type: poll.type,
        order: 0,
        isRequired: false,
        options: {
          create: poll.options.map((opt, idx) => ({
            id: opt.id,
            text: opt.text,
            order: idx,
          })),
        },
      },
    });
    for (let i = 0; i < poll.responses.length; i++) {
      const picks = poll.responses[i];
      await tx.response.create({
        data: {
          id: `${poll.pollId}_r${i + 1}`,
          pollId: poll.pollId,
          respondentCookie: `${poll.pollId}_cookie_${i + 1}`,
          answers: {
            create: [
              {
                id: `${poll.pollId}_a${i + 1}`,
                questionId: poll.questionId,
                selectedOptions: {
                  create: picks.map((optionId) => ({ optionId })),
                },
              },
            ],
          },
        },
      });
    }
  });
  console.log(`Seed: created demo poll ${poll.slug} (${poll.responses.length} responses).`);
}

async function seedTextPoll(prisma: PrismaClient, ownerId: string, poll: DemoTextPoll) {
  const existing = await prisma.poll.findUnique({ where: { id: poll.pollId } });
  if (existing) {
    console.log(`Seed: poll ${poll.slug} already exists; skipping.`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.poll.create({
      data: {
        id: poll.pollId,
        ownerId,
        title: poll.title,
        slug: poll.slug,
        visibility: Visibility.PUBLIC,
        isActive: true,
      },
    });
    await tx.question.create({
      data: {
        id: poll.questionId,
        pollId: poll.pollId,
        text: poll.questionText,
        type: QuestionType.TEXT,
        order: 0,
        isRequired: false,
      },
    });
    for (let i = 0; i < poll.answers.length; i++) {
      await tx.response.create({
        data: {
          id: `${poll.pollId}_r${i + 1}`,
          pollId: poll.pollId,
          respondentCookie: `${poll.pollId}_cookie_${i + 1}`,
          answers: {
            create: [
              {
                id: `${poll.pollId}_a${i + 1}`,
                questionId: poll.questionId,
                textValue: poll.answers[i],
              },
            ],
          },
        },
      });
    }
  });
  console.log(`Seed: created demo poll ${poll.slug} (${poll.answers.length} responses).`);
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const ownerId = await ensureAdmin(prisma);
    await seedChoicePoll(prisma, ownerId, SINGLE_POLL);
    await seedChoicePoll(prisma, ownerId, MULTI_POLL);
    await seedTextPoll(prisma, ownerId, TEXT_POLL);
    await seedTextPoll(prisma, ownerId, TEXT_POLL_2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
