import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto.js';

// CreatePostDto에서 authorId가 사라졌으므로 OmitType 없이 바로 PartialType만 사용
export class UpdatePostDto extends PartialType(CreatePostDto) {}
