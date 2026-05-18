import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { appCreate } from './app.create';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const host = '0.0.0.0';
  const port = config.get<number>('PORT') || 3010;

  appCreate(app);
  await app.listen(port, host, () => {
    console.log(
      `${config.get('APP_NAME')} is running on http://${host}:${port}`,
    );
  });
}
bootstrap();
