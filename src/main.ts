import { NestFactory } from '@nestjs/core';
import { appCreate } from './app.create';
import { AppModule } from './app.module';
import { appConfig } from './shared/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  appCreate(app);
  const config = appConfig();
  await app.listen(config.port, () => {
    console.log(
      `${config.appName} is running on http://localhost:${config.port}`,
    );
  });
}
bootstrap();
