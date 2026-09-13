# Study 4 — TypeORM 연동 (in-memory → DB)

지금까지는 서버를 재시작하면 게시글이 전부 사라졌습니다. 이번 단계에서는 **TypeORM**을 붙여서 SQLite 파일 DB에 실제로 저장되도록 바꿉니다. Notion 학습 목표의 "TypeORM 또는 Prisma" 중 `demo/`에서는 TypeORM을, 최종 프로젝트(`studyFinal`)에서는 Prisma를 사용해 두 방식을 비교해볼 예정입니다.

## 1. 패키지 설치

```powershell
npm install @nestjs/typeorm typeorm better-sqlite3
```

- `typeorm`: ORM 본체 (엔티티, Repository, 쿼리빌더 등)
- `@nestjs/typeorm`: TypeORM을 Nest의 모듈/DI 시스템에 통합해주는 어댑터 (`TypeOrmModule`, `@InjectRepository`)
- `better-sqlite3`: SQLite 드라이버. Windows에서도 미리 빌드된 바이너리를 받아 별도 컴파일 도구 없이 설치됩니다.

Spring Boot의 `spring-boot-starter-data-jpa` + `hibernate-community-dialects`(SQLite), FastAPI의 SQLAlchemy와 대응합니다.

## 2. 엔티티 정의 (`post.entity.ts`)

`study2`의 `Post` 인터페이스를 TypeORM 엔티티 클래스로 바꿉니다.

```typescript
// src/posts/post.entity.ts
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  title: string;

  @Column('text')
  content: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

| 데코레이터 | 의미 | Spring JPA 대응 |
|---|---|---|
| `@Entity()` | 이 클래스가 DB 테이블에 매핑됨 | `@Entity` |
| `@PrimaryGeneratedColumn()` | 자동 증가 PK | `@Id @GeneratedValue` |
| `@Column()` | 일반 컬럼 (옵션으로 길이/타입 지정) | `@Column` |
| `@CreateDateColumn()` | 레코드 생성 시각을 자동 기록 | `@CreationTimestamp` |

인터페이스와 달리 **클래스**이므로 런타임에 실제로 존재하며, `@InjectRepository(Post)`처럼 값으로도 사용할 수 있습니다.

## 3. 루트 모듈에 DB 연결 설정 (`app.module.ts`)

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './posts/post.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'data.sqlite',
      entities: [Post],
      synchronize: true, // 개발 단계 전용: 엔티티 변경을 자동으로 테이블에 반영
    }),
    HelloModule,
    PostsModule,
  ],
  // ...
})
export class AppModule {}
```

- `synchronize: true`는 엔티티 클래스를 기준으로 테이블 스키마를 자동 생성/변경해줘서 개발 초기에는 편하지만, **운영 환경에서는 절대 쓰지 않습니다** (의도치 않은 컬럼 삭제 등 데이터 손실 위험). 실제 서비스에서는 TypeORM 마이그레이션 기능을 사용합니다.
- Spring Boot의 `spring.jpa.hibernate.ddl-auto=update`와 같은 성격의 개발용 편의 옵션입니다.

## 4. 기능 모듈에서 Repository 등록 (`posts.module.ts`)

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Post])],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
```

`forRoot`는 앱 전체의 DB 연결 하나를 설정하고, `forFeature([Post])`는 "이 모듈에서 `Post` 엔티티의 Repository를 쓰겠다"고 선언해 `@InjectRepository(Post)`로 주입받을 수 있게 해줍니다.

## 5. 서비스 — 배열 대신 Repository 사용

```typescript
// src/posts/posts.service.ts
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post } from './post.entity.js';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
  ) {}

  findAll(): Promise<Post[]> {
    return this.postsRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<Post> {
    const post = await this.postsRepository.findOneBy({ id });
    if (!post) throw new NotFoundException(`Post #${id} not found`);
    return post;
  }

  create(dto: CreatePostDto): Promise<Post> {
    const post = this.postsRepository.create(dto); // 엔티티 인스턴스 생성 (아직 저장 전)
    return this.postsRepository.save(post);         // INSERT 실행
  }

  async update(id: number, dto: UpdatePostDto): Promise<Post> {
    const post = await this.findOne(id);
    Object.assign(post, dto); // dto에 있는 필드만 덮어씀
    return this.postsRepository.save(post); // UPDATE 실행
  }

  async remove(id: number): Promise<void> {
    const result = await this.postsRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Post #${id} not found`);
  }
}
```

| Repository 메서드 | 역할 |
|---|---|
| `find(options)` | 목록 조회 (SELECT) |
| `findOneBy({ id })` | 조건 하나로 단건 조회 |
| `create(dto)` | **DB에 저장하지 않고** 엔티티 인스턴스만 생성 (기본값 적용 등) |
| `save(entity)` | INSERT 또는 UPDATE (PK가 없으면 INSERT, 있으면 UPDATE) |
| `delete(id)` | DELETE, 영향받은 행 수(`affected`)로 존재 여부 확인 가능 |

모든 메서드가 **비동기(Promise)**로 바뀌었다는 점이 in-memory 버전과의 가장 큰 차이입니다. 컨트롤러도 이에 맞춰 반환 타입을 `Promise<Post>` 등으로 수정합니다(내부 로직은 `return this.postsService.xxx(...)`로 그대로 위임하면 되므로 변경이 크지 않습니다).

## 6. 빌드 & 실행

```powershell
npm run build
npm run start
```

`data.sqlite` 파일이 `demo/` 폴더에 자동 생성됩니다.

## 7. 테스트해보기 (실제 실행 결과 — 재시작 후 데이터 유지 확인)

```bash
# 1차 실행: 게시글 생성
$ curl -s -X POST http://localhost:3000/posts -d '{"title":"typeorm post","content":"stored in sqlite"}' -H "Content-Type: application/json"
{"id":1,"title":"typeorm post","content":"stored in sqlite","createdAt":"2026-09-13T19:06:04.000Z"}

$ ls -la data.sqlite
-rw-r--r-- 1 User 197121 12288 ... data.sqlite

# 서버를 완전히 종료 후 재시작
$ npm run start

# 2차 실행: 재시작 후에도 데이터가 남아있는지 확인
$ curl -s http://localhost:3000/posts
[{"id":1,"title":"typeorm post","content":"stored in sqlite","createdAt":"2026-09-13T19:06:04.000Z"}]
```

in-memory 버전이었다면 재시작 후 빈 배열이 나왔겠지만, `data.sqlite` 파일에 저장된 덕분에 데이터가 그대로 유지됩니다.

## 8. 정리

- `@Entity`/`@Column` 등으로 `Post`를 TypeORM 엔티티로 정의했다.
- `TypeOrmModule.forRoot`(전역 DB 연결)와 `forFeature`(모듈별 Repository 등록)의 역할 차이를 이해했다.
- `Repository<Post>`의 `find`/`findOneBy`/`create`/`save`/`delete`로 in-memory 배열 로직을 DB 기반으로 전환했다.
- 서버 재시작 후에도 데이터가 유지되는 것을 직접 확인했다.

## 9. 다음 단계

`study5.md`에서는 `User`(회원) 엔티티를 추가하고, `Post`와 `@ManyToOne`/`@OneToMany` 관계를 맺어 "누가 쓴 글인지"를 표현합니다. 비밀번호는 bcrypt로 해시하여 저장합니다.
