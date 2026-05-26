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

  async changeRole(args: { adminId: string; userId: string; role: Role }) {
    if (args.adminId === args.userId && args.role !== Role.ADMIN) {
      throw new BadRequestException({
        code: 'SELF_DEMOTION_FORBIDDEN',
        message: 'Forbidden: you cannot demote yourself',
      });
    }
    try {
      const [updated] = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: args.userId },
          data: { role: args.role },
          select: { id: true, email: true, name: true, role: true, createdAt: true },
        }),
        this.prisma.refreshToken.deleteMany({ where: { userId: args.userId } }),
      ]);
      return { ...updated, createdAt: (updated as any).createdAt.toISOString() };
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
      }
      throw e;
    }
  }
}
