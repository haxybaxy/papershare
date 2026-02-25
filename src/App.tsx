import { useState, useCallback, useEffect, useRef } from "react";
import { PdfViewer } from "./PdfViewer";
import type { PdfViewerHandle } from "./PdfViewer";
import { CommentSidebar } from "./CommentSidebar";
import { CommentForm } from "./CommentForm";
import { SelectionTooltip } from "./SelectionTooltip";
import { fetchComments } from "./github-issues";
import { config } from "./config";
import type { Comment, TextSelection, Highlight } from "./types";
import "./style.css";

export default function App() {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  const [textSelection, setTextSelection] = useState<TextSelection | null>(null);
  const [pendingHighlight, setPendingHighlight] = useState<Highlight | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<number | null>(null);

  const pdfViewerRef = useRef<PdfViewerHandle>(null);

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

  // Selection flow: user clicks tooltip → capture as pendingHighlight
  const handleCommentOnSelection = useCallback(() => {
    if (!textSelection) return;
    setPendingHighlight({
      page: textSelection.page,
      text: textSelection.text,
      rects: textSelection.rects,
    });
    setTextSelection(null);
    window.getSelection()?.removeAllRanges();
  }, [textSelection]);

  const handleClearHighlight = useCallback(() => {
    setPendingHighlight(null);
  }, []);

  // Sidebar → PDF: click comment to scroll to highlight
  const handleCommentClick = useCallback(
    (commentId: number) => {
      setActiveCommentId(commentId);
      pdfViewerRef.current?.scrollToHighlight(commentId);
    },
    [],
  );

  // PDF → Sidebar: click highlight overlay to scroll sidebar to comment
  const handleHighlightClick = useCallback((commentId: number) => {
    setActiveCommentId(commentId);
    // Scroll sidebar to the comment card
    const card = document.querySelector(
      `.comment-card[data-comment-id="${commentId}"]`,
    );
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <>
      <header>
        <h1>{config.title}</h1>
        <span id="page-info">
          Page {currentPage} of {totalPages}
        </span>
      </header>
      <main id="app">
        <PdfViewer
          ref={pdfViewerRef}
          onPageChange={setCurrentPage}
          onTotalPages={setTotalPages}
          comments={comments}
          onHighlightClick={handleHighlightClick}
          onTextSelect={setTextSelection}
        />
        {textSelection && (
          <SelectionTooltip
            selection={textSelection}
            onComment={handleCommentOnSelection}
          />
        )}
        <aside id="sidebar">
          <CommentSidebar
            comments={comments}
            currentPage={currentPage}
            loading={loading}
            onCommentClick={handleCommentClick}
            activeCommentId={activeCommentId}
          />
          <CommentForm
            currentPage={currentPage}
            onCommentCreated={loadComments}
            highlight={pendingHighlight ?? undefined}
            onClearHighlight={handleClearHighlight}
          />
        </aside>
      </main>
    </>
  );
}
