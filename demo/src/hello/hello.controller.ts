import { Controller, Get, Param, Query } from '@nestjs/common';
import { HelloService } from './hello.service.js';

@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  // GET /hello
  @Get()
  hello(): string {
    return this.helloService.sayHello('NestJS');
  }

  // GET /hello/name?name=철수  (쿼리 파라미터, 기본값 World)
  @Get('name')
  helloByQuery(@Query('name') name: string = 'World'): string {
    return this.helloService.sayHello(name);
  }

  // GET /hello/영희  (경로 변수)
  @Get(':name')
  helloByPath(@Param('name') name: string): string {
    return this.helloService.sayHello(name);
  }
}
