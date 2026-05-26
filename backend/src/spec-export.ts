import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  // Intentionally NOT calling setGlobalPrefix — the frontend client adds /api/v1 via baseUrl,
  // so paths in openapi.json should be unprefixed (`/auth/login`, not `/api/v1/auth/login`).
  const config = new DocumentBuilder()
    .setTitle('Survey App API')
    .setVersion('0.1.0')
    .addCookieAuth('access_token')
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  const out = resolve(__dirname, '../../openapi.json');
  writeFileSync(out, JSON.stringify(doc, null, 2));
  console.log(`Wrote ${out}`);
  await app.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
