import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SlugService } from './slug.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { UpdatePollDto } from './dto/update-poll.dto';

@Injectable()
export class PollsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slug: SlugService,
  ) {}

  async create(ownerId: string, dto: CreatePollDto) {
    this.validateQuestions(dto.questions);
    const slug = await this.slug.generate();
    return this.prisma.poll.create({
      data: {
        slug,
        ownerId,
        title: dto.title,
        description: dto.description ?? null,
        visibility: dto.visibility,
        isActive: dto.isActive,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        questions: {
          create: dto.questions.map((q, qi) => ({
            order: qi,
            type: q.type,
            text: q.text,
            isRequired: q.isRequired,
            ...(q.type === QuestionType.TEXT
              ? {}
              : {
                  options: {
                    create: (q.options ?? []).map((o, oi) => ({ order: oi, text: o.text })),
                  },
                }),
          })),
        },
      },
      include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
    });
  }

  async findMine(ownerId: string, q: { page: number; pageSize: number }) {
    const skip = (q.page - 1) * q.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.poll.findMany({
        where: { ownerId },
        orderBy: { createdAt: 'desc' },
        skip, take: q.pageSize,
        select: {
          id: true, slug: true, title: true, description: true,
          visibility: true, isActive: true, expiresAt: true,
          createdAt: true, _count: { select: { responses: true } },
        },
      }),
      this.prisma.poll.count({ where: { ownerId } }),
    ]);
    return {
      items: rows.map((r) => this.toSummary(r)),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  async listAll(q: { page: number; pageSize: number }) {
    const skip = (q.page - 1) * q.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.poll.findMany({
        orderBy: { createdAt: 'desc' },
        skip, take: q.pageSize,
        select: {
          id: true, slug: true, title: true, description: true,
          visibility: true, isActive: true, expiresAt: true,
          createdAt: true, _count: { select: { responses: true } },
        },
      }),
      this.prisma.poll.count(),
    ]);
    return {
      items: rows.map((r) => this.toSummary(r)),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }

  async findOne(ownerId: string, id: string) {
    const p = await this.prisma.poll.findFirst({
      where: { id, ownerId },
      include: {
        questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    });
    if (!p) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
    return this.toDetail(p);
  }

  async update(ownerId: string, id: string, dto: UpdatePollDto) {
    const existing = await this.prisma.poll.findFirst({
      where: { id, ownerId },
      include: {
        questions: { include: { options: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    });
    if (!existing) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });

    const hasResponses = existing._count.responses > 0;

    if (hasResponses) {
      if (this.structuralDiff(existing, dto)) {
        throw new ConflictException({
          code: 'POLL_LOCKED_HAS_RESPONSES',
          message: 'POLL_LOCKED_HAS_RESPONSES: Questions and options cannot change after a poll has responses',
        });
      }
      // metadata-only update
      await this.prisma.poll.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description ?? null,
          visibility: dto.visibility,
          isActive: dto.isActive,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        },
      });
    } else {
      // full rewrite — delete questions (cascades to options), recreate from dto
      this.validateQuestions(dto.questions);
      await this.prisma.$transaction([
        this.prisma.question.deleteMany({ where: { pollId: id } }),
        this.prisma.poll.update({
          where: { id },
          data: {
            title: dto.title,
            description: dto.description ?? null,
            visibility: dto.visibility,
            isActive: dto.isActive,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            questions: {
              create: dto.questions.map((q, qi) => ({
                order: qi, type: q.type, text: q.text, isRequired: q.isRequired,
                ...(q.type === QuestionType.TEXT ? {} : {
                  options: { create: (q.options ?? []).map((o, oi) => ({ order: oi, text: o.text })) },
                }),
              })),
            },
          },
        }),
      ]);
    }
    return this.findOne(ownerId, id);
  }

  async delete(ownerId: string, id: string) {
    const exists = await this.prisma.poll.findFirst({
      where: { id, ownerId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });

    // Ordered cleanup so the Restrict FKs on Answer→Question and AnswerOption→Option
    // are satisfied. Poll's own cascade can't be relied on because Postgres may evaluate
    // Question deletion before the Response→Answer cascade has drained the references.
    await this.prisma.$transaction([
      this.prisma.answerOption.deleteMany({ where: { answer: { response: { pollId: id } } } }),
      this.prisma.answer.deleteMany({ where: { response: { pollId: id } } }),
      this.prisma.response.deleteMany({ where: { pollId: id } }),
      this.prisma.option.deleteMany({ where: { question: { pollId: id } } }),
      this.prisma.question.deleteMany({ where: { pollId: id } }),
      this.prisma.poll.delete({ where: { id } }),
    ]);
  }

  async toggleActive(ownerId: string, id: string, isActive: boolean) {
    const r = await this.prisma.poll.updateMany({
      where: { id, ownerId },
      data: { isActive },
    });
    if (r.count === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
  }

  private structuralDiff(existing: any, dto: UpdatePollDto): boolean {
    if (existing.questions.length !== dto.questions.length) return true;
    for (let i = 0; i < existing.questions.length; i++) {
      const a = existing.questions[i];
      const b = dto.questions[i];
      if (a.type !== b.type) return true;
      if (a.text !== b.text) return true;
      if (a.isRequired !== b.isRequired) return true;
      const aOpts = a.options ?? [];
      const bOpts = b.options ?? [];
      if (aOpts.length !== bOpts.length) return true;
      for (let j = 0; j < aOpts.length; j++) {
        if (aOpts[j].text !== bOpts[j].text) return true;
      }
    }
    return false;
  }

  private toSummary(r: any) {
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      description: r.description ?? undefined,
      visibility: r.visibility,
      isActive: r.isActive,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : undefined,
      createdAt: r.createdAt.toISOString(),
      responseCount: r._count.responses,
    };
  }

  private toDetail(r: any) {
    return {
      ...this.toSummary(r),
      questions: r.questions.map((q: any) => ({
        id: q.id, order: q.order, type: q.type, text: q.text, isRequired: q.isRequired,
        options: q.options.map((o: any) => ({ id: o.id, order: o.order, text: o.text })),
      })),
    };
  }

  private validateQuestions(qs: CreatePollDto['questions']) {
    for (const q of qs) {
      if (q.type === QuestionType.TEXT) continue;
      const opts = q.options ?? [];
      if (opts.length < 2) {
        throw new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: `Question "${q.text}" requires at least 2 options`,
        });
      }
    }
  }
}
