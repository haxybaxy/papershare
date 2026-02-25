import { useState, useEffect, useCallback } from "react";
import { PdfViewer } from "./PdfViewer";
import { CommentSidebar } from "./CommentSidebar";
import { CommentForm } from "./CommentForm";
import { fetchComments } from "./github-issues";
import { config } from "./config";
import type { Comment } from "./types";
import "./style.css";

export default function App() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchComments();
      setComments(data);
    } catch (err) {
      console.error("Failed to load comments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        setCurrentPage((p) => p + 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentPage, totalPages]);

  return (
    <>
      <header>
        <h1>{config.title}</h1>
        <nav id="page-nav">
          <button
            onClick={() => setCurrentPage((p) => p - 1)}
            disabled={currentPage <= 1}
          >
            Prev
          </button>
          <span id="page-info">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </nav>
      </header>
      <main id="app">
        <PdfViewer currentPage={currentPage} onTotalPages={setTotalPages} />
        <aside id="sidebar">
          <CommentSidebar
            comments={comments}
            currentPage={currentPage}
            loading={loading}
          />
          <CommentForm
            currentPage={currentPage}
            onCommentCreated={loadComments}
          />
        </aside>
      </main>
    </>
  );
}
