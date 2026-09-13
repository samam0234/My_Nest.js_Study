import {
  BadRequestException,
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch,
  Post as HttpPost, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { PostsService } from './posts.service.js';
import type { Post } from './post.entity.js';
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import type { PaginatedPosts } from './dto/paginated-posts.dto.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface.js';

const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @ApiOperation({ summary: '게시글 목록 조회 (페이지네이션)' })
  @Get()
  findAll(@Query() query: PaginationQueryDto): Promise<PaginatedPosts> {
    return this.postsService.findAll(query.page, query.limit);
  }

  @ApiOperation({ summary: '게시글 단건 조회' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Post> {
    return this.postsService.findOne(id);
  }

  // 로그인(JWT)한 사용자만 글을 작성할 수 있음
  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 작성 (로그인 필요)' })
  @UseGuards(AuthGuard('jwt'))
  @HttpPost()
  create(
    @Body() dto: CreatePostDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ): Promise<Post> {
    return this.postsService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
  ): Promise<Post> {
    return this.postsService.update(id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 썸네일 이미지 업로드 (로그인 필요)' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('jwt'))
  @HttpPost(':id/thumbnail')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        // 원본 파일명을 그대로 쓰지 않고 무작위 이름 + 확장자만 남겨 경로 조작(path traversal)을 방지
        filename: (_req, file, callback) => {
          const ext = extname(file.originalname).toLowerCase();
          callback(null, `${randomUUID()}${ext}`);
        },
      }),
      fileFilter: (_req, file, callback) => {
        const ext = extname(file.originalname).toLowerCase();
        const isAllowed =
          ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext);
        callback(null, isAllowed);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  async uploadThumbnail(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Post> {
    if (!file) {
      throw new BadRequestException('png/jpeg/webp 이미지 파일(2MB 이하)만 업로드할 수 있습니다.');
    }
    return this.postsService.setThumbnail(id, file.filename);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.postsService.remove(id);
  }
}
