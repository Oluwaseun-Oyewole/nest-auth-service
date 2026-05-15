import {
  ClassSerializerInterceptor,
  INestApplication,
  VersioningType,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { appConfig } from './shared/config';
import { GlobalExceptionFilter } from './shared/exceptions/global.exceptions';
import { TransformResponseInterceptor } from './shared/interceptors/transform-response.interceptors';

export function appCreate(app: INestApplication) {
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
    .addServer(`http://localhost:${appConfig().port}`, 'Local')
    .addServer('https://api.example.com', 'Production')
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

  SwaggerModule.setup('api', app, document, customOptions);
  app.enableCors({
    origin: '*',
    credentials: true,
  });
}
