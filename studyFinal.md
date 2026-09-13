# Study Final — 종합 프로젝트 (구조를 다르게)

`study0`~`study10`에서 익힌 개념(모듈/DI, DTO 검증, ORM, Guard+JWT, 인터셉터/필터, 페이지네이션·파일 업로드, 테스트/문서화)을 응용하되, `demo/`와는 **의도적으로 다른 구조**로 게시판+인증 API를 다시 만들고 실제 **React 프론트엔드**까지 붙입니다. 코드는 `project/server`(백엔드)와 `project/client`(프론트엔드)에 있습니다.

## 0. demo/ 와 무엇이 다른가

| | `demo/` | `project/` |
|---|---|---|
| ORM | TypeORM | **Prisma** |
| 폴더 구조 | 계층별 평면 폴더 (`src/posts`, `src/users`, `src/auth`) | **feature-module** (`src/modules/posts`, `src/modules/users`, `src/modules/auth`) + `src/prisma`(공유 인프라) |
| 인가(Authorization) | 로그인 여부만 확인(Guard) | 로그인 + **작성자 본인 확인**(소유권 검사, 403) |
| 민감 필드 보호 | TypeORM `@Column({select:false})` (조회만 보호) | Prisma `omit`(생성/수정 등 **모든** 쿼리에 적용) |
| 프론트엔드 | 없음 (curl로만 검증) | **React(Vite)** — 실제 브라우저에서 동작 확인 |

Notion 학습 목표의 "TypeORM 또는 Prisma" 중 `demo/`에서 다루지 않은 쪽을 최종 프로젝트에서 다뤄, 두 ORM을 실제로 비교해볼 수 있게 했습니다.

## 1. Prisma 설정

### 스키마 (`server/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id       Int    @id @default(autoincrement())
  email    String @unique
  password String
  posts    Post[]
}

model Post {
  id            Int      @id @default(autoincrement())
  title         String
  content       String
  thumbnailPath String?
  createdAt     DateTime @default(now())
  author        User     @relation(fields: [authorId], references: [id])
  authorId      Int
}
```

TypeORM처럼 클래스에 데코레이터를 붙이는 대신, **전용 스키마 언어**(`.prisma` 파일)로 모델을 선언하는 것이 Prisma의 가장 큰 특징입니다. `npx prisma generate`가 이 스키마를 읽어 타입까지 완벽히 맞아떨어지는 `PrismaClient`를 자동 생성합니다.

```powershell
npx prisma generate   # 스키마 → 타입이 붙은 PrismaClient 코드 생성
npx prisma db push    # 스키마를 실제 DB(SQLite)에 반영 (마이그레이션 파일 없이 즉시 동기화)
```

### ⚠️ 트러블슈팅: Prisma 최신 버전(7.x)의 아키텍처 변경

`npm install prisma @prisma/client`로 아무 버전도 지정하지 않고 설치했더니 **7.10.0**(당시 npm의 `latest` 태그가 가리키던 7.x)이 깔렸는데, `prisma init --datasource-provider sqlite` 같은 익숙한 명령이 아예 사라져 있었고, `prisma generate` 시 다음 에러가 발생했습니다.

```
error: The datasource property `url` is no longer supported in schema files.
Move connection URLs for Migrate to `prisma.config.ts` and pass either
`adapter` for a direct database connection or `accelerateUrl` for Accelerate
to the `PrismaClient` constructor.
```

Prisma 7부터는 스키마 파일에 접속 URL을 직접 쓰는 대신 `prisma.config.ts` + 드라이버 어댑터 패턴으로 완전히 바뀐 것입니다. 이 저장소를 쓰는 시점에 대부분의 문서/튜토리얼이 아직 기준으로 삼는 것은 **6.x 계열의 전통적인 방식**(`datasource { url = env(...) }`)이므로, 학습 목적에는 안정적인 이전 메이저 버전이 더 적합하다고 판단해 버전을 고정했습니다.

```powershell
npm install prisma@6.19.3 @prisma/client@6.19.3
```

> **교훈**: `npm install <package>`로 버전을 지정하지 않으면 `latest` 태그가 최신 안정판이 아니라 **막 나온 메이저 릴리스(RC 포함)**를 가리킬 수도 있습니다. 특히 ORM처럼 프로젝트 전체에 영향을 주는 핵심 의존성은 설치 후 `npx <cli> --version`으로 실제 버전을 확인하는 습관이 중요합니다.

### PrismaService — 전역 프로바이더로 등록

```typescript
// src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // User.password는 어떤 쿼리(find/create/update 포함)에서도 기본적으로 결과에서 제외된다.
      omit: { user: { password: true } },
    });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

```typescript
// src/prisma/prisma.module.ts
@Global() // 다른 feature 모듈이 매번 imports 하지 않아도 PrismaService를 주입받을 수 있음
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

`PrismaService`가 `PrismaClient`를 상속하면서 Nest의 생명주기 훅(`OnModuleInit`/`OnModuleDestroy`)으로 연결/해제를 관리하는 것이 표준 패턴입니다.

### 💡 Prisma `omit` vs TypeORM `select: false`

`study5`에서 TypeORM의 `@Column({select:false})`가 **조회(find)에만** 적용되고, `save()`가 반환하는 방금 만든 엔티티에는 비밀번호 해시가 그대로 남아있어 `create()`에서 수동으로 구조 분해(`delete`)해야 했던 것을 기억할 것입니다. Prisma의 `omit` 옵션은 클라이언트 레벨에서 설정하기 때문에 `create`/`update`/`find` 등 **모든 연산의 반환값**에 일괄 적용됩니다.

```typescript
// users.service.ts — TypeORM 버전과 달리 별도 구조 분해가 필요 없다
async create(dto: CreateUserDto) {
  const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
  return this.prisma.user.create({ data: { email: dto.email, password: hashedPassword } });
  // password는 전역 omit 덕분에 자동으로 응답에서 빠진다
}
```

로그인처럼 정말 비밀번호가 필요할 때는 쿼리 단위로 `omit`을 해제합니다.

```typescript
findByEmailWithPassword(email: string) {
  return this.prisma.user.findUnique({
    where: { email },
    omit: { password: false }, // 이 쿼리에서만 전역 omit을 해제
  });
}
```

실제 curl로 확인한 결과, 회원가입(`POST /users`) 응답에도 비밀번호 해시가 전혀 노출되지 않았습니다 — TypeORM에서는 별도 코드가 필요했던 부분이 Prisma에서는 설정 한 줄로 해결됩니다.

## 2. feature-module 구조

```
server/src/
├─ main.ts
├─ app.module.ts
├─ prisma/                 ← 공유 인프라 (전역 모듈)
│   ├─ prisma.module.ts
│   └─ prisma.service.ts
├─ modules/
│   ├─ auth/                (controller, service, jwt.strategy, dto, ...)
│   ├─ users/                (controller, service, dto)
│   └─ posts/                (controller, service, dto)
└─ common/                 ← 인터셉터, 예외 필터
```

`demo/`가 `src/posts`, `src/users`, `src/auth`처럼 평면적으로 나열했다면, `project/`는 실제 기능(도메인)들을 `src/modules/` 아래로 모으고, 여러 모듈이 공유하는 인프라(`PrismaService`)는 `src/prisma/`로 명확히 분리했습니다. 프로젝트가 커질수록 "이 폴더 안에 있는 것은 전부 하나의 기능"이라는 규칙이 유지되기 쉬운 구조입니다.

## 3. 소유권 기반 인가 (새로운 부분)

`demo/`에서는 "로그인했는지"만 확인했지 "본인 글인지"는 확인하지 않았습니다. `project/`에서는 수정/삭제/썸네일 변경 시 **작성자 본인인지**를 검사해 `403 Forbidden`으로 막습니다.

```typescript
// posts.service.ts
private async assertOwner(postId: number, userId: number): Promise<void> {
  const post = await this.findOne(postId);
  if (post.authorId !== userId) {
    throw new ForbiddenException('본인이 작성한 게시글만 수정/삭제할 수 있습니다.');
  }
}

async remove(id: number, userId: number): Promise<void> {
  await this.assertOwner(id, userId);
  await this.prisma.post.delete({ where: { id } });
}
```

두 명의 사용자로 실제 테스트한 결과:

```bash
# other@example.com이 final@example.com의 글을 삭제 시도
$ curl -X DELETE http://localhost:4000/posts/1 -H "Authorization: Bearer <other의 토큰>"
{"error":{"statusCode":403,"message":"본인이 작성한 게시글만 수정/삭제할 수 있습니다."},"timestamp":"..."}
```

## 4. Prisma 에러를 예외 필터에서 변환

Prisma는 자체 에러 코드 체계(`P2025`: 레코드 없음, `P2002`: 유니크 제약 위반 등)를 가지고 있습니다. `AllExceptionsFilter`에서 이를 알아보고 적절한 HTTP 상태로 변환합니다.

```typescript
if (exception instanceof Prisma.PrismaClientKnownRequestError) {
  if (exception.code === 'P2025') return { statusCode: 404, message: '요청한 데이터를 찾을 수 없습니다.' };
  if (exception.code === 'P2002') return { statusCode: 409, message: '이미 존재하는 값입니다.' };
}
```

## 5. React 프론트엔드 연동

### CORS

React 개발 서버(Vite, 기본 `5173` 포트)와 API 서버(`4000` 포트)는 **오리진이 다르므로** 브라우저가 기본적으로 요청을 차단합니다. 서버에서 명시적으로 허용해야 합니다.

```typescript
// main.ts
app.enableCors({ origin: configService.get<string>('CLIENT_ORIGIN', 'http://localhost:5173') });
```

### API 클라이언트 (`client/src/api.ts`)

```typescript
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem('accessToken');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const body = JSON.parse(await res.text() || 'null');

  if (!res.ok) {
    const msg = body.error.message;
    throw new ApiRequestError(body.error.statusCode, Array.isArray(msg) ? msg.join(', ') : msg);
  }
  return body?.data as T;
}
```

`study7`/`study8`에서 만든 `{data, timestamp}` / `{error, timestamp}` 응답 형식을 그대로 재사용해, 프론트엔드는 `res.ok` 여부와 `body.data`/`body.error`만 보면 되도록 설계했습니다.

### 로그인 상태 관리

JWT를 `localStorage`에 저장하고, 토큰의 payload(`sub`, `email`)를 클라이언트에서 직접 디코딩해 "현재 로그인한 사용자"를 판별합니다(서버 시크릿 없이도 payload는 base64로 누구나 읽을 수 있으므로, 여기 담긴 정보는 민감하지 않은 값만 사용합니다).

```typescript
function decodeJwtPayload(token: string) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}
```

이 값(`userId`)으로 게시글 목록에서 "내가 쓴 글에만 수정/삭제 버튼 표시"를 프론트엔드에서도 구현했습니다 (서버의 `assertOwner`가 최종 방어선이고, 프론트엔드는 UX를 위한 것일 뿐입니다).

## 6. 실제 브라우저 테스트 결과

서버(`http://localhost:4000`)와 클라이언트(`http://localhost:5173`)를 함께 띄운 뒤, Playwright로 실제 Chromium 브라우저를 띄워 다음 시나리오를 검증했습니다.

1. 초기 화면 로드 → 로그인/회원가입 폼 + 게시글 목록이 정상적으로 렌더링됨
2. "회원가입" 폼에 이메일/비밀번호 입력 후 제출 → 자동으로 회원가입 + 로그인까지 이어져 헤더에 이메일과 로그아웃 버튼이 나타남
3. "새 게시글 작성" 폼으로 글 작성 → 목록에 즉시 반영됨
4. 다른 사용자가 쓴 글에는 수정/삭제 버튼이 보이지 않고, 본인 글에만 "썸네일 변경"/"삭제" 버튼이 나타남 (소유권 검사가 프론트엔드 UI에도 정확히 반영됨)

브라우저 콘솔에는 에러가 전혀 없었고, 스크린샷으로 위 흐름이 실제로 동작하는 것을 확인했습니다.

## 7. 정리 — 전체 커리큘럼을 마치며

`study0`의 이론부터 시작해 `study1`~`study10`으로 게시판+인증 API를 한 단계씩 완성했고, `studyFinal`에서는 같은 개념을 **다른 도구(Prisma)**와 **다른 구조(feature-module)**로 다시 짜보면서, 그리고 **소유권 기반 인가**라는 새로운 요구사항을 추가하면서, 그리고 **실제 프론트엔드(React)**와 연동하면서 응용력을 확인했습니다.

Spring Boot(`Spring_Boot/`), FastAPI(`python/FastApi/`)와 나란히 놓고 보면:

| 개념 | Spring Boot | FastAPI | NestJS |
|---|---|---|---|
| DI 컨테이너 | ApplicationContext | 의존성 주입 함수 | Nest IoC Container |
| 요청 검증 | `@Valid` + Bean Validation | Pydantic | DTO + class-validator |
| ORM | Spring Data JPA | SQLAlchemy | TypeORM / **Prisma** |
| 인증 | Spring Security + JWT | OAuth2PasswordBearer + JWT | Passport + `@nestjs/jwt` |
| 인가(Guard 계열) | Security Filter Chain | Depends() 커스텀 검사 | Guard |
| 부가 로직(AOP 계열) | `@Around`, Filter | 미들웨어 | Interceptor |
| 전역 에러 처리 | `@RestControllerAdvice` | Exception Handler | Exception Filter |

세 프레임워크 모두 **계층 분리 + 의존성 주입 + 선언적 검증/인증**이라는 같은 원칙을 각자의 언어/생태계 방식으로 구현한다는 것을 이 커리큘럼을 통해 확인할 수 있었습니다.
