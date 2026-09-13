import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;
    const start = Date.now();

    // next.handle()을 구독하기 전(=핸들러 실행 전)에 할 일은 여기, 응답 이후 할 일은 pipe 안에 작성
    return next.handle().pipe(
      tap(() => {
        const elapsedMs = Date.now() - start;
        this.logger.log(`${method} ${originalUrl} - ${elapsedMs}ms`);
      }),
    );
  }
}
