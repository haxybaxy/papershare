import { useState, useEffect } from "react";
import { config } from "./config";
import type { CommentMeta, Highlight } from "./types";

interface CommentFormProps {
  currentPage: number;
  createComment: (args: { meta: CommentMeta; body: string }) => Promise<unknown>;
  isCreating: boolean;
  highlight?: Highlight;
  onClearHighlight?: () => void;
}

const STORAGE_KEY = "papershare_name";

export function CommentForm({
  currentPage,
  createComment,
  isCreating,
  highlight,
  onClearHighlight,
}: CommentFormProps) {
  const [name, setName] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, name);
  }, [name]);

  if (!config.token) {
    return (
      <div id="comment-form-container">
        <div className="no-token-notice">
          Comments are read-only (no token configured).
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setError(null);
    setSuccess(false);

    const meta: CommentMeta = {
      page: highlight ? highlight.page : currentPage,
      author: name.trim(),
      created: new Date().toISOString(),
      ...(highlight ? { highlight } : {}),
    };

    try {
      await createComment({ meta, body: trimmed });
      setBody("");
      setSuccess(true);
      onClearHighlight?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    }
  };

  return (
    <div id="comment-form-container">
      <form className="comment-form" onSubmit={handleSubmit}>
        {highlight && (
          <div className="highlight-preview">
            <div className="highlight-preview-label">
              <span>Highlighted text (p. {highlight.page})</span>
              <button type="button" onClick={onClearHighlight}>
                Clear selection
              </button>
            </div>
            <blockquote>{highlight.text}</blockquote>
          </div>
        )}
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          placeholder="Write a comment..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <button type="submit" disabled={isCreating || !body.trim()}>
          {isCreating ? "Posting..." : "Post Comment"}
        </button>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">Comment posted!</div>}
      </form>
    </div>
  );
}
