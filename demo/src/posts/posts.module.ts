import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';
import { Post } from './post.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
