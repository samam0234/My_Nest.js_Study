import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // 실행 순서: 요청 → LoggingInterceptor(전) → 핸들러 → TransformInterceptor → LoggingInterceptor(후, 로그 출력)
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
