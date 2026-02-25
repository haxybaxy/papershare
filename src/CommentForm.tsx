import { useState, useEffect } from "react";
import { config } from "./config";
import { serializeComment } from "./comment-parser";
import { createComment } from "./github-issues";
import type { CommentMeta } from "./types";

interface CommentFormProps {
  currentPage: number;
  onCommentCreated: () => void;
}

const STORAGE_KEY = "papershare_name";

export function CommentForm({ currentPage, onCommentCreated }: CommentFormProps) {
  const [name, setName] = useState(() => localStorage.getItem(STORAGE_KEY) ?? "");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const meta: CommentMeta = {
      page: currentPage,
      author: name.trim(),
      created: new Date().toISOString(),
    };

    const issue = serializeComment(meta, trimmed);

    try {
      await createComment(issue.title, issue.body, issue.labels);
      setBody("");
      setSuccess(true);
      onCommentCreated();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="comment-form-container">
      <form className="comment-form" onSubmit={handleSubmit}>
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
        <button type="submit" disabled={submitting || !body.trim()}>
          {submitting ? "Posting..." : "Post Comment"}
        </button>
        {error && <div className="form-error">{error}</div>}
        {success && <div className="form-success">Comment posted!</div>}
      </form>
    </div>
  );
}
