# Study 8 — 예외 필터 & 전역 에러 처리 (고급 기술 구현 3)

`study7`에서 확인한 문제(성공 응답은 `{data, timestamp}`로 감싸지는데 에러 응답은 예전 형식 그대로 나오는 것)를 **전역 Exception Filter**로 해결합니다. 동시에 "예상하지 못한 에러(500)의 상세 내용을 클라이언트에 노출하지 않기"라는 보안 관례도 적용합니다.

## 1. AllExceptionsFilter — 모든 예외를 잡아서 통일된 형식으로 변환

```typescript
// src/common/filters/all-exceptions.filter.ts
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
}

// @Catch() 인자 없이 쓰면 HttpException뿐 아니라 예상치 못한 에러(Error 등)까지 전부 잡는다
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { statusCode, message } = this.resolveError(exception);

    // 500번대는 서버 로그에 스택트레이스를 남기되, 클라이언트에는 원인을 노출하지 않는다
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : exception);
    }

    response.status(statusCode).json({
      error: { statusCode, message },
      timestamp: new Date().toISOString(),
    });
  }

  private resolveError(exception: unknown): ErrorBody {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      // ValidationPipe가 던지는 예외는 body가 { message: string[], error, statusCode } 형태 객체
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      return { statusCode: status, message };
    }

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: '서버 내부 오류가 발생했습니다.' };
  }
}
```

| 부분 | 의미 |
|---|---|
| `@Catch()` (인자 없음) | `HttpException`(404, 400, 401 등)뿐 아니라 **어떤 예외든** 이 필터로 들어옴. Spring의 `@ExceptionHandler(Exception.class)` 전역 처리와 같은 위치 |
| `exception instanceof HttpException` | Nest 내장/커스텀 HTTP 예외는 `getStatus()`/`getResponse()`로 원래 상태 코드와 메시지를 꺼낼 수 있음 |
| 그 외의 경우 | 우리가 던지지 않은(예상 못 한) 순수 `Error` 등 → 무조건 `500`으로 처리하고, **상세 메시지는 클라이언트에 보내지 않음** |
| `this.logger.error(...)` | 500대 에러는 서버 콘솔에 스택트레이스를 남겨 디버깅 가능하게 하되, 응답 바디에는 넣지 않음 |

## 2. 전역 등록 (`main.ts`)

```typescript
app.useGlobalFilters(new AllExceptionsFilter());
```

Pipe(`useGlobalPipes`), Interceptor(`useGlobalInterceptors`), Filter(`useGlobalFilters`) 모두 이렇게 `main.ts`에서 앱 전체에 일괄 적용할 수 있습니다.

## 3. 500 에러 재현용 실습 라우트

정상적으로 에러 처리를 확인하려면 "예상 못 한 에러"를 일부러 하나 만들어야 합니다.

```typescript
// app.controller.ts
@Get('boom')
boom(): never {
  throw new Error('의도적으로 발생시킨 예상치 못한 에러');
}
```

## 4. 테스트해보기 (실제 실행 결과)

```bash
# 404 — 이제 {error, timestamp} 형식으로 통일됨 (study7까지는 감싸지지 않았음)
$ curl -s http://localhost:3000/posts/999
{"error":{"statusCode":404,"message":"Post #999 not found"},"timestamp":"2026-09-13T19:17:45.646Z"}

# 400 — class-validator의 배열 메시지도 그대로 유지되며 통일된 형식으로 감싸짐
$ curl -s -X POST http://localhost:3000/users -d '{"email":"bad","password":"123"}' -H "Content-Type: application/json"
{"error":{"statusCode":400,"message":["올바른 이메일 형식이 아닙니다.","비밀번호는 최소 8자 이상이어야 합니다."]},"timestamp":"..."}

# 401 — Guard가 던지는 예외도 동일한 형식
$ curl -s -X POST http://localhost:3000/posts -d '{"title":"x","content":"y"}' -H "Content-Type: application/json"
{"error":{"statusCode":401,"message":"Unauthorized"},"timestamp":"..."}

# 500 — 클라이언트는 상세 원인을 알 수 없음
$ curl -s http://localhost:3000/boom
{"error":{"statusCode":500,"message":"서버 내부 오류가 발생했습니다."},"timestamp":"..."}
```

서버 콘솔에는 다음처럼 실제 스택트레이스가 남습니다(클라이언트 응답에는 없음).

```
[Nest] ERROR [ExceptionFilter] Error: 의도적으로 발생시킨 예상치 못한 에러
    at AppController.boom (src/app.controller.ts:16:11)
    ...
```

이제 성공(`study7`의 `{data, timestamp}`)과 실패(`{error, timestamp}`) 응답이 **일관된 최상위 구조**를 갖게 되었습니다. 프론트엔드는 `response.error`의 존재 여부만으로 성공/실패를 판단할 수 있습니다.

## 5. 정리

- `@Catch()`로 모든 예외를 가로채는 전역 필터를 만들어, HTTP 예외와 예기치 못한 에러를 구분해서 처리했다.
- 500 에러는 상세 원인을 서버 로그에만 남기고 클라이언트에는 일반화된 메시지만 응답하는 보안 관례를 적용했다.
- `study7`에서 발견한 "성공/실패 응답 형식 불일치" 문제를 해결해, API 전체의 응답 스키마를 통일했다.

## 6. 다음 단계

`study9.md`에서는 게시글 목록에 페이지네이션을 추가하고, 파일 업로드(이미지 첨부) 기능을 구현합니다.
