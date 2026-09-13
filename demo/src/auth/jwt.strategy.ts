import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // configService는 super() 호출 전에도 일반 파라미터로는 접근 가능 (this.configService는 아직 불가)
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'dev-secret-change-me'),
    });
  }

  // 서명 검증에 성공한 뒤 호출됨. 반환값이 request.user에 그대로 들어간다.
  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email };
  }
}
