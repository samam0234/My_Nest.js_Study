# Study 5 — 회원 엔티티 & 관계 매핑

게시판에 "누가 썼는지"가 있어야 진짜 게시판입니다. 이번 단계에서는 `User` 엔티티를 추가하고, `Post`와 1:N 관계를 맺습니다. 아직 로그인/JWT는 없으므로(그건 `study6`), 지금은 회원가입 + `authorId`를 직접 지정하는 방식으로 관계를 실습합니다.

## 1. 패키지 설치

```powershell
npm install bcrypt
npm install -D @types/bcrypt
```

비밀번호를 평문으로 저장하면 안 되므로 `bcrypt`로 해시합니다. Spring Security의 `BCryptPasswordEncoder`와 동일한 알고리즘/라이브러리 계열입니다.

## 2. User 엔티티

```typescript
// src/users/user.entity.ts
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Post } from '../posts/post.entity.js';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  // select: false → find()/findOneBy() 등으로 조회 시 기본적으로 password 컬럼을 가져오지 않음
  @Column({ select: false })
  password: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];
}
```

`@Column({ select: false })`가 이번 단계의 핵심입니다. 이 옵션을 켠 컬럼은 `find`/`findOneBy` 등 일반 조회에서 **자동으로 제외**되어, "실수로 API 응답에 비밀번호 해시가 섞여 나가는" 사고를 원천 차단합니다. 로그인 검증처럼 정말 password가 필요한 경우에만 아래처럼 명시적으로 요청합니다.

```typescript
// study6에서 로그인 시 사용할 예정
findByEmailWithPassword(email: string) {
  return this.usersRepository
    .createQueryBuilder('user')
    .addSelect('user.password')
    .where('user.email = :email', { email })
    .getOne();
}
```

## 3. Post 엔티티에 관계 추가

```typescript
// src/posts/post.entity.ts (일부)
import { ManyToOne } from 'typeorm';
import { User } from '../users/user.entity.js';

@Entity()
export class Post {
  // ...id, title, content, createdAt

  @ManyToOne(() => User, (user) => user.posts, { eager: false })
  author: User;
}
```

- `@ManyToOne(() => User, ...)`: "게시글 여러 개가 사용자 한 명에게 속한다." TypeORM이 자동으로 `authorId`라는 외래키(FK) 컬럼을 만들어줍니다.
- `@OneToMany(() => Post, (post) => post.author)`: `User` 쪽에서 반대 방향(자신이 쓴 글 목록)을 참조할 수 있게 함. 두 데코레이터의 화살표 함수 인자가 서로 짝을 이뤄야 합니다.
- `eager: false`(기본값)이므로, `User`를 조회해도 `posts`가 자동으로 딸려오지 않습니다. 필요할 때 `relations` 옵션으로 명시적으로 조인합니다. Spring JPA의 `FetchType.LAZY`/`EAGER`와 같은 개념입니다.

## 4. UsersService — 가입 + 비밀번호 보호

```typescript
// src/users/users.service.ts
export type SafeUser = Omit<User, 'password'>;

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly usersRepository: Repository<User>) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.usersRepository.findOneBy({ email: dto.email });
    if (existing) throw new ConflictException('이미 가입된 이메일입니다.');

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({ email: dto.email, password: hashedPassword });
    const saved = await this.usersRepository.save(user);

    // save()는 방금 해시된 password가 담긴 in-memory 객체를 그대로 돌려주므로
    // (select: false는 "조회" 시에만 적용됨) 응답 전에 명시적으로 제거해야 한다.
    const { password, ...safeUser } = saved;
    return safeUser;
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user; // password는 select:false라 애초에 undefined → JSON 응답에도 안 나감
  }
}
```

### ⚠️ `select: false`는 만능이 아니다

`select: false`는 **조회(SELECT)** 쿼리에만 적용됩니다. `create()`처럼 방금 해시한 비밀번호를 직접 엔티티에 담아 `save()`한 경우, `save()`가 반환하는 객체는 DB에서 다시 읽어온 것이 아니라 **메모리에 있던 그 객체 그대로**이므로 `password` 필드가 여전히 채워져 있습니다. 그래서 `create()`에서만 구조 분해(`const { password, ...safeUser } = saved`)로 명시적으로 제거해야 합니다. 반면 `findOne()`은 DB에서 새로 조회하므로 `select: false`가 정상 동작해 별도 처리가 필요 없습니다. 이런 미묘한 차이를 놓치면 회원가입 응답에만 비밀번호 해시가 노출되는 버그가 생길 수 있습니다.

## 5. Post 생성 시 작성자 연결

`study6`에서 JWT 인증이 들어오기 전까지는, 요청 바디에 `authorId`를 직접 받아 작성자를 지정합니다.

```typescript
// dto/create-post.dto.ts
export class CreatePostDto {
  @IsString() @IsNotEmpty() @MaxLength(100) title: string;
  @IsString() @MinLength(1) content: string;

  // study6에서 JWT 인증이 추가되면 이 필드는 사라지고, 로그인한 사용자로 자동 대체된다.
  @IsInt() authorId: number;
}
```

```typescript
// posts.service.ts (일부)
async create(dto: CreatePostDto): Promise<Post> {
  const author = await this.usersService.findEntityById(dto.authorId);
  if (!author) throw new NotFoundException(`User #${dto.authorId} not found`);

  const post = this.postsRepository.create({ title: dto.title, content: dto.content, author });
  return this.postsRepository.save(post);
}

findAll(): Promise<Post[]> {
  return this.postsRepository.find({ order: { id: 'ASC' }, relations: { author: true } });
}
```

`PostsService`가 `UsersService`를 생성자로 주입받으려면, `PostsModule`이 `UsersModule`을 `imports`하고 `UsersModule`은 `UsersService`를 `exports`해야 합니다 (모듈 간 프로바이더 공유 규칙).

```typescript
// users.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService], // 다른 모듈에서 주입받을 수 있도록 공개
})
export class UsersModule {}

// posts.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Post]), UsersModule],
  // ...
})
export class PostsModule {}
```

`UpdatePostDto`에서는 `authorId`를 수정 대상에서 제외하기 위해 `OmitType`을 함께 사용했습니다.

```typescript
// dto/update-post.dto.ts
import { OmitType, PartialType } from '@nestjs/mapped-types';

export class UpdatePostDto extends PartialType(OmitType(CreatePostDto, ['authorId'] as const)) {}
```

## 6. 테스트해보기 (실제 실행 결과)

```bash
# 회원가입 — 응답에 password가 없음
$ curl -s -X POST http://localhost:3000/users -d '{"email":"alice@example.com","password":"password123"}' -H "Content-Type: application/json"
{"id":1,"email":"alice@example.com"}

# 같은 이메일로 재가입 시도 → 409 Conflict
$ curl -s -X POST http://localhost:3000/users -d '{"email":"alice@example.com","password":"password123"}' -H "Content-Type: application/json"
{"message":"이미 가입된 이메일입니다.","error":"Conflict","statusCode":409}

# 회원 조회 — 역시 password 없음
$ curl -s http://localhost:3000/users/1
{"id":1,"email":"alice@example.com"}

# authorId로 게시글 작성 → author 정보(비밀번호 제외)가 함께 응답됨
$ curl -s -X POST http://localhost:3000/posts -d '{"title":"my first post","content":"hello","authorId":1}' -H "Content-Type: application/json"
{"id":1,"title":"my first post","content":"hello","createdAt":"...","author":{"id":1,"email":"alice@example.com"}}

# 존재하지 않는 authorId → 404
$ curl -s -X POST http://localhost:3000/posts -d '{"title":"t","content":"c","authorId":999}' -H "Content-Type: application/json"
{"message":"User #999 not found","error":"Not Found","statusCode":404}
```

`author` 관계가 정상적으로 로드되면서도, 어떤 응답에서도 비밀번호 해시가 노출되지 않는 것을 확인했습니다.

## 7. 정리

- `User` 엔티티와 `@Column({ select: false })`로 민감한 컬럼을 기본 조회에서 제외하는 패턴을 익혔다.
- `@ManyToOne`/`@OneToMany`로 게시글-작성자 1:N 관계를 매핑했다.
- `save()`가 반환하는 객체와 `find`류가 반환하는 객체의 `select: false` 적용 여부가 다르다는 실전 함정을 확인했다.
- 모듈 간 프로바이더 공유(`exports`/`imports`) 규칙을 실제로 적용했다.

## 8. 다음 단계

`study6.md`에서는 로그인 API와 JWT를 붙여, 지금처럼 `authorId`를 직접 보내는 대신 **로그인한 사용자**를 기준으로 게시글 작성자가 자동 지정되도록 바꿉니다. Guard로 보호된 라우트도 처음 만들어봅니다.
