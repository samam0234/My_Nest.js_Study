import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HelloModule } from './hello/hello.module.js';
import { PostsModule } from './posts/posts.module.js';
import { Post } from './posts/post.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data.sqlite',
      entities: [Post],
      synchronize: true, // 개발 단계에서만 사용: 엔티티 변경사항을 자동으로 테이블에 반영
    }),
    HelloModule,
    PostsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
