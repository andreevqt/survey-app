import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';
import { PrismaService } from '../prisma/prisma.service';

const MAX_ATTEMPTS = 8;

@Injectable()
export class SlugService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(): Promise<string> {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const slug = nanoid(10);
      const existing = await this.prisma.poll.findUnique({ where: { slug } });
      if (!existing) return slug;
    }
    throw new Error(`Could not allocate a unique slug after ${MAX_ATTEMPTS} attempts`);
  }
}
