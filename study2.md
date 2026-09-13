# Study 2 — 게시판 CRUD (in-memory)

`study1`에서 만든 `demo` 프로젝트에 이 저장소의 공통 스펙인 **게시판(Posts) CRUD**를 추가합니다. 아직 DB는 연결하지 않고, 서비스 내부의 배열(in-memory)로 데이터를 관리합니다. Spring Boot/FastAPI에서도 DB 전에 in-memory로 먼저 CRUD 흐름을 익혔던 것과 같은 순서입니다.

## 1. 모듈/컨트롤러/서비스 생성

```powershell
npx nest g module posts
npx nest g controller posts --no-spec
npx nest g service posts --no-spec
```

`study1`과 마찬가지로 `PostsModule`이 `AppModule`에 자동 등록됩니다.

## 2. 데이터 형태 정의 (`post.interface.ts`)

DB 엔티티가 아직 없으므로 순수 TypeScript `interface`로 데이터 모양만 정의합니다.

```typescript
// src/posts/post.interface.ts
export interface Post {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
}
```

## 3. 서비스 — in-memory CRUD 로직

```typescript
// src/posts/posts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Post } from './post.interface.js';

@Injectable()
export class PostsService {
  private posts: Post[] = [];
  private nextId = 1;

  findAll(): Post[] {
    return this.posts;
  }

  findOne(id: number): Post {
    const post = this.posts.find((p) => p.id === id);
    if (!post) {
      throw new NotFoundException(`Post #${id} not found`);
    }
    return post;
  }

  create(title: string, content: string): Post {
    const post: Post = { id: this.nextId++, title, content, createdAt: new Date() };
    this.posts.push(post);
    return post;
  }

  update(id: number, title?: string, content?: string): Post {
    const post = this.findOne(id);
    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    return post;
  }

  remove(id: number): void {
    const index = this.posts.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new NotFoundException(`Post #${id} not found`);
    }
    this.posts.splice(index, 1);
  }
}
```

- `NotFoundException`은 Nest가 기본 제공하는 HTTP 예외 클래스입니다. 던지면 자동으로 `404` 응답 + `{ message, error, statusCode }` 형태의 JSON 바디로 변환됩니다. 이 변환은 Nest의 기본 **Exception Filter**가 처리하며(`study8`에서 커스터마이징), 지금은 "예외를 던지기만 하면 알아서 HTTP 응답이 된다"는 점만 기억하면 됩니다. Spring의 `ResponseStatusException`, FastAPI의 `HTTPException`과 같은 역할입니다.
- 서비스는 데이터가 어디서 왔는지(배열인지 DB인지)를 컨트롤러가 몰라도 되게 캡슐화합니다. `study4`에서 이 배열을 TypeORM Repository로 바꿔도 컨트롤러 코드는 거의 그대로 유지됩니다.

## 4. 컨트롤러 — REST 엔드포인트

```typescript
// src/posts/posts.controller.ts
import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch,
  Post as HttpPost,
} from '@nestjs/common';
import { PostsService } from './posts.service.js';
import type { Post } from './post.interface.js';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  findAll(): Post[] {
    return this.postsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Post {
    return this.postsService.findOne(id);
  }

  @HttpPost()
  create(@Body() body: { title: string; content: string }): Post {
    return this.postsService.create(body.title, body.content);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { title?: string; content?: string },
  ): Post {
    return this.postsService.update(id, body.title, body.content);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): void {
    this.postsService.remove(id);
  }
}
```

### 코드 설명

| 코드 | 의미 |
|---|---|
| `Post as HttpPost` | `@nestjs/common`의 HTTP 메서드 데코레이터 `Post`와, 우리가 만든 `Post` 인터페이스 이름이 충돌하므로 import 시 별칭을 붙였습니다. |
| `ParseIntPipe` | 경로 변수는 원래 문자열로 들어오는데, 이 내장 파이프가 정수로 변환해줍니다. 변환 실패 시 자동으로 `400 Bad Request`를 응답합니다. 파이프의 "검증+변환" 역할을 미리 살짝 맛본 것이고, 본격적인 내용은 `study3`에서 다룹니다. |
| `@HttpCode(204)` | 기본 응답 코드(POST는 201, 나머지는 200)를 `204 No Content`로 덮어씀. 삭제 성공 시 본문 없이 204를 반환하는 REST 관례를 따름 |
| `@Body() body: {...}` | 아직 DTO 클래스가 없어 인라인 타입으로 요청 바디를 받음. 타입 체크는 되지만 **런타임 검증은 없다**는 한계가 있음 → `study3`에서 해결 |

### ⚠️ TypeScript 컴파일 이슈: `import type`

처음에 `import { Post } from './post.interface.js'`로 작성했더니 빌드 시 아래 에러가 발생했습니다.

```
error TS1272: A type referenced in a decorated signature must be imported with
'import type' or a namespace import when 'isolatedModules' and
'emitDecoratorMetadata' are enabled.
```

- Nest는 `@Param()`, `@Body()` 같은 파라미터 데코레이터가 붙은 메서드의 타입 정보를 런타임에 참조하기 위해 `emitDecoratorMetadata` 컴파일러 옵션을 사용합니다.
- 그런데 `Post`는 **인터페이스**라서 컴파일 후에는 아예 사라지는(런타임에 존재하지 않는) 타입 전용 값입니다. `isolatedModules` 옵션이 켜진 상태에서는 컴파일러가 파일 단위로만 보기 때문에 "이 import가 값인지 타입인지"를 미리 명확히 알아야 하는데, 일반 `import`문은 이를 보장하지 못해 에러가 납니다.
- 해결: 타입으로만 쓰이는 import는 `import type { Post } from './post.interface.js'`로 명시합니다. 인터페이스/타입 별칭처럼 런타임에 존재하지 않는 것은 습관적으로 `import type`을 쓰는 것이 안전합니다.

## 5. 빌드 & 실행

```powershell
npm run build   # 컴파일 오류 확인
npm run start   # 서버 실행
```

## 6. 테스트해보기 (실제 실행 결과)

```bash
$ curl -s http://localhost:3000/posts
[]

$ curl -s -X POST http://localhost:3000/posts \
    -H "Content-Type: application/json" \
    -d '{"title":"first post","content":"hello nest"}'
{"id":1,"title":"first post","content":"hello nest","createdAt":"2026-09-13T19:01:20.660Z"}

$ curl -s -X POST http://localhost:3000/posts \
    -H "Content-Type: application/json" \
    -d '{"title":"second","content":"world"}'
{"id":2,"title":"second","content":"world","createdAt":"2026-09-13T19:01:20.718Z"}

$ curl -s http://localhost:3000/posts
[{"id":1,...}, {"id":2,...}]

$ curl -s -X PATCH http://localhost:3000/posts/1 \
    -H "Content-Type: application/json" -d '{"title":"updated title"}'
{"id":1,"title":"updated title","content":"hello nest","createdAt":"..."}

$ curl -s -o /dev/null -w "%{http_code}\n" -X DELETE http://localhost:3000/posts/2
204

$ curl -s -w " (status:%{http_code})\n" http://localhost:3000/posts/2
{"message":"Post #2 not found","error":"Not Found","statusCode":404} (status:404)
```

생성 → 목록 조회 → 단건 조회 → 수정 → 삭제 → 삭제 후 조회 시 404, 전체 CRUD 흐름이 의도대로 동작합니다.

## 7. 정리

- 배열 기반 in-memory 저장소로 게시판 CRUD 5종(목록/단건/생성/수정/삭제)을 구현했다.
- `NotFoundException` 등 Nest 내장 HTTP 예외로 컨트롤러/서비스 코드 몇 줄만으로 표준 에러 응답을 만들 수 있음을 확인했다.
- `ParseIntPipe`로 파이프의 기본 동작(문자열 → 숫자 변환, 실패 시 400)을 미리 경험했다.
- TypeScript `isolatedModules` + `emitDecoratorMetadata` 조합에서 인터페이스는 `import type`으로 가져와야 한다는 실전 트러블슈팅을 겪었다.

## 8. 다음 단계

`study3.md`에서는 인라인 타입(`{ title: string; content: string }`)을 **DTO 클래스 + class-validator**로 바꿔, 잘못된 요청(빈 제목, 타입 오류 등)을 자동으로 걸러내는 검증 파이프를 적용합니다.
