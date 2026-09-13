# Study 6 — Guard & JWT 인증 (고급 기술 구현 1)

여기서부터는 Notion 학습 목표의 "고급 기술 구현" 구간입니다. `study0`에서 예고했던 **Guard**를 실제로 만들고, 로그인 API + JWT로 "누가 요청했는지"를 판별해 게시글 작성 API를 보호합니다.

## 1. 패키지 설치

```powershell
npm install @nestjs/passport @nestjs/jwt passport passport-jwt
npm install -D @types/passport-jwt
```

| 패키지 | 역할 |
|---|---|
| `passport` | Node.js 진영의 표준 인증 미들웨어 (전략(Strategy) 패턴) |
| `passport-jwt` | JWT를 검증하는 passport 전략 |
| `@nestjs/passport` | passport를 Nest의 Guard 시스템에 연결하는 어댑터 |
| `@nestjs/jwt` | JWT 토큰 생성/검증 유틸(`JwtService`) |

Spring Security + `io.jsonwebtoken(jjwt)` 조합과 목적이 같습니다.

## 2. JWT 시크릿 (임시)

```typescript
// src/auth/jwt.constants.ts
// 개발용 기본값. study10에서 ConfigModule + .env로 옮겨 하드코딩을 제거한다.
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
```

지금은 상수 파일로 간단히 처리하고, `study10`에서 `.env` + `ConfigModule`로 정식 이관합니다.

## 3. JwtStrategy — 토큰 검증 전략

```typescript
// src/auth/jwt.strategy.ts
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_SECRET } from './jwt.constants.js';

export interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // "Authorization: Bearer <token>"
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  // 서명 검증 성공 후 호출됨. 반환값이 request.user에 그대로 들어간다.
  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email };
  }
}
```

- `PassportStrategy(Strategy)`로 passport의 `Strategy` 클래스를 Nest 프로바이더로 감쌉니다.
- `validate()`의 반환값이 이후 `request.user`가 됩니다. 여기서는 DB를 다시 조회하지 않고 토큰 payload(`sub`, `email`)만 그대로 사용합니다(토큰 자체가 이미 서명 검증을 통과했으므로 신뢰 가능).

## 4. AuthService — 로그인 로직

```typescript
// src/auth/auth.service.ts
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<SafeUser> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('이메일 또는 비밀번호가 올바르지 않습니다.');

    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  login(user: SafeUser): { accessToken: string } {
    const payload = { sub: user.id, email: user.email };
    return { accessToken: this.jwtService.sign(payload) };
  }
}
```

- `study5`에서 만들어둔 `findByEmailWithPassword`(password 컬럼까지 명시적으로 조회)를 여기서 처음 사용합니다.
- 이메일이 없을 때와 비밀번호가 틀렸을 때 **같은 메시지**(`이메일 또는 비밀번호가 올바르지 않습니다`)로 응답합니다. "이메일은 맞는데 비밀번호가 틀렸다"는 것을 공격자가 구분하지 못하게 하는 보안 관례입니다.
- `sub`(subject)는 JWT 표준 클레임 이름으로, 보통 사용자 식별자를 넣습니다.

## 5. AuthController — 로그인 엔드포인트

```typescript
// src/auth/auth.controller.ts
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.authService.validateUser(dto.email, dto.password);
    return this.authService.login(user);
  }
}
```

## 6. AuthModule — 조립

```typescript
// src/auth/auth.module.ts
@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({ secret: JWT_SECRET, signOptions: { expiresIn: '1h' } }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
```

`JwtStrategy`가 프로바이더로 등록되어 인스턴스화되는 순간, passport 내부적으로 `'jwt'`라는 이름의 전략으로 전역 등록됩니다. 덕분에 다른 모듈(`PostsModule`)의 컨트롤러에서도 `AuthGuard('jwt')`를 바로 쓸 수 있습니다.

## 7. Guard로 라우트 보호하기

```typescript
// posts.controller.ts (일부)
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface.js';

// 로그인(JWT)한 사용자만 글을 작성할 수 있음
@UseGuards(AuthGuard('jwt'))
@HttpPost()
create(@Body() dto: CreatePostDto, @Req() req: AuthenticatedRequest): Promise<Post> {
  return this.postsService.create(dto, req.user.id);
}
```

```typescript
// src/auth/authenticated-request.interface.ts
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: { id: number; email: string };
}
```

- `@UseGuards(AuthGuard('jwt'))`가 붙은 라우트는 요청이 컨트롤러 핸들러에 도달하기 **전에** `JwtStrategy`로 토큰을 검증합니다. 토큰이 없거나 유효하지 않으면 핸들러 코드는 아예 실행되지 않고 자동으로 `401 Unauthorized`가 응답됩니다 — `study0`에서 그린 파이프라인의 **Guard 단계**가 바로 이것입니다.
- `study5`에서 요청 바디로 받던 `authorId`가 이제 완전히 사라지고, `req.user.id`(토큰에서 검증된 값)로 대체되었습니다. 클라이언트가 "나는 다른 사람인 척" 임의의 `authorId`를 보낼 수 있었던 허점이 이제 막혔습니다.

### CreatePostDto 변화

```typescript
export class CreatePostDto {
  @IsString() @IsNotEmpty() @MaxLength(100) title: string;
  @IsString() @MinLength(1) content: string;
  // authorId는 더 이상 요청 바디로 받지 않는다 — 로그인한 사용자(JWT)로 자동 지정된다.
}
```

`authorId`가 사라지면서 `UpdatePostDto`도 `OmitType` 없이 `PartialType(CreatePostDto)` 한 줄로 단순해졌습니다.

## 8. 테스트해보기 (실제 실행 결과)

```bash
# 회원가입
$ curl -s -X POST http://localhost:3000/users -d '{"email":"bob@example.com","password":"password123"}' -H "Content-Type: application/json"
{"id":1,"email":"bob@example.com"}

# 틀린 비밀번호로 로그인 → 401
$ curl -s -X POST http://localhost:3000/auth/login -d '{"email":"bob@example.com","password":"wrong"}' -H "Content-Type: application/json"
{"message":"이메일 또는 비밀번호가 올바르지 않습니다.","error":"Unauthorized","statusCode":401}

# 올바른 로그인 → JWT 발급
$ curl -s -X POST http://localhost:3000/auth/login -d '{"email":"bob@example.com","password":"password123"}' -H "Content-Type: application/json"
{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...."}

# 토큰 없이 글 작성 시도 → 401
$ curl -s -X POST http://localhost:3000/posts -d '{"title":"no auth","content":"x"}' -H "Content-Type: application/json"
{"message":"Unauthorized","statusCode":401}

# 토큰과 함께 글 작성 → 성공, author가 로그인한 사용자로 자동 지정됨
$ curl -s -X POST http://localhost:3000/posts \
    -H "Content-Type: application/json" -H "Authorization: Bearer <토큰>" \
    -d '{"title":"authed post","content":"hello jwt"}'
{"id":1,"title":"authed post","content":"hello jwt","createdAt":"...","author":{"id":1,"email":"bob@example.com"}}
```

의도한 대로: 인증 없이는 글을 못 쓰고, 로그인한 사용자의 정보로 작성자가 자동 지정됩니다.

## 9. 정리

- `passport-jwt` 전략을 만들어 `Authorization: Bearer <token>` 헤더를 검증했다.
- `AuthService`로 로그인 시 비밀번호를 `bcrypt.compare`로 검증하고 JWT를 발급했다.
- `@UseGuards(AuthGuard('jwt'))`로 특정 라우트만 선택적으로 보호하는, `study0`에서 배운 Guard 단계를 실전에 적용했다.
- 클라이언트가 직접 지정하던 `authorId`를 없애고, 인증된 사용자 정보(`req.user`)로 대체해 보안 허점을 제거했다.

## 10. 다음 단계

`study7.md`에서는 `req.user`를 매번 직접 꺼내 쓰는 대신, `@CurrentUser()`라는 커스텀 파라미터 데코레이터로 깔끔하게 감싸고, 응답 형식을 통일하는 인터셉터를 만들어봅니다.
