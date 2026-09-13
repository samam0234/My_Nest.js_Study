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
import { CreatePostDto } from './dto/create-post.dto.js';
import { UpdatePostDto } from './dto/update-post.dto.js';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
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
  findAll(@Query() query: PaginationQueryDto) {
    return this.postsService.findAll(query.page, query.limit);
  }

  @ApiOperation({ summary: '게시글 단건 조회' })
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.findOne(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 작성 (로그인 필요)' })
  @UseGuards(AuthGuard('jwt'))
  @HttpPost()
  create(@Body() dto: CreatePostDto, @CurrentUser() user: AuthenticatedRequest['user']) {
    return this.postsService.create(dto, user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 수정 (작성자 본인만 가능)' })
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    return this.postsService.update(id, dto, user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 썸네일 업로드 (작성자 본인만 가능)' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('jwt'))
  @HttpPost(':id/thumbnail')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
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
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadThumbnail(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedRequest['user'],
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('png/jpeg/webp 이미지 파일(2MB 이하)만 업로드할 수 있습니다.');
    }
    return this.postsService.setThumbnail(id, file.filename, user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 삭제 (작성자 본인만 가능)' })
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedRequest['user'],
  ) {
    return this.postsService.remove(id, user.id);
  }
}
