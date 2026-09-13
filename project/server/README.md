# server — 게시판 백엔드 (NestJS + Prisma)

`studyFinal.md`의 최종 프로젝트 중 백엔드입니다. 실행 방법은 [../README.md](../README.md)를 참고하세요.

- `prisma/schema.prisma`: DB 스키마 (User, Post)
- `src/prisma/`: 전역 `PrismaService` (모든 feature 모듈에서 주입받아 사용)
- `src/modules/`: `auth`, `users`, `posts` feature-module (각자 controller/service/dto를 자체 폴더에 보유)
- `src/common/`: 응답 형식을 통일하는 인터셉터/예외 필터
- API 문서(Swagger UI): 서버 실행 후 `http://localhost:4000/api-docs`
