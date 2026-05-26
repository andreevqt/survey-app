import { Injectable, NotFoundException } from '@nestjs/common';
import { QuestionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OwnerAnalyticsDto } from './dto/owner-analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnerAnalytics(ownerId: string, pollId: string): Promise<OwnerAnalyticsDto> {
    const poll = await this.prisma.poll.findFirst({
      where: { id: pollId, ownerId },
      include: {
        questions: {
          include: {
            options: { orderBy: { order: 'asc' } },
            _count: { select: { answers: true } },
          },
          orderBy: { order: 'asc' },
        },
        _count: { select: { responses: true } },
      },
    });
    if (!poll) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });

    const optionIds = poll.questions.flatMap((q: any) => q.options.map((o: any) => o.id));
    const optionCounts = optionIds.length
      ? await this.prisma.answerOption.groupBy({
          by: ['optionId'],
          where: { optionId: { in: optionIds } },
          _count: { optionId: true },
        })
      : [];
    const countByOption = new Map<string, number>();
    for (const row of optionCounts as any[]) {
      countByOption.set(row.optionId, row._count.optionId);
    }

    return {
      pollId: poll.id,
      title: poll.title,
      totalResponses: (poll as any)._count.responses,
      questions: poll.questions.map((q: any) => ({
        questionId: q.id,
        text: q.text,
        order: q.order,
        type: q.type,
        answerCount: q._count.answers,
        options: q.options.map((o: any) => ({
          optionId: o.id,
          text: o.text,
          order: o.order,
          count: countByOption.get(o.id) ?? 0,
        })),
        ...(q.type === QuestionType.TEXT ? { textAnswerCount: q._count.answers } : {}),
      })),
    };
  }
}
