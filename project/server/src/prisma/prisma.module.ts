import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// @Global()로 등록해두면 각 feature 모듈이 매번 imports 하지 않아도 PrismaService를 주입받을 수 있다.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
