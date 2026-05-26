import { BadRequestException, Injectable } from '@nestjs/common';
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
