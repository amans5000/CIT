import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const configService = app.get(ConfigService);
  const logger = app.get(Logger);
  app.useLogger(logger);

  // 1. HTTP Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: false,
    }),
  );

  // 2. Cookie Parser
  const cookieSecret = configService.get<string>('COOKIE_SECRET');
  app.use(cookieParser(cookieSecret));

  // 3. CORS Configuration
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ].filter(Boolean);

  app.enableCors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!requestOrigin) {
        return callback(null, true);
      }
      if (
        allowedOrigins.includes(requestOrigin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${requestOrigin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-csrf-token',
      'X-CSRF-Token',
      'cit_csrf',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  // 4. API Prefix & Versioning
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 5. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 6. Global Filters and Interceptors
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // 7. OpenAPI / Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('CIT Online Assessment Platform API')
    .setDescription('Production-grade REST API for the Cognitive Intelligence Test assessment engine.')
    .setVersion('1.0.0')
    .addCookieAuth('cit_session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'cit_session',
      description: 'Session cookie issued upon authentication',
    })
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('PORT', 4000);
  await app.listen(port);
  logger.log(`CIT API is running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger API documentation available at http://localhost:${port}/api/docs`);
}

void bootstrap();
