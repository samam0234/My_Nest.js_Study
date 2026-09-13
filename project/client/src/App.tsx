import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import type { CurrentUser, PaginatedPosts } from './types.js';
import { AuthForm } from './components/AuthForm.js';
import { PostForm } from './components/PostForm.js';
import { PostList } from './components/PostList.js';
import './App.css';

function decodeJwtPayload(token: string): { sub: number; email: string } | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function loadUserFromStorage(): CurrentUser | null {
  const accessToken = localStorage.getItem('accessToken');
  if (!accessToken) return null;
  const payload = decodeJwtPayload(accessToken);
  if (!payload) return null;
  return { accessToken, userId: payload.sub, email: payload.email };
}

const PAGE_SIZE = 5;

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(() => loadUserFromStorage());
  const [posts, setPosts] = useState<PaginatedPosts | null>(null);
  const [page, setPage] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await api.listPosts(page, PAGE_SIZE);
      setPosts(result);
      setLoadError(null);
    } catch {
      setLoadError('게시글 목록을 불러오지 못했습니다. 서버가 실행 중인지 확인해주세요.');
    }
  }, [page]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleLogin(accessToken: string) {
    localStorage.setItem('accessToken', accessToken);
    const payload = decodeJwtPayload(accessToken);
    if (payload) {
      setUser({ accessToken, userId: payload.sub, email: payload.email });
    }
  }

  function handleLogout() {
    localStorage.removeItem('accessToken');
    setUser(null);
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>📦 Nest.js 최종 프로젝트 — 게시판</h1>
        {user ? (
          <div className="user-info">
            <span>{user.email}님 환영합니다</span>
            <button onClick={handleLogout}>로그아웃</button>
          </div>
        ) : (
          <span>로그인 후 글을 작성할 수 있습니다</span>
        )}
      </header>

      <main className="app-main">
        <section className="sidebar">
          {user ? <PostForm onCreated={refresh} /> : <AuthForm onLogin={handleLogin} />}
        </section>

        <section className="content">
          {loadError && <p className="error">{loadError}</p>}
          <PostList
            data={posts}
            currentUserId={user?.userId ?? null}
            onChanged={refresh}
            onPageChange={setPage}
          />
        </section>
      </main>
    </div>
  );
}
