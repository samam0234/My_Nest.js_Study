import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // User.password는 어떤 쿼리(find/create/update 포함)에서도 기본적으로 결과에서 제외된다.
      // TypeORM의 @Column({select:false})와 달리, save()에 해당하는 create/update 반환값에도 동일하게 적용된다.
      omit: {
        user: { password: true },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
