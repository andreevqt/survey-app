import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
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

  async create(args: { name: string; email: string; password: string; role: Role }) {
    const passwordHash = await bcrypt.hash(args.password, 10);
    try {
      const created = await this.prisma.user.create({
        data: { name: args.name, email: args.email, passwordHash, role: args.role },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      });
      return { ...created, createdAt: created.createdAt.toISOString() };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
      }
      throw e;
    }
  }

  async update(args: {
    adminId: string;
    userId: string;
    dto: { name?: string; email?: string; password?: string; role?: Role };
  }) {
    const target = await this.prisma.user.findUnique({
      where: { id: args.userId },
      select: { role: true },
    });
    if (!target) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
    }

    const roleChanged = args.dto.role !== undefined && args.dto.role !== target.role;

    if (roleChanged && args.dto.role !== Role.ADMIN) {
      if (args.adminId === args.userId) {
        throw new BadRequestException({
          code: 'SELF_DEMOTION_FORBIDDEN',
          message: 'Forbidden: you cannot demote yourself',
        });
      }
      await this.assertNotRemovingLastAdmins([args.userId]);
    }

    const data: {
      name?: string;
      email?: string;
      role?: Role;
      passwordHash?: string;
    } = {};
    if (args.dto.name !== undefined) data.name = args.dto.name;
    if (args.dto.email !== undefined) data.email = args.dto.email;
    if (args.dto.role !== undefined) data.role = args.dto.role;
    if (args.dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(args.dto.password, 10);
    }

    const revokeTokens = roleChanged || args.dto.password !== undefined;

    try {
      const ops: any[] = [
        this.prisma.user.update({
          where: { id: args.userId },
          data,
          select: { id: true, email: true, name: true, role: true, createdAt: true },
        }),
      ];
      if (revokeTokens) {
        ops.push(this.prisma.refreshToken.deleteMany({ where: { userId: args.userId } }));
      }
      const [updated] = await this.prisma.$transaction(ops);
      return { ...updated, createdAt: (updated as any).createdAt.toISOString() };
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email is already registered' });
      }
      if (e?.code === 'P2025') {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
      }
      throw e;
    }
  }

  async bulkDelete(args: { adminId: string; ids: string[] }) {
    if (args.ids.includes(args.adminId)) {
      throw new ForbiddenException({
        code: 'SELF_DELETION_FORBIDDEN',
        message: 'Forbidden: you cannot delete yourself',
      });
    }
    await this.assertNotRemovingLastAdmins(args.ids);
    const r = await this.prisma.user.deleteMany({ where: { id: { in: args.ids } } });
    return { count: r.count };
  }

  async deleteOne(args: { adminId: string; userId: string }) {
    if (args.adminId === args.userId) {
      throw new ForbiddenException({
        code: 'SELF_DELETION_FORBIDDEN',
        message: 'Forbidden: you cannot delete yourself',
      });
    }
    await this.assertNotRemovingLastAdmins([args.userId]);
    try {
      await this.prisma.user.delete({ where: { id: args.userId } });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new NotFoundException({ code: 'NOT_FOUND', message: 'Not Found' });
      }
      throw e;
    }
  }

  private async assertNotRemovingLastAdmins(ids: string[]): Promise<void> {
    const [totalAdmins, victims] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { role: true },
      }),
    ]);
    const adminsAmongVictims = victims.filter((v) => v.role === Role.ADMIN).length;
    if (adminsAmongVictims > 0 && adminsAmongVictims >= totalAdmins) {
      throw new ForbiddenException({
        code: 'LAST_ADMIN_FORBIDDEN',
        message: 'Forbidden: cannot remove the last admin',
      });
    }
  }

  async streamCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    const escape = (v: string) => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const header = 'id,name,email,role,createdAt';
    const body = users.map((u) =>
      [u.id, u.name, u.email, u.role, u.createdAt.toISOString()].map(escape).join(','),
    ).join('\n');
    // Leading UTF-8 BOM so Excel opens the CSV with correct encoding.
    // eslint-disable-next-line no-irregular-whitespace
    return '﻿' + header + '\n' + body;
  }
}
