import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        orderBy: { id: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { author: true },
      }),
      this.prisma.post.count(),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { author: true },
    });
    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }
    return post;
  }

  create(dto: CreatePostDto, authorId: number) {
    return this.prisma.post.create({
      data: { title: dto.title, content: dto.content, authorId },
      include: { author: true },
    });
  }

  async update(id: number, dto: UpdatePostDto, userId: number) {
    await this.assertOwner(id, userId);
    return this.prisma.post.update({
      where: { id },
      data: dto,
      include: { author: true },
    });
  }

  async remove(id: number, userId: number): Promise<void> {
    await this.assertOwner(id, userId);
    await this.prisma.post.delete({ where: { id } });
  }

  async setThumbnail(id: number, filename: string, userId: number) {
    await this.assertOwner(id, userId);
    return this.prisma.post.update({
      where: { id },
      data: { thumbnailPath: filename },
      include: { author: true },
    });
  }

  // demo/에는 없던 소유권 검사 — 본인이 작성한 글만 수정/삭제/썸네일 변경이 가능하도록 함
  private async assertOwner(postId: number, userId: number): Promise<void> {
    const post = await this.findOne(postId);
    if (post.authorId !== userId) {
      throw new ForbiddenException('본인이 작성한 게시글만 수정/삭제할 수 있습니다.');
    }
  }
}
