import { PostItem } from './PostItem.js';
import type { PaginatedPosts } from '../types.js';

interface PostListProps {
  data: PaginatedPosts | null;
  currentUserId: number | null;
  onChanged: () => void;
  onPageChange: (page: number) => void;
}

export function PostList({ data, currentUserId, onChanged, onPageChange }: PostListProps) {
  if (!data) return <p>불러오는 중...</p>;
  if (data.items.length === 0) return <p>아직 게시글이 없습니다.</p>;

  return (
    <div className="post-list">
      {data.items.map((post) => (
        <PostItem key={post.id} post={post} currentUserId={currentUserId} onChanged={onChanged} />
      ))}

      <div className="pagination">
        <button disabled={data.page <= 1} onClick={() => onPageChange(data.page - 1)}>
          이전
        </button>
        <span>
          {data.page} / {data.totalPages || 1} 페이지 (전체 {data.total}개)
        </span>
        <button disabled={data.page >= data.totalPages} onClick={() => onPageChange(data.page + 1)}>
          다음
        </button>
      </div>
    </div>
  );
}
