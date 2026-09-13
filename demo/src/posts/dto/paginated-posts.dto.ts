import type { Post } from '../post.entity.js';

export interface PaginatedPosts {
  items: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
