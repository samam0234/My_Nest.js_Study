import type { PaginatedPosts, Post } from './types.js';

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

interface ApiSuccess<T> {
  data: T;
  timestamp: string;
}

interface ApiErrorBody {
  error: { statusCode: number; message: string | string[] };
  timestamp: string;
}

export class ApiRequestError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function getToken(): string | null {
  return localStorage.getItem('accessToken');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  // FormData(파일 업로드)는 브라우저가 boundary를 포함해 Content-Type을 자동 설정하므로 직접 지정하지 않는다
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  // DELETE(204)처럼 바디가 없는 응답을 대비
  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const errorBody = body as ApiErrorBody;
    const rawMessage = errorBody?.error?.message ?? '알 수 없는 오류가 발생했습니다.';
    const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
    throw new ApiRequestError(errorBody?.error?.statusCode ?? res.status, message);
  }

  return (body as ApiSuccess<T> | undefined)?.data as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<{ id: number; email: string }>('/users', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string) =>
    request<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  listPosts: (page: number, limit: number) =>
    request<PaginatedPosts>(`/posts?page=${page}&limit=${limit}`),

  getPost: (id: number) => request<Post>(`/posts/${id}`),

  createPost: (title: string, content: string) =>
    request<Post>('/posts', { method: 'POST', body: JSON.stringify({ title, content }) }),

  updatePost: (id: number, data: { title?: string; content?: string }) =>
    request<Post>(`/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deletePost: (id: number) => request<void>(`/posts/${id}`, { method: 'DELETE' }),

  uploadThumbnail: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Post>(`/posts/${id}/thumbnail`, { method: 'POST', body: form });
  },
};

export function thumbnailUrl(path: string | null): string | null {
  return path ? `${API_URL}/uploads/${path}` : null;
}
