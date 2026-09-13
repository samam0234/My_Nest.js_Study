import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    // PrismaService의 전역 omit 설정 덕분에 create()의 반환값에도 password가 자동으로 빠진다.
    return this.prisma.user.create({
      data: { email: dto.email, password: hashedPassword },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  // 게시글 작성자 지정 등 내부 로직용 (관계 연결에는 password 유무가 중요하지 않음)
  findEntityById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  // 로그인 시 비밀번호 검증을 위해 전역 omit을 이 쿼리에서만 해제
  findByEmailWithPassword(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      omit: { password: false },
    });
  }
}
