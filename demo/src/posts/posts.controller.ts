import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post as HttpPost,
} from '@nestjs/common';
import { PostsService } from './posts.service.js';
import type { Post } from './post.interface.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(): Post[] {
    return this.postsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Post {
    return this.postsService.findOne(id);
  }

  @HttpPost()
  create(@Body() body: { title: string; content: string }): Post {
    return this.postsService.create(body.title, body.content);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; content?: string },
  ): Post {
    return this.postsService.update(id, body.title, body.content);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): void {
    this.postsService.remove(id);
  }
}
