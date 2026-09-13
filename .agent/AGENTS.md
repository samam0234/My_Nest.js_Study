# 에이전트 공통 가이드라인 (인수인계 문서)

이 문서는 이 저장소에서 작업하는 모든 AI 에이전트(Claude, Grok, Codex 등)가 **공통으로** 지켜야 할 규칙을 정리한 인수인계 문서입니다.
`.claude/`, `.grok/`, `.codex/` 폴더의 에이전트별 문서는 이 문서를 기본으로 삼고, 도구별 특이사항만 추가로 기술합니다.

## 1. 저장소 개요

- TypeScript 기반 [NestJS](https://nestjs.com/) 학습 기록 저장소입니다. NestJS는 데코레이터 + 의존성 주입(DI)을 중심으로 Angular와 유사한 구조를 갖춘, Node.js(Express/Fastify 기반) 서버 프레임워크입니다.
- 같은 워크스페이스의 `Spring_Boot/`, `python/FastApi/`와 사실상 동일한 커리큘럼(계층 분리, DI, DTO 검증, ORM, JWT 인증, 예외 처리, 페이지네이션, 테스트)을 NestJS 방식으로 반복합니다. 세 프레임워크를 나란히 비교하며 보면 이해가 빠릅니다.
- 공통 스펙: **게시판(Posts) CRUD + 회원/인증**을 처음부터 끝까지 사용합니다. in-memory 배열 → TypeORM(SQLite, DB) → JWT 인증 순으로 점진적으로 발전시킵니다.
- 학습 목표와 전체 로드맵은 [Notion: Nest.js 학습 목표](https://app.notion.com/p/Nest-js-3d6d7dec5e2e81b58015dad9645cbb80) 페이지를 기준으로 삼습니다.
- `study0.md`, `study1.md`, `study2.md`, ... 순서로 학습 진도가 진행됩니다. (숫자가 클수록 최신 진도)
  - `study0`: 실습 없이 이론만 (NestJS 기초이론 — 데코레이터/IoC·DI, 모듈 구조, 요청 처리 파이프라인, Spring Boot와의 비교 등 선행 지식)
  - `study1` ~ `study5`: NestJS 기본기 실습 (CLI/설치·실행, 컨트롤러·서비스로 게시판 CRUD, DTO+class-validator, TypeORM 연동, 회원 엔티티·관계 매핑)
  - `study6` ~ `study10`: 고급 기술 구현 (Guard+JWT 인증, 커스텀 데코레이터·인터셉터, 예외 필터·전역 에러 처리, 페이지네이션·파일 업로드, 테스트 코드(Jest)·Swagger 문서화)
  - `studyFinal`: 지금까지 배운 것을 응용하되 **구조를 다르게** 설계한 최종 미니 프로젝트 (TypeORM 대신 Prisma, feature-module 구조, React 프론트엔드 연동)
- `demo/`: study1~study10 문서 내용을 단계별로 하나씩 실습하며 누적되는 NestJS 프로젝트입니다. 커밋 히스토리를 따라가면 배운 순서 그대로 코드가 진화하는 것을 볼 수 있습니다.
- `project/`: `studyFinal.md`에 대응하는, `demo/`에서 익힌 개념을 전부 합쳐 처음부터 다른 구조(Prisma + feature-module + React)로 완성한 독립된 미니 프로젝트입니다.

## 2. 작업 전 확인 사항

- 새 작업을 시작하기 전에 `studyN.md` 파일들을 번호 순서대로 확인하여 지금까지의 학습 진도와 맥락을 파악합니다.
- `demo/`, `project/` 프로젝트 코드가 study 문서 설명과 어긋나지 않는지 확인합니다.
- 새 studyN.md 문서를 추가/수정할 때는 이전 study 문서와 이어지는 흐름을 유지합니다.
- NestJS 프로젝트(`demo/`, `project/`)는 각자 독립된 `node_modules`와 `package.json`을 가집니다. 둘 다 `.gitignore`에 의해 커밋 대상에서 제외됩니다 (SQLite DB 파일, `dist/`, `.env`도 마찬가지).
- 엔티티(TypeORM/Prisma 스키마)를 변경했다면 실제로 테이블이 재생성/마이그레이션되는지 확인하고, 가능하면 `npm run start:dev`로 서버를 띄워 `curl`/Swagger UI로 실제 동작을 확인한 뒤 커밋합니다.
- `nest start --watch` 등 워치 모드 프로세스를 백그라운드로 띄운 채로는 해당 프로세스가 열어둔 파일을 지우거나 옮기기 어려울 수 있습니다(Windows 파일 잠금). 파일 구조를 크게 바꿀 때는 프로세스를 먼저 종료합니다.

## 3. 커밋 규칙

- 커밋 관련 규칙은 [COMMIT_GUIDE.md](./COMMIT_GUIDE.md) 문서를 따릅니다.

## 4. 언어 규칙

- 문서 내용, 커밋 설명: 한글
- 커밋 타입(prefix), 코드, 식별자, 파일명: 영어

## 5. 에이전트별 문서

- Claude: [.claude/CLAUDE.md](../.claude/CLAUDE.md)
- Grok: [.grok/GROK.md](../.grok/GROK.md)
- Codex: [.codex/AGENTS.md](../.codex/AGENTS.md)

## 6. 인수인계 원칙

- 작업을 마칠 때는 다음 에이전트/세션이 이어받을 수 있도록 변경 내용과 다음 단계 후보를 간단히 남깁니다.
- 불확실한 결정은 추측하지 말고 study 문서 내용과 [Notion 학습 목표 페이지](https://app.notion.com/p/Nest-js-3d6d7dec5e2e81b58015dad9645cbb80)를 근거로 삼습니다.
- 이 문서나 커밋 가이드에 없는 새로운 컨벤션이 필요해지면, 추측해서 각자 다르게 처리하지 말고 이 문서를 먼저 갱신합니다.
