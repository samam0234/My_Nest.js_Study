import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service.js';
import { Post } from './post.entity.js';
import { UsersService } from '../users/users.service.js';

describe('PostsService', () => {
  let service: PostsService;
  let repository: {
    find: ReturnType<typeof vi.fn>;
    findAndCount: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let usersService: { findEntityById: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    repository = {
      find: vi.fn(),
      findAndCount: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((dto) => dto),
      save: vi.fn(async (entity) => ({ id: 1, ...entity })),
      delete: vi.fn(),
    };
    usersService = { findEntityById: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: getRepositoryToken(Post), useValue: repository },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    service = module.get(PostsService);
  });

  describe('findOne', () => {
    it('존재하지 않는 게시글이면 NotFoundException을 던진다', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('존재하는 게시글은 그대로 반환한다', async () => {
      const post = { id: 1, title: 't', content: 'c' };
      repository.findOne.mockResolvedValue(post);
      await expect(service.findOne(1)).resolves.toEqual(post);
    });
  });

  describe('create', () => {
    it('존재하지 않는 authorId면 NotFoundException을 던진다', async () => {
      usersService.findEntityById.mockResolvedValue(null);
      await expect(service.create({ title: 't', content: 'c' }, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('정상적인 authorId면 author가 연결된 게시글을 생성한다', async () => {
      const author = { id: 1, email: 'a@example.com' };
      usersService.findEntityById.mockResolvedValue(author);

      const result = await service.create({ title: 't', content: 'c' }, 1);

      expect(repository.create).toHaveBeenCalledWith({ title: 't', content: 'c', author });
      expect(result).toMatchObject({ title: 't', content: 'c', author });
    });
  });

  describe('remove', () => {
    it('삭제 대상이 없으면(affected: 0) NotFoundException을 던진다', async () => {
      repository.delete.mockResolvedValue({ affected: 0 });
      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });

    it('삭제에 성공하면 예외 없이 끝난다', async () => {
      repository.delete.mockResolvedValue({ affected: 1 });
      await expect(service.remove(1)).resolves.toBeUndefined();
    });
  });
});
