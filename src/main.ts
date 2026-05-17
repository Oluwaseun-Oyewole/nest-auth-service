import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { appCreate } from './app.create';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  appCreate(app);
  await app.listen(config.get('PORT'), () => {
    console.log(
      `${config.get('APP_NAME')} is running on http://localhost:${config.get('PORT')}`,
    );
  });
}
bootstrap();
