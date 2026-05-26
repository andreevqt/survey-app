import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: { page: number; pageSize: number }) {
    const skip = (q.page - 1) * q.pageSize;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip, take: q.pageSize,
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      this.prisma.user.count(),
    ]);
    return {
      items: (rows as Array<{ id: string; email: string; name: string; role: Role; createdAt: Date }>).map(
        (u) => ({ ...u, createdAt: u.createdAt.toISOString() }),
      ),
      total: total as number,
      page: q.page,
      pageSize: q.pageSize,
    };
  }
}
