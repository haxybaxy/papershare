import { useEffect, useMemo, useRef } from "react";
import type { Comment } from "./types";

interface CommentSidebarProps {
  comments: Comment[];
  currentPage: number;
  loading: boolean;
  onCommentClick?: (commentId: number) => void;
  activeCommentId?: number | null;
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
  onCommentClick,
  activeCommentId,
}: CommentSidebarProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Group comments by page, sorted by page number
  const pageGroups = useMemo(() => {
    const grouped = new Map<number, Comment[]>();
    for (const comment of comments) {
      const page = comment.meta.page;
      if (!grouped.has(page)) {
        grouped.set(page, []);
      }
      grouped.get(page)!.push(comment);
    }
    return Array.from(grouped.entries()).sort(([a], [b]) => a - b);
  }, [comments]);

  // Auto-scroll to active comment
  useEffect(() => {
    if (activeCommentId == null) return;
    const card = listRef.current?.querySelector(
      `.comment-card[data-comment-id="${activeCommentId}"]`,
    );
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeCommentId]);

  return (
    <div id="comment-list" ref={listRef}>
      <div className="comment-list-header">
        Comments ({comments.length})
      </div>

      {loading && <div className="loading">Loading comments...</div>}

      {!loading && comments.length === 0 && (
        <div className="no-comments">
          No comments yet.
        </div>
      )}

      {pageGroups.map(([page, pageComments]) => (
        <div
          key={page}
          className={`page-group${page === currentPage ? " current" : ""}`}
        >
          <div className="page-group-header">
            Page {page} ({pageComments.length})
          </div>
          {pageComments.map((comment) => {
            const hasHighlight = !!comment.meta.highlight;
            const isActive = activeCommentId === comment.id;

            return (
              <div
                key={comment.id}
                className={[
                  "comment-card",
                  hasHighlight && "has-highlight",
                  isActive && "active",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-comment-id={comment.id}
                onClick={
                  hasHighlight
                    ? () => onCommentClick?.(comment.id)
                    : undefined
                }
              >
                <div className="comment-card-header">
                  <span className="comment-author">
                    {comment.meta.author || "Anonymous"}
                  </span>
                  <span className="comment-time">
                    {formatTime(comment.meta.created)}
                  </span>
                </div>
                {hasHighlight && (
                  <div className="comment-highlight-quote">
                    {comment.meta.highlight!.text}
                  </div>
                )}
                <div className="comment-body">{comment.body}</div>
                <div className="comment-footer">
                  <a
                    className="comment-link"
                    href={comment.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
