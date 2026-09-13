import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { LoggingInterceptor } from '../src/common/interceptors/logging.interceptor.js';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';

describe('Posts (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // 테스트마다 완전히 격리된 인메모리 DB 사용 (개발용 data.sqlite를 건드리지 않음)
    process.env.DB_PATH = ':memory:';
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

  afterAll(async () => {
    await app.close();
  });

  it('회원가입 → 로그인 → 게시글 작성 → 목록 조회까지 전체 흐름이 동작한다', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/users')
      .send({ email: 'e2e@example.com', password: 'password123' })
      .expect(201);

    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'e2e@example.com', password: 'password123' })
      .expect(201);
    const accessToken: string = loginRes.body.data.accessToken;
    expect(accessToken).toBeTruthy();

    await request(server)
      .post('/posts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'e2e post', content: 'hello' })
      .expect(201);

    const listRes = await request(server).get('/posts?page=1&limit=10').expect(200);
    expect(listRes.body.data.items).toHaveLength(1);
    expect(listRes.body.data.items[0].title).toBe('e2e post');
  });

  it('토큰 없이 글 작성을 시도하면 401과 통일된 에러 형식을 반환한다', async () => {
    const res = await request(app.getHttpServer())
      .post('/posts')
      .send({ title: 'no auth', content: 'x' })
      .expect(401);

    expect(res.body.error.statusCode).toBe(401);
  });
});
