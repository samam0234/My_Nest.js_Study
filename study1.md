# Study 1 — 설치 & Hello World REST API 만들기

## 1. 사전 준비

NestJS는 Node.js 위에서 동작하므로 Node.js와 npm이 먼저 설치되어 있어야 합니다.

```powershell
node -v   # v24.14.0 확인
npm -v    # 11.9.0 확인
```

Spring Boot의 JDK, FastAPI의 Python 인터프리터에 대응하는 실행 환경 확인 단계입니다.

## 2. 프로젝트 생성하기

Spring Initializr, `pip install fastapi`에 대응하는 것이 **Nest CLI**입니다. 전역 설치 없이 `npx`로 바로 실행할 수 있습니다.

```powershell
npx -y @nestjs/cli new demo --package-manager npm --skip-git --skip-install
cd demo
npm install
```

| 옵션 | 의미 |
|---|---|
| `--package-manager npm` | 패키지 매니저로 npm 사용 (yarn/pnpm도 가능) |
| `--skip-git` | 이 저장소가 이미 Git 저장소이므로 `demo/` 안에 별도 `.git`을 만들지 않음 |
| `--skip-install` | 생성만 하고 설치는 뒤에서 별도로 실행 (진행 상황을 명확히 보기 위함) |

## 3. 생성된 프로젝트 구조

```
demo/
├─ src/
│   ├─ main.ts               ← 진입점
│   ├─ app.module.ts          ← 루트 모듈
│   ├─ app.controller.ts      ← 예시 컨트롤러
│   ├─ app.service.ts         ← 예시 서비스
│   └─ app.controller.spec.ts ← 예시 유닛 테스트
├─ test/
│   └─ app.e2e-spec.ts        ← 예시 e2e 테스트
├─ package.json
├─ tsconfig.json
└─ nest-cli.json
```

### package.json 주요 스크립트

```json
"start": "nest start",
"start:dev": "nest start --watch",
"build": "nest build",
"test": "vitest run",
"test:e2e": "vitest run --config ./vitest.config.e2e.ts"
```

- `start:dev`는 파일 변경을 감지해 자동 재시작하는 개발 모드입니다. Spring의 `./gradlew bootRun`(spring-boot-devtools), FastAPI의 `uvicorn --reload`에 대응합니다.
- **주의**: 현재 Nest CLI(v12) 기본 스캐폴드는 테스트 러너로 **Vitest**를 사용합니다(예전 자료에서 흔히 보이는 Jest가 아닙니다). 이 저장소도 기본값을 그대로 따라갑니다. 테스트 실습은 `study10.md`에서 진행합니다.

### ESM 모듈 방식

`package.json`에 `"type": "module"`이 있고, 각 파일이 `import { X } from './y.js'`처럼 **`.js` 확장자**를 붙여 다른 `.ts` 파일을 import합니다. Node.js의 ESM(ECMAScript Modules) 규칙 때문인데, TypeScript 컴파일 후에도 실제 실행되는 것은 `.js` 파일이므로 소스 코드에서도 `.js` 확장자로 적어두는 것이 표준입니다(컴파일러가 확장자를 자동으로 안 바꿔줍니다). 이 저장소의 모든 코드에서 이 규칙을 그대로 따릅니다.

### 메인 파일 (복습)

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
```

`study0.md`에서 본 것처럼, `NestFactory.create(AppModule)`이 루트 모듈을 기준으로 전체 DI 컨테이너와 내장 Express 서버를 초기화합니다.

## 4. Nest CLI 명령어 정리

| 명령어 | 축약형 | 역할 |
|---|---|---|
| `nest new <name>` | - | 새 프로젝트 생성 |
| `nest generate module <name>` | `nest g mo <name>` | 모듈 생성 + 상위 모듈에 자동 등록 |
| `nest generate controller <name>` | `nest g co <name>` | 컨트롤러 생성 + 소속 모듈에 자동 등록 |
| `nest generate service <name>` | `nest g s <name>` | 서비스(프로바이더) 생성 + 소속 모듈에 자동 등록 |
| `nest generate resource <name>` | `nest g res <name>` | 모듈+컨트롤러+서비스+DTO를 CRUD 뼈대까지 한 번에 생성 |
| `nest build` | - | TypeScript 컴파일 (`dist/`에 출력) |
| `nest start --watch` | - | 개발 모드 실행 (파일 변경 감지) |

`--no-spec` 플래그를 붙이면 테스트 스펙 파일을 같이 생성하지 않습니다. 이번 실습에서는 개념 확인이 목적이라 `--no-spec`을 사용했습니다.

## 5. Hello World REST API 만들기

CLI로 `hello` 기능의 모듈/컨트롤러/서비스를 한 번에 생성합니다.

```powershell
npx nest g module hello
npx nest g controller hello --no-spec
npx nest g service hello --no-spec
```

실행하면 아래처럼 자동 생성/수정됩니다.

```
CREATE src/hello/hello.module.ts
UPDATE src/app.module.ts          ← HelloModule이 자동으로 imports에 등록됨
CREATE src/hello/hello.controller.ts
UPDATE src/hello/hello.module.ts  ← controllers에 자동 등록
CREATE src/hello/hello.service.ts
UPDATE src/hello/hello.module.ts  ← providers에 자동 등록
```

Spring Initializr가 해주지 않는, "생성과 동시에 상위 모듈에 등록"까지 자동으로 처리해준다는 점이 Nest CLI의 편리한 부분입니다.

### 서비스 구현

```typescript
// src/hello/hello.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloService {
  sayHello(name: string): string {
    return `Hello, ${name}!`;
  }
}
```

### 컨트롤러 구현

```typescript
// src/hello/hello.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { HelloService } from './hello.service.js';

@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  // GET /hello
  @Get()
  hello(): string {
    return this.helloService.sayHello('NestJS');
  }

  // GET /hello/name?name=철수  (쿼리 파라미터, 기본값 World)
  @Get('name')
  helloByQuery(@Query('name') name: string = 'World'): string {
    return this.helloService.sayHello(name);
  }

  // GET /hello/영희  (경로 변수)
  @Get(':name')
  helloByPath(@Param('name') name: string): string {
    return this.helloService.sayHello(name);
  }
}
```

### 코드 설명

| 코드 | 의미 |
|---|---|
| `@Controller('hello')` | 이 컨트롤러의 모든 라우트에 `/hello` prefix가 붙음 |
| `@Get()` | 컨트롤러 prefix 그대로 (`GET /hello`) |
| `@Get('name')` | 정적 경로 세그먼트 추가 (`GET /hello/name`) |
| `@Query('name')` | `?name=value` 쿼리 스트링 값 추출, 파라미터 기본값 문법(`= 'World'`)으로 기본값 지정 |
| `@Get(':name')` | 동적 경로 변수 (`GET /hello/아무값`) |
| `@Param('name')` | 경로 변수 값 추출 |

Spring Boot(`@RequestParam`, `@PathVariable`)와 정확히 대응되는 개념입니다.

### ⚠️ 라우트 등록 순서 주의

`@Get('name')`을 `@Get(':name')`**보다 먼저** 선언해야 합니다. NestJS는 컨트롤러 안에서 선언된 순서대로 라우트를 매칭하기 때문에, `:name`처럼 뭐든 다 받는 동적 라우트를 먼저 선언하면 `/hello/name` 요청까지 `:name = "name"`으로 잡아먹혀 버립니다. Spring MVC는 URL 패턴의 구체성을 기준으로 자동 우선순위를 매기지만, NestJS는 그렇지 않으므로 **정적 경로를 항상 동적 경로보다 위에** 선언하는 습관을 들여야 합니다.

## 6. 실행하기

```powershell
npm run start:dev
```

```
[Nest] ... LOG [NestFactory] Starting Nest application...
[Nest] ... LOG [InstanceLoader] AppModule dependencies initialized
[Nest] ... LOG [InstanceLoader] HelloModule dependencies initialized
[Nest] ... LOG [RoutesResolver] HelloController {/hello}:
[Nest] ... LOG [RouterExplorer] Mapped {/hello, GET} route
[Nest] ... LOG [RouterExplorer] Mapped {/hello/name, GET} route
[Nest] ... LOG [RouterExplorer] Mapped {/hello/:name, GET} route
[Nest] ... LOG [NestApplication] Nest application successfully started
```

## 7. 테스트해보기 (실제 실행 결과)

```bash
$ curl -s http://localhost:3000/hello
Hello, NestJS!

$ curl -s "http://localhost:3000/hello/name?name=Chulsoo"
Hello, Chulsoo!

$ curl -s http://localhost:3000/hello/Younghee
Hello, Younghee!
```

세 라우트 모두 의도한 대로 동작하는 것을 확인했습니다.

## 8. 트러블슈팅

- `npm install` 중 `npm warn EBADENGINE` 경고가 여러 줄 뜨는데, 이는 일부 devDependency가 요구하는 Node 버전(`^22.x || ^24.15.x || >=26`)과 현재 Node(`v24.14.0`)가 정확히 맞지 않아서 나오는 **경고**일 뿐 설치/실행에는 문제가 없습니다.
- Windows에서 `npm run start:dev`로 띄운 서버를 끄고 싶은데 터미널을 닫기 애매한 경우, 포트를 점유 중인 프로세스를 찾아 종료합니다.
  ```powershell
  netstat -ano | findstr :3000     # LISTENING 상태의 PID 확인
  taskkill /PID <PID> /F           # 강제 종료
  ```

## 9. 정리

- Nest CLI로 프로젝트를 생성하고 구조(모듈/컨트롤러/서비스/진입점)를 확인했다.
- `nest generate`로 `hello` 기능의 모듈/컨트롤러/서비스를 생성하고, 상위 모듈에 자동 등록되는 것을 확인했다.
- `@Get`, `@Query`, `@Param`으로 REST 엔드포인트 3개를 만들고 curl로 직접 검증했다.
- 정적 경로가 동적 경로보다 먼저 선언되어야 한다는, Spring MVC와 다른 NestJS의 라우트 매칭 규칙을 배웠다.

## 10. 다음 단계

`study2.md`에서는 이 프로젝트에 게시판(Posts) 도메인을 추가해, in-memory 배열을 이용한 CRUD REST API를 구현합니다.
