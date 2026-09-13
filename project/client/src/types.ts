export interface Author {
  id: number;
  email: string;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  thumbnailPath: string | null;
  createdAt: string;
  authorId: number;
  author: Author;
}

export interface PaginatedPosts {
  items: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CurrentUser {
  accessToken: string;
  userId: number;
  email: string;
}
