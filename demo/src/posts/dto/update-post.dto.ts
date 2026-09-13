import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto.js';

// title/content만 선택적으로 수정 가능하도록 authorId는 제외 (글 작성자는 수정 API로 바꾸지 않음)
export class UpdatePostDto extends PartialType(OmitType(CreatePostDto, ['authorId'] as const)) {}
