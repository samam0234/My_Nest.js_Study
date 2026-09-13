import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HelloModule } from './hello/hello.module.js';
import { PostsModule } from './posts/posts.module.js';
import { Post } from './posts/post.entity.js';
import { UsersModule } from './users/users.module.js';
import { User } from './users/user.entity.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // .env를 읽어 전역 ConfigService로 노출
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'better-sqlite3',
        database: configService.get<string>('DB_PATH', 'data.sqlite'),
        entities: [Post, User],
        synchronize: true, // 개발 단계에서만 사용: 엔티티 변경사항을 자동으로 테이블에 반영
      }),
    }),
    HelloModule,
    PostsModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
