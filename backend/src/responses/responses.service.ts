import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma, QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(slug: string) {
    const poll = await this.prisma.poll.findUnique({
      where: { slug },
      include: {
        questions: {
          include: { options: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
    const closed = !poll.isActive || (!!poll.expiresAt && poll.expiresAt.getTime() < Date.now());
    return {
      id: poll.id,
      title: poll.title,
      description: poll.description ?? undefined,
      expiresAt: poll.expiresAt ? poll.expiresAt.toISOString() : undefined,
      closed,
      questions: poll.questions.map((q) => ({
        id: q.id, order: q.order, type: q.type, text: q.text, isRequired: q.isRequired,
        options: q.options.map((o) => ({ id: o.id, order: o.order, text: o.text })),
      })),
    };
  }

  async submit(args: {
    slug: string;
    respondentCookie: string;
    answers: { questionId: string; optionIds?: string[]; textValue?: string }[];
  }): Promise<{ submittedAt: string }> {
    const poll = await this.prisma.poll.findUnique({
      where: { slug: args.slug },
      include: { questions: { include: { options: true } } },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Poll not found' });
    const closed = !poll.isActive || (!!poll.expiresAt && poll.expiresAt.getTime() < Date.now());
    if (closed) throw new ForbiddenException({ code: 'POLL_CLOSED', message: 'POLL_CLOSED: This poll is closed' });

    this.validateAnswers(poll, args.answers);

    try {
      const created = await this.prisma.response.create({
        data: {
          pollId: poll.id,
          respondentCookie: args.respondentCookie,
          answers: {
            create: args.answers.map((a) => {
              const q = poll.questions.find((q) => q.id === a.questionId)!;
              const isText = q.type === QuestionType.TEXT;
              return {
                questionId: a.questionId,
                textValue: isText ? (a.textValue ?? null) : null,
                ...(isText
                  ? {}
                  : {
                      selectedOptions: {
                        create: (a.optionIds ?? []).map((optionId) => ({ optionId })),
                      },
                    }),
              };
            }),
          },
        },
      });
      return { submittedAt: (created as any).createdAt.toISOString() };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({ code: 'ALREADY_RESPONDED', message: 'ALREADY_RESPONDED: You have already answered this poll' });
      }
      throw e;
    }
  }

  private validateAnswers(
    poll: any,
    answers: { questionId: string; optionIds?: string[]; textValue?: string }[],
  ) {
    const byQ = new Map(poll.questions.map((q: any) => [q.id, q]));
    const answered = new Map(answers.map((a) => [a.questionId, a]));

    // Required questions must be answered.
    for (const q of poll.questions) {
      if (q.isRequired && !answered.has(q.id)) {
        this.fail(`VALIDATION_FAILED: Question "${q.text}" is required`);
      }
    }

    for (const a of answers) {
      const q: any = byQ.get(a.questionId);
      if (!q) this.fail(`VALIDATION_FAILED: Unknown questionId: ${a.questionId}`);

      if (q.type === QuestionType.TEXT) {
        if (q.isRequired && !(a.textValue ?? '').trim()) {
          this.fail(`VALIDATION_FAILED: Question "${q.text}" requires a text answer`);
        }
        continue;
      }

      const ids = a.optionIds ?? [];
      const allOwned = ids.every((id: string) => q.options.some((o: any) => o.id === id));
      if (!allOwned) this.fail(`VALIDATION_FAILED: Option does not belong to question "${q.text}"`);

      if (q.type === QuestionType.SINGLE_CHOICE) {
        if (ids.length !== 1) this.fail(`VALIDATION_FAILED: Question "${q.text}" needs exactly one option`);
      } else if (q.type === QuestionType.MULTIPLE_CHOICE) {
        if (ids.length < 1) this.fail(`VALIDATION_FAILED: Question "${q.text}" needs at least one option`);
      }
    }
  }

  private fail(msg: string): never {
    throw new BadRequestException({ code: 'VALIDATION_FAILED', message: msg });
  }
}
