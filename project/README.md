# studyFinal 최종 프로젝트

`demo/`(study1~study10)에서 익힌 개념을 응용하되, **구조를 다르게** 해서 처음부터 다시 설계한 게시판 + 인증 프로젝트입니다. 자세한 설명은 [../studyFinal.md](../studyFinal.md)를 참고하세요.

| | demo/ | project/ |
|---|---|---|
| ORM | TypeORM | **Prisma** |
| 구조 | 계층별 평면 폴더 (`src/posts`, `src/users`, ...) | **feature-module** (`src/modules/posts`, `src/modules/users`, ...) + `src/prisma`(공유 인프라) |
| 인가 | 로그인 여부만 확인 | 로그인 + **작성자 본인 확인**(소유권 검사) |
| 프론트엔드 | 없음 (curl로만 검증) | **React(Vite)** |

## 실행 방법

### 1. 서버 (NestJS + Prisma)

```powershell
cd server
npm install
copy .env.example .env
npx prisma db push   # SQLite DB 생성 + Prisma Client 생성
npm run start:dev
```

- API: `http://localhost:4000`
- Swagger 문서: `http://localhost:4000/api-docs`

### 2. 클라이언트 (React + Vite)

```powershell
cd client
npm install
copy .env.example .env
npm run dev
```

- 브라우저: `http://localhost:5173`

서버와 클라이언트를 각각 별도 터미널에서 동시에 띄워야 합니다.
