import { Injectable, NotFoundException } from '@nestjs/common';
import { Post } from './post.interface.js';

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

  create(title: string, content: string): Post {
    const post: Post = {
      id: this.nextId++,
      title,
      content,
      createdAt: new Date(),
    };
    this.posts.push(post);
    return post;
  }

  update(id: number, title?: string, content?: string): Post {
    const post = this.findOne(id);
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
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
