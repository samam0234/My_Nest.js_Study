import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './user.entity.js';
import { CreateUserDto } from './dto/create-user.dto.js';

export type SafeUser = Omit<User, 'password'>;

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<SafeUser> {
    const existing = await this.usersRepository.findOneBy({ email: dto.email });
    if (existing) {
      throw new ConflictException('이미 가입된 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = this.usersRepository.create({ email: dto.email, password: hashedPassword });
    const saved = await this.usersRepository.save(user);

    // save()는 방금 해시된 password가 담긴 in-memory 객체를 그대로 돌려주므로
    // (select: false는 "조회" 시에만 적용됨) 응답 전에 명시적으로 제거해야 한다.
    const { password, ...safeUser } = saved;
    return safeUser;
  }

  // password 컬럼은 select: false라 findOneBy 결과에 자동으로 빠지고,
  // 그대로 JSON 응답으로 보내도 password 필드가 undefined라 노출되지 않는다.
  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  // 게시글 작성자 지정 등 내부 로직에서 사용 (관계 매핑에는 password 유무가 중요하지 않음)
  findEntityById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  // 로그인 시 비밀번호 검증을 위해 password 컬럼까지 명시적으로 조회 (study6에서 사용)
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }
}
