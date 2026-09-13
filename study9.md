# Study 9 — 페이지네이션 & 파일 업로드 (고급 기술 구현 4)

게시글이 많아지면 한 번에 다 불러올 수 없으니 **페이지네이션**이 필요하고, 게시판에는 보통 썸네일 이미지 같은 **파일 업로드**도 필요합니다. 이번 단계에서 두 가지를 모두 구현합니다.

## 1. 페이지네이션

### PaginationQueryDto

```typescript
// src/posts/dto/pagination-query.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number) // 쿼리 스트링은 항상 문자열로 들어오므로 숫자로 변환
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
```

`@Query()`로 받는 DTO도 `@Body()` DTO와 똑같이 `class-validator`/`class-transformer`의 적용을 받습니다. `@Type(() => Number)`가 없으면 쿼리 스트링 `"2"`가 문자열인 채로 `@IsInt()` 검증에서 걸리므로, 반드시 명시해야 합니다.

### 서비스 — `findAndCount`로 목록 + 총 개수 동시 조회

```typescript
// posts.service.ts (일부)
async findAll(page: number, limit: number): Promise<PaginatedPosts> {
  const [items, total] = await this.postsRepository.findAndCount({
    order: { id: 'ASC' },
    relations: { author: true },
    skip: (page - 1) * limit,
    take: limit,
  });

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
```

- `skip`/`take`는 SQL의 `OFFSET`/`LIMIT`에 해당합니다.
- `findAndCount`를 쓰면 목록 쿼리와 전체 개수(`COUNT(*)`) 쿼리를 한 번에 처리할 수 있어, 프론트엔드가 "총 몇 페이지인지" 계산할 수 있습니다.

### 컨트롤러

```typescript
@Get()
findAll(@Query() query: PaginationQueryDto): Promise<PaginatedPosts> {
  return this.postsService.findAll(query.page, query.limit);
}
```

## 2. 파일 업로드 — 게시글 썸네일

### Post 엔티티에 컬럼 추가

```typescript
@Column({ type: 'text', nullable: true })
thumbnailPath: string | null;
```

### 업로드 라우트

```typescript
// posts.controller.ts (일부)
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

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
      const isAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext);
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
```

### 🔒 경로 조작(Path Traversal) 방어

파일 업로드에서 가장 흔한 실수는 사용자가 보낸 **원본 파일명을 그대로 저장 경로에 사용**하는 것입니다. 예를 들어 파일명이 `../../etc/passwd`이거나 서버의 기존 파일과 같은 이름이면, 의도치 않은 경로에 쓰거나 기존 파일을 덮어쓸 위험이 있습니다.

이 코드는 `filename` 콜백에서 **원본 이름을 아예 버리고**, `randomUUID()`로 새 이름을 만들되 **확장자만** 원본에서 추출해 붙입니다(`extname()`은 경로 구분자가 있어도 마지막 확장자 문자열만 안전하게 뽑아냅니다). 그리고 `fileFilter`에서 MIME 타입과 확장자를 **둘 다** 화이트리스트로 검사합니다 — MIME 타입은 클라이언트가 헤더로 보내는 값이라 조작 가능하므로, 확장자 체크를 함께 두어 이중으로 방어합니다.

### 정적 파일 서빙 (`main.ts`)

```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
// 업로드된 파일을 /uploads/<파일명>으로 정적 서빙
app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
```

`NestFactory.create<NestExpressApplication>(...)`처럼 제네릭 타입을 지정해야 `useStaticAssets`(Express 전용 기능) 메서드가 타입 상 노출됩니다.

## 3. 테스트해보기 (실제 실행 결과)

### 페이지네이션

```bash
# 글 5개를 만든 후 페이지당 2개씩 조회
$ curl -s "http://localhost:3000/posts?page=1&limit=2"
{"data":{"items":[{"id":1,...},{"id":2,...}],"total":5,"page":1,"limit":2,"totalPages":3},"timestamp":"..."}

$ curl -s "http://localhost:3000/posts?page=2&limit=2"
{"data":{"items":[{"id":3,...},{"id":4,...}],"total":5,"page":2,"limit":2,"totalPages":3},"timestamp":"..."}

# 잘못된 쿼리값 → 400 (study8의 통일된 에러 형식 그대로 적용됨)
$ curl -s "http://localhost:3000/posts?page=abc"
{"error":{"statusCode":400,"message":["page must not be less than 1","page must be an integer number"]},"timestamp":"..."}
```

### 파일 업로드

```bash
# 정상 이미지 업로드 → 무작위 파일명으로 저장, thumbnailPath에 기록됨
$ curl -s -X POST "http://localhost:3000/posts/1/thumbnail" \
    -H "Authorization: Bearer <토큰>" -F "file=@test.png;type=image/png"
{"data":{"id":1,...,"thumbnailPath":"c0c62905-d582-4e1f-b91b-d124c6334220.png",...},"timestamp":"..."}

# 허용되지 않는 확장자(.txt) → 400
$ curl -s -X POST "http://localhost:3000/posts/1/thumbnail" \
    -H "Authorization: Bearer <토큰>" -F "file=@test.txt;type=text/plain"
{"error":{"statusCode":400,"message":"png/jpeg/webp 이미지 파일(2MB 이하)만 업로드할 수 있습니다."},"timestamp":"..."}

# 저장된 파일이 실제로 정적 서빙되는지 확인
$ curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/uploads/c0c62905-d582-4e1f-b91b-d124c6334220.png
200
```

> **Windows/Git Bash 팁**: `curl -F "file=@/tmp/xxx.png"`처럼 Git Bash의 `/tmp` 경로를 그대로 쓰면, 문자열 안에 경로가 섞여 있어 MSYS의 자동 경로 변환이 적용되지 않아 네이티브 `curl.exe`가 파일을 못 찾는 경우(`curl: (26)`)가 있었습니다. 테스트 파일을 프로젝트 폴더 안에 만들고 상대 경로(`file=@test.png`)로 지정하니 바로 해결됐습니다.

## 4. 정리

- `skip`/`take` + `findAndCount`로 페이지네이션을 구현하고, 쿼리 파라미터도 DTO 검증 대상이 될 수 있음을 확인했다.
- `FileInterceptor` + `diskStorage`로 파일 업로드를 구현하되, 원본 파일명 대신 무작위 이름을 사용하고 MIME 타입+확장자를 이중 검증해 경로 조작/악성 파일 업로드를 방어했다.
- `useStaticAssets`로 업로드된 파일을 `/uploads` 경로로 직접 서빙했다.

## 5. 다음 단계

`study10.md`에서는 지금까지 만든 API에 대한 **테스트 코드**(유닛/e2e)를 작성하고, **Swagger**로 API 문서를 자동화하며, 하드코딩되어 있던 `JWT_SECRET` 등을 `ConfigModule` + `.env`로 옮겨 정리합니다.
