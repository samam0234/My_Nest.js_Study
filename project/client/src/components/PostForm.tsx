import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, ApiRequestError } from '../api.js';

interface PostFormProps {
  onCreated: () => void;
}

export function PostForm({ onCreated }: PostFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.createPost(title, content);
      setTitle('');
      setContent('');
      onCreated();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '게시글 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <h2>새 게시글 작성</h2>
      <input
        type="text"
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={100}
        required
      />
      <textarea
        placeholder="내용"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={4}
        required
      />
      {error && <p className="error">{error}</p>}
      <button type="submit" disabled={loading}>
        {loading ? '작성 중...' : '작성하기'}
      </button>
    </form>
  );
}
