import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import type { PaginatedPosts } from './dto/paginated-posts.dto.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    private readonly usersService: UsersService,
  ) {}

  async findAll(page: number, limit: number): Promise<PaginatedPosts> {
    const [items, total] = await this.postsRepository.findAndCount({
      order: { id: 'ASC' },
      relations: { author: true },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: { author: true },
    });
    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }
    return post;
  }

  async create(dto: CreatePostDto, authorId: number): Promise<Post> {
    const author = await this.usersService.findEntityById(authorId);
    if (!author) {
      throw new NotFoundException(`User #${authorId} not found`);
    }
    const post = this.postsRepository.create({
      title: dto.title,
      content: dto.content,
      author,
    });
    return this.postsRepository.save(post);
  }

  async update(id: number, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    if (dto.title !== undefined) post.title = dto.title;
    if (dto.content !== undefined) post.content = dto.content;
    return this.postsRepository.save(post);
  }

  async setThumbnail(id: number, filename: string): Promise<Post> {
    const post = await this.findOne(id);
    post.thumbnailPath = filename;
    return this.postsRepository.save(post);
  }

  async remove(id: number): Promise<void> {
    const result = await this.postsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Post #${id} not found`);
    }
  }
}
