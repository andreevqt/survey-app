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
}
