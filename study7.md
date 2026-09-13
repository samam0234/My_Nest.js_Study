# Study 7 — 커스텀 데코레이터 & 인터셉터 (고급 기술 구현 2)

`study6`에서는 `@Req() req`로 요청 객체를 통째로 받아 `req.user`를 꺼내 썼습니다. 이번 단계에서는 이를 **커스텀 파라미터 데코레이터**로 깔끔하게 바꾸고, 모든 응답 형식을 통일하는/요청을 로깅하는 **인터셉터**를 추가합니다.

## 1. 커스텀 파라미터 데코레이터 — `@CurrentUser()`

```typescript
// src/auth/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './authenticated-request.interface.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedRequest['user'] => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
```

- `createParamDecorator`는 "요청에서 특정 값을 꺼내 파라미터로 주입하는" 데코레이터를 직접 만드는 Nest 유틸입니다. `@Body()`, `@Param()` 같은 내장 데코레이터도 내부적으로 이 방식으로 구현되어 있습니다.
- `ExecutionContext`는 현재 요청/응답 객체, 핸들러, 클래스 등 실행 컨텍스트 전반에 접근할 수 있는 객체입니다. `switchToHttp()`로 HTTP 전용 컨텍스트(Request/Response)를 꺼냅니다.

### 사용 전 / 사용 후 비교

```typescript
// Before (study6)
create(@Body() dto: CreatePostDto, @Req() req: AuthenticatedRequest): Promise<Post> {
  return this.postsService.create(dto, req.user.id);
}

// After (study7)
create(
  @Body() dto: CreatePostDto,
  @CurrentUser() user: AuthenticatedRequest['user'],
): Promise<Post> {
  return this.postsService.create(dto, user.id);
}
```

컨트롤러 메서드가 "요청 객체가 있다"는 사실 자체를 몰라도 되게 되어, 테스트 코드 작성 시에도 `mockRequest` 전체를 만들 필요 없이 사용자 객체 하나만 넘기면 됩니다.

## 2. 인터셉터 — 요청 처리 파이프라인 복습

`study0`에서 본 파이프라인을 다시 떠올려봅니다.

```
요청 → Middleware → Guard → Interceptor(전) → Pipe → Handler → Interceptor(후) → 응답
```

인터셉터는 핸들러 실행 **전후**를 모두 가로챌 수 있는 유일한 컴포넌트입니다. RxJS의 `Observable` 파이프라인 위에서 동작합니다.

### LoggingInterceptor — 요청 로깅

```typescript
// src/common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsedMs = Date.now() - start;
        this.logger.log(`${method} ${originalUrl} - ${elapsedMs}ms`);
      }),
    );
  }
}
```

- `next.handle()`을 호출하기 **전** 코드는 핸들러 실행 전에 실행됩니다(여기서는 시작 시각 기록).
- `next.handle()`이 반환하는 Observable에 `.pipe(tap(...))`을 붙이면, 핸들러가 값을 반환한 **후**에 실행됩니다(여기서는 로그 출력).
- Spring의 `HandlerInterceptor.preHandle`/`postHandle`을 RxJS 스트림 하나로 표현한 것과 비슷합니다.

### TransformInterceptor — 응답 형식 통일

```typescript
// src/common/interceptors/transform.interceptor.ts
export interface Response<T> {
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({ data, timestamp: new Date().toISOString() })),
    );
  }
}
```

컨트롤러가 반환한 값을 `{ data, timestamp }` 형태로 감싸, 모든 성공 응답의 형식을 통일합니다. 프론트엔드 입장에서는 "성공 응답은 항상 `data` 필드 안에 있다"고 가정하고 코드를 짤 수 있게 됩니다.

## 3. 전역 등록 (`main.ts`)

```typescript
app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());
```

여러 개를 등록하면 배열 순서대로 "바깥에서 안쪽으로" 감쌉니다. 즉 요청은 `LoggingInterceptor → TransformInterceptor → Handler` 순으로 들어가고, 응답은 `Handler → TransformInterceptor → LoggingInterceptor` 순으로 나옵니다.

## 4. 테스트해보기 (실제 실행 결과)

```bash
# 회원가입 응답도 {data, timestamp}로 감싸짐
$ curl -s -X POST http://localhost:3000/users -d '{"email":"carol@example.com","password":"password123"}' -H "Content-Type: application/json"
{"data":{"id":1,"email":"carol@example.com"},"timestamp":"2026-09-13T19:15:36.094Z"}

# 게시글 생성 (로그인 필요) — @CurrentUser()로 받은 사용자로 author 지정
$ curl -s -X POST http://localhost:3000/posts -H "Authorization: Bearer <토큰>" -d '{"title":"interceptor test","content":"wrapped"}' -H "Content-Type: application/json"
{"data":{"id":1,"title":"interceptor test","content":"wrapped","createdAt":"...","author":{"id":1,"email":"carol@example.com"}},"timestamp":"..."}

# 서버 콘솔에 남은 로그
[Nest] LOG [HTTP] POST /users - 139ms
[Nest] LOG [HTTP] POST /auth/login - 44ms
[Nest] LOG [HTTP] POST /posts - 86ms
[Nest] LOG [HTTP] GET /posts - 1ms

# 존재하지 않는 글 조회 → 그대로 예외 필터 형식 (감싸지지 않음!)
$ curl -s -w " (status:%{http_code})\n" http://localhost:3000/posts/999
{"message":"Post #999 not found","error":"Not Found","statusCode":404} (status:404)
```

### ⚠️ 인터셉터는 "성공 경로"만 감싼다

`404` 응답이 `{data, timestamp}`로 감싸지지 않고 그대로 나온 것을 확인했습니다. `TransformInterceptor`의 `map(...)`은 `next.handle()`이 **정상적으로 값을 반환(emit)했을 때만** 실행되는데, 컨트롤러/서비스에서 예외가 던져지면 스트림이 에러로 종료되어 `map`을 거치지 않고 곧바로 Nest의 **Exception Filter**로 넘어가기 때문입니다. 같은 이유로 `LoggingInterceptor`의 `tap(...)`도 에러 상황에서는 실행되지 않아, `404`가 난 요청은 로그에 남지 않았습니다. 성공/실패 응답의 형식을 완전히 통일하려면 `study8`에서 예외 필터를 직접 손봐야 합니다.

## 5. 정리

- `createParamDecorator`로 `@CurrentUser()` 커스텀 데코레이터를 만들어 `@Req()` + `req.user` 조합을 대체했다.
- `LoggingInterceptor`로 요청 처리 시간을, `TransformInterceptor`로 응답 형식 통일을 구현했다.
- 인터셉터가 감싸는 것은 **성공 경로**뿐이고, 예외는 인터셉터를 건너뛰어 예외 필터로 직행한다는 것을 실제 요청으로 확인했다.

## 6. 다음 단계

`study8.md`에서는 이 문제를 해결하기 위해 **커스텀 Exception Filter**를 만들어, 성공/실패 응답의 형식을 하나로 통일하고 에러 처리를 전역화합니다.
