import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto.js';

// CreatePostDto의 모든 필드를 선택적(optional)으로 바꾼 DTO
export class UpdatePostDto extends PartialType(CreatePostDto) {}
