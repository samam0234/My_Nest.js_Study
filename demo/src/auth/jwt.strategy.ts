import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JWT_SECRET } from './jwt.constants.js';

export interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // "Authorization: Bearer <token>" 헤더에서 토큰 추출
      ignoreExpiration: false,
      secretOrKey: JWT_SECRET,
    });
  }

  // 서명 검증에 성공한 뒤 호출됨. 반환값이 request.user에 그대로 들어간다.
  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email };
  }
}
