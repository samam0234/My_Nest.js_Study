// 개발용 기본값. study10에서 ConfigModule + .env로 옮겨 하드코딩을 제거한다.
export const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';
