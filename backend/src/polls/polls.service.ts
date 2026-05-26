import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SlugService } from './slug.service';
import { CreatePollDto } from './dto/create-poll.dto';

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
