# NestJS 기초 개념 정리 (Study 0)

이 문서는 실습 없이 개념만 정리합니다. `Spring_Boot/study0.md`, `python/FastApi/study0.md`를 이미 봤다면 곳곳에서 "아, 그거랑 똑같은 거구나" 하는 느낌을 받을 것입니다. 실제로 NestJS는 세 프레임워크 중 Spring Boot와 사상적으로 가장 가깝습니다.

## 1. NestJS란?

### Node.js 생태계의 위치

- Node.js 서버 프레임워크는 크게 두 갈래입니다.
  - **Express, Koa, Fastify**: 라우팅 함수를 직접 이어붙이는 미니멀한(un-opinionated) 프레임워크. 구조를 어떻게 짤지는 전적으로 개발자 몫입니다.
  - **NestJS**: Express(기본) 또는 Fastify 위에 **강제된 아키텍처**를 얹은 프레임워크. "Node.js 진영의 Spring Boot"라고 불릴 만큼 모듈/DI/데코레이터 구조가 유사합니다.
- 즉 NestJS 앱을 실행하면 내부적으로는 여전히 Express 서버가 요청을 받습니다. NestJS는 그 위에 계층 구조와 규칙을 씌운 것입니다.
- TypeScript를 기본 언어로 사용합니다(JS도 가능하지만 데코레이터·타입 기반 설계의 이점을 살리려면 TS가 사실상 표준). FastAPI가 Python 타입힌트를, Spring이 Java 타입 시스템을 활용하듯, Nest는 TypeScript의 타입 + 데코레이터를 프레임워크의 뼈대로 씁니다.

### 왜 그냥 Express를 안 쓰고 NestJS를 쓸까?

- Express만으로 프로젝트가 커지면 "라우트 파일이 몇 개고, 어디서 DB 연결을 하고, 어디서 검증을 하는지"가 프로젝트마다 제각각이 됩니다.
- NestJS는 Angular에서 영감을 받은 **모듈 시스템 + 의존성 주입 컨테이너**를 강제하여, 여러 명이 작업해도 구조가 일정하게 유지되도록 합니다. Spring Boot가 Java 진영에서 하던 역할과 동일합니다.

## 2. 핵심 개념: IoC와 DI

Spring Boot에서 배운 개념이 이름만 살짝 바뀐 채 그대로 등장합니다.

### IoC (Inversion of Control, 제어의 역전)

- 원래는 개발자가 필요한 객체를 직접 `new`로 생성해서 사용합니다.
- NestJS에서는 **Nest IoC 컨테이너**가 클래스의 인스턴스 생성과 생명주기를 대신 관리합니다. 개발자는 "이 클래스가 필요하다"고 선언만 하면, 컨테이너가 알아서 만들어서 꽂아줍니다.

### DI (Dependency Injection, 의존성 주입)

- 클래스에 필요한 의존성(다른 서비스 등)을 생성자 파라미터로 선언하면 Nest가 자동으로 주입합니다.

```typescript
@Injectable()
export class PostsService {
  // Nest가 PostsRepository 인스턴스를 자동으로 만들어서 넣어줌
  constructor(private readonly postsRepository: PostsRepository) {}
}
```

- Spring의 `@Component`/`@Service` + `@Autowired`(생성자 주입)와 정확히 같은 개념입니다.
- `@Injectable()`이 붙은 클래스를 **프로바이더(Provider)** 라고 부릅니다. Spring의 "빈(Bean)"에 대응하는 용어입니다.

| Spring Boot | NestJS | 의미 |
|---|---|---|
| Bean | Provider | DI 컨테이너가 관리하는 객체 |
| `@Component` / `@Service` / `@Repository` | `@Injectable()` | "이 클래스는 DI 컨테이너가 관리해라" |
| `@Autowired` (생성자 주입) | 생성자 파라미터 타입 선언 | 의존성 주입 지점 |
| ApplicationContext | IoC Container (모듈별 스코프) | 객체를 생성/보관/주입하는 컨테이너 |

## 3. 프로젝트 기본 구조

Nest CLI로 프로젝트를 생성하면 아래와 같은 뼈대가 생깁니다 (자세한 생성 방법은 `study1.md`).

```
src/
├─ main.ts            ← 진입점 (서버 부팅)
├─ app.module.ts       ← 루트 모듈
├─ app.controller.ts   ← 최상위 컨트롤러 (예시용)
└─ app.service.ts      ← 최상위 서비스 (예시용)
```

### 진입점 (`main.ts`)

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule); // 루트 모듈로 앱 생성 (내부적으로 Express 인스턴스 생성)
  await app.listen(3000);
}
bootstrap();
```

- Spring Boot의 `@SpringBootApplication` + `SpringApplication.run(...)`, FastAPI의 `app = FastAPI()` + `uvicorn.run(app)`과 같은 역할입니다.

### 모듈 (`@Module`)

```typescript
@Module({
  imports: [],       // 다른 모듈 가져오기
  controllers: [AppController],  // 이 모듈이 담당하는 컨트롤러
  providers: [AppService],       // 이 모듈이 등록하는 프로바이더(서비스 등)
})
export class AppModule {}
```

- Nest 앱은 **모듈 트리**로 구성됩니다. 기능 단위(게시판, 인증, 회원 등)마다 모듈을 나누고, 루트 모듈(`AppModule`)이 이들을 `imports`로 모읍니다.
- Spring의 "패키지별로 나눈 `@Configuration`/`@ComponentScan`" 역할을 명시적인 `@Module` 데코레이터로 강제한다고 보면 됩니다.

## 4. 계층형 구조 (Controller - Service - Repository)

Spring Boot, FastAPI와 동일한 3계층 구조를 그대로 씁니다. 이름도 거의 같습니다.

```
[HTTP 요청]
   ↓
Controller  (@Controller)   ─ 라우팅, 요청/응답 매핑만 담당
   ↓
Service     (@Injectable)   ─ 실제 비즈니스 로직
   ↓
Repository  (TypeORM Repository / Prisma Client) ─ DB 접근
```

| 계층 | Spring Boot | FastAPI | NestJS |
|---|---|---|---|
| 진입점 | `@RestController` | `@app.get(...)` 라우트 함수 | `@Controller()` |
| 비즈니스 로직 | `@Service` | 별도 함수/모듈로 분리 | `@Injectable()` (Service) |
| DB 접근 | `JpaRepository` | SQLAlchemy `Session` | TypeORM `Repository<T>` / Prisma `Client` |
| 데이터 검증/전송 객체 | DTO (record/class) | Pydantic 모델 | DTO class + class-validator |

### 컨트롤러 예시 (개념만)

```typescript
@Controller('posts')       // 기본 경로: /posts
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()                    // GET /posts
  findAll() {
    return this.postsService.findAll();
  }

  @Get(':id')               // GET /posts/:id
  findOne(@Param('id') id: string) {
    return this.postsService.findOne(+id);
  }
}
```

- 컨트롤러는 "요청을 받아서 서비스에 위임하고 결과를 반환"하는 역할만 합니다. 비즈니스 로직(검증, 계산, DB 조작)은 서비스에 둡니다. Spring/FastAPI에서 배운 "얇은 컨트롤러, 두꺼운 서비스" 원칙이 그대로 적용됩니다.

## 5. 요청 처리 파이프라인

NestJS의 가장 중요한 개념 중 하나입니다. 요청 하나가 컨트롤러에 도달하기까지, 그리고 응답이 나가기까지 여러 단계를 거칩니다.

```
요청 →  Middleware  →  Guard  →  Interceptor(전)  →  Pipe  →  Controller Handler
                                                                      ↓
응답 ←  Interceptor(후)  ←────────────────────────────────────────────┘
                ↓ (예외 발생 시)
          Exception Filter
```

| 구성요소 | 데코레이터/베이스 클래스 | 역할 | Spring Boot 대응 |
|---|---|---|---|
| Middleware | `NestMiddleware` (Express 미들웨어와 거의 동일) | 요청 전처리 (로깅, CORS 등) | `Filter` (Servlet Filter) |
| Guard | `CanActivate` | **인증/인가** 판단 (통과 여부만 boolean) | Spring Security의 인증/인가 필터 |
| Interceptor | `NestInterceptor` | 요청 전/후 가로채서 로깅, 응답 변형, 캐싱 등 | AOP(`@Around`), Servlet Filter 일부 |
| Pipe | `PipeTransform` | 입력값 **검증 & 변환** (DTO validation, 타입 변환) | `@Valid` + Converter |
| Exception Filter | `ExceptionFilter` | 예외를 잡아서 일관된 응답으로 변환 | `@RestControllerAdvice` + `@ExceptionHandler` |

- Notion 문서의 "Guard ≈ Interceptor / Filter"라는 메모가 바로 이 표를 가리킵니다. Spring에는 "인증만 담당하는 컴포넌트"가 따로 없고 Security Filter Chain 전체가 그 역할을 하지만, Nest는 **Guard(인가 여부 판단)**와 **Interceptor(부가 로직)**를 명확히 분리해둔 것이 특징입니다.
- 이 파이프라인은 `study6`(Guard+JWT), `study7`(Interceptor), `study3`(Pipe), `study8`(Exception Filter)에서 하나씩 실습합니다.

## 6. 자주 쓰는 핵심 데코레이터 정리

### 6.1 모듈/컴포넌트 등록

| 데코레이터 | 용도 |
|---|---|
| `@Module()` | 모듈 정의 (imports/controllers/providers/exports) |
| `@Injectable()` | DI 컨테이너가 관리하는 프로바이더(서비스 등) 표시 |
| `@Controller(prefix?)` | 컨트롤러 정의 + 기본 라우트 prefix |

### 6.2 라우팅(웹 요청 처리)

| 데코레이터 | 용도 |
|---|---|
| `@Get()` / `@Post()` / `@Patch()` / `@Put()` / `@Delete()` | HTTP 메서드 매핑 |
| `@Param('id')` | 경로 변수 추출 (`/posts/:id`) |
| `@Query('page')` | 쿼리 스트링 추출 (`?page=1`) |
| `@Body()` | 요청 바디 추출 (주로 DTO 클래스와 함께) |
| `@Headers('authorization')` | 요청 헤더 추출 |

### 6.3 DI 관련

| 데코레이터 | 용도 |
|---|---|
| 생성자 파라미터 타입 | 기본적인 DI (타입 기준 자동 매칭) |
| `@Inject(TOKEN)` | 토큰(문자열/심볼) 기반 커스텀 프로바이더 주입 |
| `@InjectRepository(Entity)` | TypeORM Repository 주입 (`study4`) |

### 6.4 검증(Validation) 관련 — `study3`

| 데코레이터 | 용도 |
|---|---|
| `@IsString()`, `@IsInt()`, `@IsEmail()`, `@MinLength()` 등 | class-validator의 DTO 필드 검증 규칙 |
| `@IsOptional()` | 선택적 필드 (Update DTO에서 자주 사용) |

### 6.5 TypeORM 엔티티 관련 — `study4`, `study5`

| 데코레이터 | 용도 |
|---|---|
| `@Entity()` | DB 테이블에 매핑되는 클래스 |
| `@PrimaryGeneratedColumn()` | 자동 증가 PK |
| `@Column()` | 일반 컬럼 |
| `@ManyToOne()` / `@OneToMany()` | 관계 매핑 |

## 7. 설정 파일 & 환경변수

- Spring Boot의 `application.yml`, FastAPI의 `.env`+`pydantic-settings`에 대응하는 것이 `.env` + `@nestjs/config`의 `ConfigModule`입니다 (`study10`에서 다룸).
- 개발 초반에는 포트 번호 등을 `main.ts`에 하드코딩해도 되지만, DB 접속 정보나 JWT 시크릿처럼 민감한 값은 `.env` 파일로 분리하고 `.gitignore`에 포함시킵니다.

## 8. 패키지 매니저 & CLI

| Spring Boot | FastAPI | NestJS |
|---|---|---|
| Gradle/Maven (`build.gradle`) | pip + `requirements.txt` | npm/yarn + `package.json` |
| Spring Initializr | `pip install fastapi` 후 직접 구성 | **Nest CLI** (`nest new`, `nest generate`) |
| `./gradlew bootRun` | `uvicorn main:app --reload` | `npm run start:dev` |

- Nest CLI는 Spring Initializr처럼 프로젝트 뼈대를 만들어줄 뿐 아니라, `nest generate module/controller/service` 명령으로 계층 구조 파일까지 자동 생성해줍니다. 실제 사용법은 `study1.md`에서 다룹니다.

## 9. 내장 서버

- Spring Boot가 내장 톰캣(Tomcat)을 포함하듯, NestJS는 기본적으로 **Express**를 내장 HTTP 서버로 사용합니다(`@nestjs/platform-express`). 성능이 중요하면 `@nestjs/platform-fastify`로 교체할 수도 있지만, 이 저장소에서는 기본값인 Express 어댑터를 사용합니다.
- 즉 `npm run start:dev`를 실행하면 내부적으로 Express 앱이 뜨고, Nest가 그 위에 라우팅/DI를 관리하는 구조입니다.

## 10. REST API 기본 개념 (복습)

Spring Boot/FastAPI에서 이미 익힌 내용과 동일합니다.

| 메서드 | 용도 | 멱등성 |
|---|---|---|
| GET | 조회 | O |
| POST | 생성 | X |
| PUT | 전체 수정(교체) | O |
| PATCH | 부분 수정 | X (일반적으로) |
| DELETE | 삭제 | O |

### 자주 쓰는 HTTP 상태 코드

| 코드 | 의미 |
|---|---|
| 200 OK | 성공 (조회/수정) |
| 201 Created | 생성 성공 |
| 204 No Content | 성공했지만 응답 본문 없음(삭제 등) |
| 400 Bad Request | 요청 값 검증 실패 |
| 401 Unauthorized | 인증 실패(로그인 필요) |
| 403 Forbidden | 인가 실패(권한 없음) |
| 404 Not Found | 리소스 없음 |
| 500 Internal Server Error | 서버 내부 오류 |

## 11. 용어 사전 (Glossary)

| 용어 | 설명 |
|---|---|
| Module | 관련된 컨트롤러/프로바이더를 묶는 단위 (`@Module`) |
| Provider | DI 컨테이너가 관리하는 클래스(서비스, 리포지토리 등)의 총칭 |
| Controller | HTTP 요청을 받아 라우팅하는 클래스 |
| DTO (Data Transfer Object) | 요청/응답 데이터의 형태를 정의하는 클래스 |
| Guard | 인증/인가 통과 여부(boolean)를 판단하는 컴포넌트 |
| Interceptor | 요청 전/후를 가로채 부가 로직(로깅, 응답 변형 등)을 수행하는 컴포넌트 |
| Pipe | 입력값을 검증하거나 변환하는 컴포넌트 |
| Exception Filter | 예외를 잡아 일관된 에러 응답으로 변환하는 컴포넌트 |
| Decorator | `@`로 시작하는 TypeScript 메타데이터 어노테이션. Nest 설계의 핵심 도구 |
| IoC Container | 프로바이더의 생성/생명주기를 관리하는 Nest 내부 컨테이너 |

## 12. 다음 학습 방향 제안

- `study1.md`에서 Node/npm 환경을 점검하고, Nest CLI로 실제 프로젝트(`demo/`)를 생성한 뒤 첫 컨트롤러를 실습합니다.
- 이후 게시판(Posts) 도메인을 축으로 in-memory → DTO 검증 → DB(TypeORM) → 회원/인증(JWT) → 인터셉터/예외 처리 → 페이지네이션/파일 업로드 → 테스트/Swagger 순으로 `Spring_Boot`/`FastAPI`와 같은 결을 따라가며 실습합니다.
