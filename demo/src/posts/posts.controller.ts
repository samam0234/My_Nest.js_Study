import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch,
  Post as HttpPost,
} from '@nestjs/common';
import { PostsService } from './posts.service.js';
import type { Post } from './post.entity.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(): Promise<Post[]> {
    return this.postsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Post> {
    return this.postsService.findOne(id);
  }

  @HttpPost()
  create(@Body() dto: CreatePostDto): Promise<Post> {
    return this.postsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ): Promise<Post> {
    return this.postsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.postsService.remove(id);
  }
}
