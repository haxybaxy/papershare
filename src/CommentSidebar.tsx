import type { Comment } from "./types";

interface CommentSidebarProps {
  comments: Comment[];
  currentPage: number;
  loading: boolean;
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function CommentSidebar({
  comments,
  currentPage,
  loading,
}: CommentSidebarProps) {
  const pageComments = comments.filter((c) => c.meta.page === currentPage);

  return (
    <div id="comment-list">
      <div className="comment-list-header">
        Comments on Page {currentPage} ({pageComments.length})
      </div>

      {loading && <div className="loading">Loading comments...</div>}

      {!loading && pageComments.length === 0 && (
        <div className="no-comments">
          No comments on this page yet.
        </div>
      )}

      {pageComments.map((comment) => (
        <div key={comment.id} className="comment-card">
          <div className="comment-card-header">
            <span className="comment-author">
              {comment.meta.author || "Anonymous"}
            </span>
            <span className="comment-time">
              {formatTime(comment.meta.created)}
            </span>
          </div>
          <div className="comment-body">{comment.body}</div>
          <div className="comment-footer">
            <a
              className="comment-link"
              href={comment.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
