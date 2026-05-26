import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable CORS for all origins (useful in development/Flutter)
  app.enableCors();

  // 2. Set global prefix to /api
  app.setGlobalPrefix('api');

  // 3. Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip non-whitelisted properties from DTOs
      transform: true, // auto-transform payload types to match DTOs
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
