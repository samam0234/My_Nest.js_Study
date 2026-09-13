import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 없는 필드는 자동으로 제거
      forbidNonWhitelisted: true, // DTO에 없는 필드가 오면 400 에러로 거부
      transform: true, // 요청 값(문자열 등)을 DTO에 선언된 타입으로 변환
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
