import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HelloModule } from './hello/hello.module.js';
import { PostsModule } from './posts/posts.module.js';

@Module({
  imports: [HelloModule, PostsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
