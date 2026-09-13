# Study 10 — 테스트 & Swagger & 설정 관리 (고급 기술 구현 5)

`demo/` 프로젝트의 마지막 단계입니다. 하드코딩되어 있던 `JWT_SECRET`/DB 경로를 `.env` + `ConfigModule`로 정리하고, `@nestjs/swagger`로 API 문서를 자동화하고, 지금까지 만든 기능에 **유닛 테스트 + e2e 테스트**를 작성합니다.

## 1. 패키지 설치

```powershell
npm install @nestjs/config @nestjs/swagger
```

## 2. `.env` + ConfigModule

```bash
# demo/.env.example (실제 값은 .env에, .gitignore로 제외됨)
PORT=3000
JWT_SECRET=dev-secret-change-me
DB_PATH=data.sqlite
```

```typescript
// app.module.ts (일부)
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // .env를 읽어 전역 ConfigService로 노출
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'better-sqlite3',
        database: configService.get<string>('DB_PATH', 'data.sqlite'),
        entities: [Post, User],
        synchronize: true,
      }),
    }),
    // ...
  ],
})
export class AppModule {}
```

- `isGlobal: true`로 등록하면 다른 모듈에서 `ConfigModule`을 매번 `imports`하지 않고 `ConfigService`를 바로 주입받을 수 있습니다.
- `forRootAsync` + `useFactory`는 "다른 프로바이더(`ConfigService`)의 값을 사용해 설정을 만들어야 할 때" 쓰는 패턴입니다. `study4`의 `forRoot(...)`(고정값)와 비교해보면 차이가 뚜렷합니다.

### AuthModule / JwtStrategy도 ConfigService로 이관

```typescript
// auth.module.ts (일부)
JwtModule.registerAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET', 'dev-secret-change-me'),
    signOptions: { expiresIn: '1h' },
  }),
}),
```

```typescript
// jwt.strategy.ts (일부)
constructor(configService: ConfigService) {
  super({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret-change-me'),
  });
}
```

`study6`에서 만든 `jwt.constants.ts` 상수 파일은 이제 필요 없어져 삭제했습니다.

> **참고**: `PassportStrategy` 서브클래스에서는 `super()` 호출 전에 `this.configService`처럼 인스턴스 프로퍼티에 접근할 수 없습니다(자바스크립트 클래스 규칙상 `super()` 전에는 `this`를 못 씀). 대신 생성자 **파라미터** `configService`는 일반 변수라 `super()` 호출 안에서 바로 써도 됩니다. Nest 공식 문서도 이 패턴을 그대로 사용합니다.

### `main.ts`에서 포트 읽기

```typescript
const app = await NestFactory.create<NestExpressApplication>(AppModule);
const configService = app.get(ConfigService);
// ...
const port = configService.get<number>('PORT', 3000);
await app.listen(port);
```

## 3. Swagger — API 문서 자동화

```typescript
// main.ts (일부)
const swaggerConfig = new DocumentBuilder()
  .setTitle('Nest.js 게시판 API')
  .setDescription('study0~study10에서 단계별로 만든 게시판 + 인증 API 문서')
  .setVersion('1.0')
  .addBearerAuth() // Swagger UI에 "Authorize" 버튼(Bearer 토큰 입력) 추가
  .build();
const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
SwaggerModule.setup('api-docs', app, swaggerDocument);
```

컨트롤러에는 `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`, `@ApiConsumes` 등을 가볍게 붙여 문서를 보강합니다.

```typescript
@ApiTags('posts')
@Controller('posts')
export class PostsController {
  @ApiOperation({ summary: '게시글 목록 조회 (페이지네이션)' })
  @Get()
  findAll(...) { ... }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 작성 (로그인 필요)' })
  @UseGuards(AuthGuard('jwt'))
  @HttpPost()
  create(...) { ... }

  @ApiBearerAuth()
  @ApiOperation({ summary: '게시글 썸네일 이미지 업로드 (로그인 필요)' })
  @ApiConsumes('multipart/form-data')
  @UseGuards(AuthGuard('jwt'))
  @HttpPost(':id/thumbnail')
  // ...
}
```

서버 실행 후 `http://localhost:3000/api-docs`에서 Swagger UI로 모든 엔드포인트를 확인하고, 우측 상단 **Authorize** 버튼에 로그인으로 받은 토큰을 넣으면 보호된 라우트도 브라우저에서 바로 테스트할 수 있습니다.

## 4. 테스트 코드

`study1`에서 언급했듯 이 프로젝트(Nest CLI v12 기본 스캐폴드)는 **Vitest**를 테스트 러너로 사용합니다. `describe`/`it`/`expect`는 `vitest.config.ts`의 `globals: true` 설정 덕분에 전역으로 쓸 수 있지만, 이 저장소에서는 명시적으로 `import ... from 'vitest'`로 가져와 어떤 함수가 어디서 왔는지 분명히 밝힙니다.

### 유닛 테스트 — `PostsService`

```typescript
// src/posts/posts.service.spec.ts
describe('PostsService', () => {
  let service: PostsService;
  let repository: { find: ReturnType<typeof vi.fn>; /* ... */ };
  let usersService: { findEntityById: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repository = {
      find: vi.fn(), findAndCount: vi.fn(), findOne: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn(async (entity) => ({ id: 1, ...entity })),
      delete: vi.fn(),
    };
    usersService = { findEntityById: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getRepositoryToken(Post), useValue: repository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get(PostsService);
  });

  it('존재하지 않는 authorId면 NotFoundException을 던진다', async () => {
    usersService.findEntityById.mockResolvedValue(null);
    await expect(service.create({ title: 't', content: 'c' }, 999)).rejects.toThrow(NotFoundException);
  });
  // ...
});
```

- `getRepositoryToken(Post)`로 `@InjectRepository(Post)`가 주입받는 토큰과 동일한 토큰에 **가짜 객체(mock)**를 등록합니다. 진짜 DB 없이 서비스 로직만 순수하게 테스트할 수 있습니다.
- `UsersService`도 진짜 인스턴스 대신 `findEntityById`만 흉내 내는 목(mock) 객체로 대체했습니다. Spring의 `@MockBean`, FastAPI의 의존성 오버라이드와 같은 목적입니다.

### e2e 테스트 — 회원가입부터 게시글 작성까지

```typescript
// test/posts.e2e-spec.ts
beforeAll(async () => {
  process.env.DB_PATH = ':memory:'; // 테스트마다 완전히 격리된 인메모리 DB 사용
  process.env.JWT_SECRET = 'test-secret';

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication<NestExpressApplication>();
  // main.ts의 global 설정은 테스트 앱에 자동으로 적용되지 않으므로 동일하게 다시 등록해야 한다
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
});

it('회원가입 → 로그인 → 게시글 작성 → 목록 조회까지 전체 흐름이 동작한다', async () => {
  const server = app.getHttpServer();
  await request(server).post('/users').send({ email: 'e2e@example.com', password: 'password123' }).expect(201);

  const loginRes = await request(server).post('/auth/login')
    .send({ email: 'e2e@example.com', password: 'password123' }).expect(201);
  const accessToken = loginRes.body.data.accessToken;

  await request(server).post('/posts').set('Authorization', `Bearer ${accessToken}`)
    .send({ title: 'e2e post', content: 'hello' }).expect(201);

  const listRes = await request(server).get('/posts?page=1&limit=10').expect(200);
  expect(listRes.body.data.items).toHaveLength(1);
});
```

### ⚠️ 트러블슈팅: `main.ts`의 전역 설정은 테스트 앱에 자동 적용되지 않는다

처음 e2e 테스트를 작성할 때는 `useGlobalPipes`/`useGlobalInterceptors`/`useGlobalFilters`를 다시 등록하지 않았습니다. 그랬더니 응답이 `study7`/`study8`에서 봤던 `{data, timestamp}`/`{error, timestamp}` 형식으로 감싸지지 않고, `ValidationPipe`도 동작하지 않았습니다.

원인은 `main.ts`의 `bootstrap()` 함수는 **실제 서버를 띄울 때만** 실행되는 코드이고, e2e 테스트는 `Test.createTestingModule({ imports: [AppModule] }).compile()` → `moduleFixture.createNestApplication()`으로 **별도의 애플리케이션 인스턴스**를 만들기 때문입니다. `main.ts`에서 등록한 전역 파이프/인터셉터/필터는 이 테스트용 인스턴스에 자동으로 따라오지 않으므로, 실제 운영 환경과 동일하게 테스트하려면 테스트 셋업에서도 **똑같이 다시 등록**해야 합니다.

### 또 다른 트러블슈팅: 기본 생성된 `app.e2e-spec.ts`가 진짜 DB 파일을 만든다

Nest CLI가 처음 생성해준 `test/app.e2e-spec.ts`도 `AppModule` 전체를 부팅합니다. 그런데 이 파일은 `DB_PATH`를 오버라이드하지 않아서, e2e 테스트 스위트를 통째로 돌리면 `.env`의 기본값(`data.sqlite`)으로 실제 DB 파일이 생성되는 부작용이 있었습니다(반면 우리가 만든 `posts.e2e-spec.ts`만 단독으로 실행했을 때는 파일이 생기지 않는 것을 확인해 원인을 좁혔습니다). `app.e2e-spec.ts`의 `beforeEach`에도 `process.env.DB_PATH = ':memory:'`를 추가해 해결했습니다 — AppModule 전체를 부팅하는 e2e 테스트라면 어떤 파일이든 예외 없이 DB를 인메모리로 격리해야 한다는 교훈입니다.

## 5. 테스트 실행 (실제 실행 결과)

```bash
$ npm run test
 Test Files  2 passed (2)
      Tests  7 passed (7)

$ npm run test:e2e
 Test Files  2 passed (2)
      Tests  3 passed (3)
```

`data.sqlite` 파일이 테스트 실행 후에도 생성되지 않는 것을 확인해, e2e 테스트가 개발용 DB와 완전히 격리되어 있음을 검증했습니다.

## 6. 정리

- `.env` + `ConfigModule`로 `JWT_SECRET`, DB 경로, 포트를 코드 밖으로 분리했다 (`forRootAsync`/`registerAsync` 패턴).
- `@nestjs/swagger`로 `/api-docs`에 인증(Bearer) 포함 API 문서를 자동 생성했다.
- `getRepositoryToken`으로 Repository를 목(mock) 처리하는 유닛 테스트와, `supertest`로 실제 HTTP 요청을 보내는 e2e 테스트를 모두 작성했다.
- e2e 테스트에서는 `main.ts`의 전역 설정을 다시 등록해야 한다는 점과, DB를 `:memory:`로 격리하지 않으면 테스트가 실제 개발 DB 파일에 부작용을 남길 수 있다는 점을 실제로 겪고 해결했다.

## 7. demo 프로젝트 완주

`study1`의 Hello World부터 `study10`의 테스트/문서화까지, Notion 학습 목표에 있던 항목(모듈/컨트롤러/서비스, DTO+class-validator, TypeORM, Guard+JWT, 파이프/인터셉터/필터, 페이지네이션·예외 필터)을 전부 실습했습니다.

## 8. 다음 단계

`studyFinal.md`에서는 지금까지의 개념을 응용하되, **구조를 다르게** 해서 새 프로젝트(`project/`)를 만듭니다: TypeORM 대신 **Prisma**, 계층별 폴더 대신 **feature-module** 구조, 그리고 순수 curl 테스트 대신 **React 프론트엔드**를 붙여 브라우저에서 직접 동작을 확인합니다.
