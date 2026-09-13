import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
}

// @Catch() 인자 없이 쓰면 HttpException뿐 아니라 예상치 못한 에러(Error 등)까지 전부 잡는다
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message } = this.resolveError(exception);

    // 500번대는 서버 로그에 스택트레이스를 남기되, 클라이언트에는 원인을 노출하지 않는다
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(statusCode).json({
      error: { statusCode, message },
      timestamp: new Date().toISOString(),
    });
  }

  private resolveError(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // ValidationPipe가 던지는 예외는 body가 { message: string[], error, statusCode } 형태 객체
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      return { statusCode: status, message };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '서버 내부 오류가 발생했습니다.',
    };
  }
}
