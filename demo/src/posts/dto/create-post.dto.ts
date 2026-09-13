import { IsInt, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: '제목은 비어 있을 수 없습니다.' })
  @MaxLength(100)
  title: string;

  @IsString()
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  content: string;

  // study6에서 JWT 인증이 추가되면 이 필드는 사라지고, 로그인한 사용자로 자동 대체된다.
  @IsInt()
  authorId: number;
}
