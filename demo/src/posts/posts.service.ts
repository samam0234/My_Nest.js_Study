import { Injectable, NotFoundException } from '@nestjs/common';
import { Post } from './post.interface.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

@Injectable()
export class PostsService {
  private posts: Post[] = [];
  private nextId = 1;

  findAll(): Post[] {
    return this.posts;
  }

  findOne(id: number): Post {
    const post = this.posts.find((p) => p.id === id);
    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }
    return post;
  }

  create(dto: CreatePostDto): Post {
    const post: Post = {
      id: this.nextId++,
      title: dto.title,
      content: dto.content,
      createdAt: new Date(),
    };
    this.posts.push(post);
    return post;
  }

  update(id: number, dto: UpdatePostDto): Post {
    const post = this.findOne(id);
    if (dto.title !== undefined) post.title = dto.title;
    if (dto.content !== undefined) post.content = dto.content;
    return post;
  }

  remove(id: number): void {
    const index = this.posts.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Post #${id} not found`);
    }
    this.posts.splice(index, 1);
  }
}
