# Study 3 — DTO & class-validator & Pipe

`study2`의 인라인 타입(`{ title: string; content: string }`)은 컴파일 타임 체크만 해줄 뿐, 실제로 빈 문자열이나 잘못된 타입이 와도 런타임에서 걸러주지 못합니다. 이번 단계에서는 **DTO 클래스 + class-validator**로 요청값을 실제로 검증하고, 전역 **ValidationPipe**로 모든 컨트롤러에 일괄 적용합니다.

## 1. 패키지 설치

```powershell
npm install class-validator class-transformer @nestjs/mapped-types
```

| 패키지 | 역할 |
|---|---|
| `class-validator` | 클래스 필드에 `@IsString()`, `@IsNotEmpty()` 같은 데코레이터로 검증 규칙 선언 |
| `class-transformer` | 순수 JSON 객체를 DTO 클래스의 인스턴스로 변환(`plainToInstance`) — Nest의 `ValidationPipe`가 내부적으로 사용 |
| `@nestjs/mapped-types` | `PartialType` 등으로 기존 DTO를 변형한 새 DTO를 만드는 유틸 |

FastAPI의 Pydantic 모델, Spring의 `@Valid` + Bean Validation(`@NotBlank` 등)과 정확히 같은 역할을 하는 조합입니다.

## 2. CreatePostDto 작성

```typescript
// src/posts/dto/create-post.dto.ts
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: '제목은 비어 있을 수 없습니다.' })
  @MaxLength(100)
  title: string;

  @IsString()
  @MinLength(1, { message: '내용은 최소 1자 이상이어야 합니다.' })
  content: string;
}
```

- 데코레이터는 여러 개를 겹쳐 쓸 수 있고, 하나라도 실패하면 전부 모아서 에러 메시지 배열로 응답합니다.
- 두 번째 인자로 `{ message: '...' }`를 주면 기본 영문 메시지 대신 한글 메시지를 지정할 수 있습니다.

## 3. UpdatePostDto — PartialType으로 재사용

```typescript
// src/posts/dto/update-post.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreatePostDto } from './create-post.dto.js';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
```

- `PartialType(CreatePostDto)`는 `CreatePostDto`의 모든 필드를 그대로 가져오되 **전부 선택적(optional)**으로 바꿔줍니다. 검증 규칙(`@IsString` 등)도 함께 상속되므로, "필드가 있으면 검증하고 없으면 통과"가 자동으로 됩니다.
- 필드 두 개짜리 DTO를 두 번 타이핑하지 않아도 되는, Nest 특유의 실용적인 유틸입니다.

## 4. 컨트롤러/서비스에서 DTO 사용

```typescript
// posts.controller.ts (일부)
@HttpPost()
create(@Body() dto: CreatePostDto): Post {
  return this.postsService.create(dto);
}

@Patch(':id')
update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePostDto): Post {
  return this.postsService.update(id, dto);
}
```

```typescript
// posts.service.ts (일부)
create(dto: CreatePostDto): Post {
  const post: Post = { id: this.nextId++, title: dto.title, content: dto.content, createdAt: new Date() };
  this.posts.push(post);
  return post;
}

update(id: number, dto: UpdatePostDto): Post {
  const post = this.findOne(id);
  if (dto.title !== undefined) post.title = dto.title;
  if (dto.content !== undefined) post.content = dto.content;
  return post;
}
```

### 💡 `import type`이 필요 없는 이유 (study2와의 차이)

`study2`에서는 `Post` **인터페이스**를 `import type`으로 가져와야 했습니다. 하지만 `CreatePostDto`/`UpdatePostDto`는 **클래스**이고, `ValidationPipe`가 런타임에 `new CreatePostDto()`에 해당하는 인스턴스를 실제로 생성하고 그 안의 데코레이터 메타데이터를 읽어야 하므로, 컴파일 후에도 실제 값으로 남아있어야 합니다. 그래서 DTO는 일반 `import { CreatePostDto } from './dto/create-post.dto.js'`로 가져와야 하며, `import type`을 쓰면 오히려 런타임에 클래스가 사라져 동작하지 않습니다.

> **정리**: 인터페이스/타입 별칭 → `import type` (런타임에 없음) / 클래스(DTO, 엔티티, 서비스 등) → 일반 `import` (런타임에 필요)

## 5. 전역 ValidationPipe 등록 (`main.ts`)

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // DTO에 없는 필드는 자동으로 제거
      forbidNonWhitelisted: true,  // DTO에 없는 필드가 오면 400으로 거부
      transform: true,             // 문자열 등 요청값을 DTO 타입으로 변환
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

| 옵션 | 의미 |
|---|---|
| `whitelist` | DTO 클래스에 선언되지 않은 속성은 조용히 제거 |
| `forbidNonWhitelisted` | `whitelist`와 함께 쓰면, 제거하는 대신 **400 에러**로 명시적으로 거부 (오타/공격성 필드를 조용히 무시하지 않고 알려줌) |
| `transform` | 쿼리/경로 변수 같은 문자열 값을 DTO/파라미터 타입에 맞게 자동 변환 |

`app.useGlobalPipes(...)`로 한 번만 등록하면 프로젝트의 **모든** 컨트롤러에 적용됩니다. 컨트롤러마다 검증 로직을 반복해서 넣지 않아도 되는 것이 Pipe를 전역으로 등록하는 이유입니다.

## 6. 테스트해보기 (실제 실행 결과)

```bash
# 정상 생성
$ curl -s -X POST http://localhost:3000/posts -d '{"title":"valid title","content":"valid content"}' -H "Content-Type: application/json"
{"id":1,"title":"valid title","content":"valid content","createdAt":"..."}

# title 누락 → 400, 여러 검증 실패 메시지를 배열로 반환
$ curl -s -X POST http://localhost:3000/posts -d '{"content":"no title here"}' -H "Content-Type: application/json"
{"message":["title must be shorter than or equal to 100 characters","제목은 비어 있을 수 없습니다.","title must be a string"],"error":"Bad Request","statusCode":400}

# DTO에 없는 필드(hacker)를 보내면 forbidNonWhitelisted에 의해 거부
$ curl -s -X POST http://localhost:3000/posts -d '{"title":"t","content":"c","hacker":"field"}' -H "Content-Type: application/json"
{"message":["property hacker should not exist"],"error":"Bad Request","statusCode":400}

# 빈 문자열 title → IsNotEmpty에서 걸림
$ curl -s -X POST http://localhost:3000/posts -d '{"title":"","content":"c"}' -H "Content-Type: application/json"
{"message":["제목은 비어 있을 수 없습니다."],"error":"Bad Request","statusCode":400}

# UpdatePostDto: title만 보내도 정상 처리 (PartialType 덕분에 content는 선택)
$ curl -s -X PATCH http://localhost:3000/posts/1 -d '{"title":"patched"}' -H "Content-Type: application/json"
{"id":1,"title":"patched","content":"valid content","createdAt":"..."}
```

의도한 대로 정상 요청은 통과하고, 검증 실패/미허용 필드/빈 값은 모두 자동으로 400 에러로 차단됩니다.

## 7. 정리

- `class-validator` 데코레이터로 DTO 필드별 검증 규칙을 선언했다.
- `PartialType`으로 `CreatePostDto`를 재사용해 `UpdatePostDto`를 만들었다 (필드 중복 선언 방지).
- 전역 `ValidationPipe`(`whitelist`, `forbidNonWhitelisted`, `transform`)로 프로젝트 전체 API에 일괄 검증을 적용했다.
- 인터페이스(`import type`)와 클래스(일반 `import`)를 언제 구분해서 가져와야 하는지 실전 사례로 정리했다.

## 8. 다음 단계

`study4.md`에서는 in-memory 배열을 **TypeORM + SQLite**로 교체해, 서버를 재시작해도 게시글 데이터가 유지되도록 만듭니다.
