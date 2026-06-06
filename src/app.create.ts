import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import * as compression from 'compression';
import { AuthLogger } from './logger/logger.service';
import { GlobalExceptionFilter } from './shared/exceptions/global.exceptions';
import { TransformResponseInterceptor } from './shared/interceptors/transform-response.interceptors';

export async function appCreate(app: INestApplication) {
  const configService = app.get(ConfigService);
  const allowedOrigins =
    configService.get<string>('ALLOWED_ORIGINS')?.split(',') || [];

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  const customOptions: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
      filter: true,
      showRequestHeaders: true,
      deepLinking: true,
    },
    customCss: '.topbar { display: none }',
  };

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('Authentication API')
    .setDescription(
      'Authentication and account lifecycle APIs for registration, login, verification, password reset, and token rotation.',
    )
    .setVersion('1.0.0')
    .addTag('Authentication', 'Authentication and account access endpoints')
    .addServer(`http://localhost:3010`, 'Local')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token in Authorization header as Bearer <token>',
        name: 'Authorization',
        in: 'header',
      },
      'access-token',
    )
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Refresh token in Authorization header as Bearer <token>',
        name: 'Authorization',
        in: 'header',
      },
      'refresh-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [],
  });

  app.useLogger(new AuthLogger());
  // app.useGlobalInterceptors(new LoggingInterceptor(new AuthLogger()));

  SwaggerModule.setup('api', app, document, customOptions);
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Blocked by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'User-Agent',
    ],
  });

  app.setGlobalPrefix('api');
  app.use(compression());
}
