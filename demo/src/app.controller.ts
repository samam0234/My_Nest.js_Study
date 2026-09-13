import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // AllExceptionsFilter의 500 처리 경로를 확인하기 위한 실습용 라우트 (study8)
  @Get('boom')
  boom(): never {
    throw new Error('의도적으로 발생시킨 예상치 못한 에러');
  }
}
