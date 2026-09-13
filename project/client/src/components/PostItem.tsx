import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { api, ApiRequestError, thumbnailUrl } from '../api.js';
import type { Post } from '../types.js';

interface PostItemProps {
  post: Post;
  currentUserId: number | null;
  onChanged: () => void;
}

export function PostItem({ post, currentUserId, onChanged }: PostItemProps) {
  const isOwner = currentUserId === post.authorId;
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleDelete() {
    setError(null);
    try {
      await api.deletePost(post.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '삭제에 실패했습니다.');
    }
  }

  async function handleThumbnailChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      await api.uploadThumbnail(post.id, file);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : '이미지 업로드에 실패했습니다.');
    }
  }

  const image = thumbnailUrl(post.thumbnailPath);

  return (
    <article className="post-item">
      {image && <img src={image} alt={post.title} className="post-thumbnail" />}
      <div className="post-body">
        <h3>{post.title}</h3>
        <p>{post.content}</p>
        <p className="post-meta">
          작성자: {post.author.email} · {new Date(post.createdAt).toLocaleString()}
        </p>
        {error && <p className="error">{error}</p>}
        {isOwner && (
          <div className="post-actions">
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              썸네일 변경
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={handleThumbnailChange}
            />
            <button type="button" className="danger" onClick={handleDelete}>
              삭제
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
