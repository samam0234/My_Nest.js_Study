import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message } = this.resolveError(exception);

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
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      return { statusCode: status, message };
    }

    // Prisma가 던지는 잘 알려진 에러 코드를 의미 있는 HTTP 상태로 변환
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return { statusCode: HttpStatus.NOT_FOUND, message: '요청한 데이터를 찾을 수 없습니다.' };
      }
      if (exception.code === 'P2002') {
        return { statusCode: HttpStatus.CONFLICT, message: '이미 존재하는 값입니다.' };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '서버 내부 오류가 발생했습니다.',
    };
  }
}
