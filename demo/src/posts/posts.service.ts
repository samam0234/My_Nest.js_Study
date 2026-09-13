import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
  ) {}

  findAll(): Promise<Post[]> {
    return this.postsRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postsRepository.findOneBy({ id });
    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }
    return post;
  }

  create(dto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create(dto);
    return this.postsRepository.save(post);
  }

  async update(id: number, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    Object.assign(post, dto);
    return this.postsRepository.save(post);
  }

  async remove(id: number): Promise<void> {
    const result = await this.postsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Post #${id} not found`);
    }
  }
}
