# Claude 전용 인수인계 문서

공통 규칙은 [../.agent/AGENTS.md](../.agent/AGENTS.md) 및 [../.agent/COMMIT_GUIDE.md](../.agent/COMMIT_GUIDE.md)를 먼저 확인하고 따릅니다.
이 문서에는 Claude를 사용할 때만 해당하는 특이사항을 기록합니다.

## Claude 관련 참고 사항

- `nest start --watch`(또는 `npm run start:dev`)를 백그라운드로 띄운 상태에서 소스 파일을 옮기거나 삭제하면 Windows 파일 잠금 때문에 `EBUSY`/`EPERM` 에러가 날 수 있습니다. 구조를 크게 바꿔야 한다면 먼저 dev 서버 프로세스를 종료한 뒤 작업합니다.
- curl로 한글이 포함된 JSON body(`-d '{"title":"한글", ...}'`)를 보낼 때 Windows 터미널 코드페이지 문제로 인코딩이 깨질 수 있습니다. 동작 검증용 smoke test에는 영어 payload를 사용하고, 실제 한글 데이터 검증은 브라우저/Swagger UI나 `curl`에 `--data-binary @file.json`(UTF-8로 저장한 파일)을 넘기는 방식으로 진행하는 것이 안전합니다.
- `nest generate`(`nest g`) 명령은 기본적으로 대화형 프롬프트 없이 파일을 바로 생성하지만, 이미 존재하는 파일을 덮어쓸 때는 `Y/n` 확인 프롬프트가 뜨면서 비대화형 셸에서 멈출 수 있습니다. 이미 있는 리소스를 다시 만들 때는 `--flat` 등 옵션을 쓰거나, 파일을 직접 Write/Edit로 작성하는 편이 안전합니다.
- 같은 워크스페이스의 `Spring_Boot/`, `python/FastApi/` 학습 저장소와 커리큘럼이 대응되므로, 개념 설명 시 "Spring의 @Component ≈ Nest의 @Injectable", "FastAPI의 Pydantic ≈ Nest의 DTO+class-validator" 식으로 비교해주면 사용자의 기존 지식과 연결하기 좋습니다.
