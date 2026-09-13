# NestJS 학습 저장소

NestJS의 기본 개념(모듈/컨트롤러/프로바이더)부터 DTO 검증, TypeORM, Guard 기반 JWT 인증, 인터셉터/예외 필터, 페이지네이션, 테스트 코드·Swagger 문서화, 그리고 Prisma+React로 재구성한 최종 프로젝트까지 단계별로 실습하며 정리하는 개인 학습 저장소입니다.

- `studyN.md` 문서에 개념 정리와 실습 과정, 실제로 실행해서 확인한 결과를 순서대로 기록합니다.
- `demo/`는 각 study에서 다루는 내용을 실제로 구현한 NestJS 프로젝트입니다. study가 진행될수록 `demo/` 코드도 함께 발전합니다.
- `project/`는 `studyFinal.md`에 대응하는, `demo/`와는 다른 구조(Prisma + feature-module + React)로 처음부터 다시 설계한 완결된 미니 프로젝트입니다.

## 기술 스택

### demo/ (study1 ~ study10)
- TypeScript, NestJS 10.x
- TypeORM + SQLite (파일 기반 DB)
- class-validator / class-transformer (DTO 검증)
- Passport + `@nestjs/jwt` (JWT 인증), bcrypt (비밀번호 해시)
- `@nestjs/swagger` (API 문서 자동화)
- Jest, Supertest (유닛/e2e 테스트)

### project/ (studyFinal)
- TypeScript, NestJS 10.x (feature-module 구조)
- Prisma + SQLite (demo와 다른 ORM으로 비교 학습)
- React(Vite) 프론트엔드, `fetch` 기반 API 연동

## 프로젝트 실행

```powershell
cd demo
npm install
npm run start:dev
```

기본 포트는 `3000`이며, 실행 후 아래와 같이 확인할 수 있습니다.

- REST API: `http://localhost:3000`
- API 문서(Swagger UI): `http://localhost:3000/api-docs` (study10 이후)
- DB 파일: `demo/data.sqlite` (서버를 껐다 켜도 데이터 유지 — 초기화하려면 파일 삭제 후 재실행)

`project/`는 백엔드(`project/server`)와 프론트엔드(`project/client`)로 나뉘며, 각 폴더의 `README`/`studyFinal.md`를 참고해 각자 실행합니다.

## 테스트 실행

```powershell
cd demo
npm run test
npm run test:e2e
```

## 학습 문서 목차

| 문서 | 주제 | 핵심 내용 |
|---|---|---|
| [study0.md](study0.md) | NestJS 기초 개념 | Node/Express 위의 NestJS, IoC/DI, 데코레이터, 모듈 구조, 요청 처리 파이프라인, Spring Boot·FastAPI와 비교, 용어 사전 |
| [study1.md](study1.md) | 설치 & Hello World | Nest CLI로 프로젝트 생성, 주요 CLI 명령어, `AppController`로 `@Get`/`@Param`/`@Query` 실습, 서버 실행 및 curl 검증 |
| [study2.md](study2.md) | 게시판 CRUD (in-memory) | `PostsModule`/`PostsController`/`PostsService`로 배열 기반 CRUD REST API 구현 |
| [study3.md](study3.md) | DTO & 파이프 & 검증 | `CreatePostDto`/`UpdatePostDto`, class-validator, 전역 `ValidationPipe`, `PartialType` |
| [study4.md](study4.md) | TypeORM 연동 | `Post` 엔티티, `TypeOrmModule`, Repository 패턴으로 in-memory → DB 전환 |
| [study5.md](study5.md) | 회원 & 관계 매핑 | `User` 엔티티, `@OneToMany`/`@ManyToOne`으로 작성자-게시글 관계, bcrypt 비밀번호 해시, 회원가입 API |
| [study6.md](study6.md) | Guard & JWT 인증 | `AuthModule`, 로그인 API, `JwtStrategy`, `AuthGuard('jwt')`로 보호된 라우트 |
| [study7.md](study7.md) | 커스텀 데코레이터 & 인터셉터 | `@CurrentUser()` 파라미터 데코레이터, `TransformInterceptor`/`LoggingInterceptor`, 요청 처리 순서 재정리 |
| [study8.md](study8.md) | 예외 필터 & 전역 에러 처리 | `HttpException`, 커스텀 `ExceptionFilter`, 전역 필터 등록, 에러 응답 포맷 통일 |
| [study9.md](study9.md) | 페이지네이션 & 파일 업로드 | `skip`/`take` 페이지네이션, `FileInterceptor`로 이미지 업로드, 경로 조작 방어 |
| [study10.md](study10.md) | 테스트 & Swagger | Jest 유닛 테스트, Supertest e2e 테스트, `@nestjs/swagger` 문서 자동화, `ConfigModule`로 환경변수 관리 |
| [studyFinal.md](studyFinal.md) | 종합 프로젝트 (구조 다르게) | Prisma + feature-module 구조로 게시판+인증 API 재설계, React 프론트엔드 연동 |

## 저장소 구조

```
nest.js/
├─ study0.md ~ studyFinal.md   ← 학습 문서 (개념 + 실습 + 실제 실행 결과)
├─ demo/                       ← NestJS 실습 프로젝트 (study1~study10 누적)
├─ project/                    ← studyFinal 최종 프로젝트 (Prisma + React, 별도 구조)
└─ .agent/                     ← 여러 AI 에이전트가 이 저장소에서 작업할 때 따르는 공통 가이드라인
```
