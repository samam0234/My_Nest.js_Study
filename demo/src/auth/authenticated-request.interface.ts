import type { Request } from 'express';

// JwtStrategy.validate()의 반환값이 request.user에 들어간다.
export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
  };
}
