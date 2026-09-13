import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: '제목은 비어 있을 수 없습니다.' })
  @MaxLength(100)
  title: string;

  @IsString()
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  content: string;

  // authorId는 더 이상 요청 바디로 받지 않는다 — study6부터 로그인한 사용자(JWT)로 자동 지정된다.
}
