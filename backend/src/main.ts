import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export async function buildApp() {
  const app = await NestFactory.create(AppModule, { cors: false });
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  // FRONTEND_ORIGIN may be a comma-separated list. Vercel PR previews are
  // served from pr-<n>.survey.andreevxdr.ru, so allow those too. The cors lib
  // reflects the matched origin (required for credentialed requests — a literal
  // "*" would be rejected by the browser when credentials: true).
  const allowedOrigins: (string | RegExp)[] = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  allowedOrigins.push(/^https:\/\/pr-\d+\.survey\.andreevxdr\.ru$/);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Survey App API')
    .setVersion('0.1.0')
    .addCookieAuth('access_token')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' });

  return app;
}

async function bootstrap() {
  const app = await buildApp();
  await app.listen(Number(process.env.PORT ?? 3000));
}

if (require.main === module) {
  bootstrap();
}
