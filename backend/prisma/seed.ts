import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

async function main() {
  const prisma = new PrismaClient();
  const email = (process.env.ADMIN_EMAIL ?? 'admin@polls.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? 'admin';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Seed: admin ${email} already exists; skipping.`);
    await prisma.$disconnect();
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { email, name: 'Admin', passwordHash, role: Role.ADMIN },
  });
  console.log(`Seed: created admin ${email}.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
