import {
  useEffect,
  useRef,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import { TextLayer } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { config } from "./config";
import { mergeRects } from "./highlight-utils";
import { SelectionTooltip } from "./SelectionTooltip";
import type { Comment, TextSelection, Highlight } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

const SCALE = 1.5;

interface PdfViewerProps {
  onPageChange: (page: number) => void;
  onTotalPages: (total: number) => void;
  comments: Comment[];
  onHighlightClick: (commentId: number) => void;
  onTextSelect: (selection: TextSelection | null) => void;
  activeSelection: TextSelection | null;
  pendingHighlight: Highlight | null;
  onComment: () => void;
}

export interface PdfViewerHandle {
  scrollToHighlight: (commentId: number) => void;
}

export const PdfViewer = forwardRef<PdfViewerHandle, PdfViewerProps>(
  function PdfViewer(
    {
      onPageChange,
      onTotalPages,
      comments,
      onHighlightClick,
      onTextSelect,
      activeSelection,
      pendingHighlight,
      onComment,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
    const [numPages, setNumPages] = useState(0);
    const renderedPages = useRef<Set<number>>(new Set());

    // Load PDF and determine page count
    useEffect(() => {
      let cancelled = false;

      pdfjsLib.getDocument(config.pdfUrl).promise.then((pdf) => {
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        onTotalPages(pdf.numPages);
      });

      return () => {
        cancelled = true;
      };
    }, [onTotalPages]);

    // Render individual page into its container
    const renderPage = useCallback(async (pageNum: number) => {
      const pdf = pdfDocRef.current;
      const container = containerRef.current;
      if (!pdf || !container) return;

      const pageEl = container.querySelector(
        `.pdf-page[data-page-number="${pageNum}"]`,
      ) as HTMLDivElement | null;
      if (!pageEl || renderedPages.current.has(pageNum)) return;
      renderedPages.current.add(pageNum);

      const page = await pdf.getPage(pageNum);
      const dpr = window.devicePixelRatio || 1;
      const canvasViewport = page.getViewport({ scale: SCALE * dpr });
      const cssViewport = page.getViewport({ scale: SCALE });

      // Set CSS var for text layer scaling
      pageEl.style.setProperty("--total-scale-factor", String(SCALE));
      pageEl.style.width = `${cssViewport.width}px`;
      pageEl.style.height = `${cssViewport.height}px`;

      // Canvas
      const canvas = pageEl.querySelector("canvas") as HTMLCanvasElement;
      canvas.width = canvasViewport.width;
      canvas.height = canvasViewport.height;
      canvas.style.width = `${cssViewport.width}px`;
      canvas.style.height = `${cssViewport.height}px`;

      await page.render({
        canvas,
        viewport: canvasViewport,
      }).promise;

      // Text layer
      const textLayerDiv = pageEl.querySelector(
        ".textLayer",
      ) as HTMLDivElement;
      const textContent = await page.getTextContent();
      const tl = new TextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: cssViewport,
      });
      await tl.render();
    }, []);

    // Render all pages once numPages is known
    useEffect(() => {
      if (numPages === 0) return;

      const id = requestAnimationFrame(() => {
        for (let i = 1; i <= numPages; i++) {
          renderPage(i);
        }
      });

      return () => cancelAnimationFrame(id);
    }, [numPages, renderPage]);

    // IntersectionObserver — track which page is most visible
    useEffect(() => {
      const container = containerRef.current;
      if (!container || numPages === 0) return;

      const ratios = new Map<number, number>();

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const pageNum = Number(
              (entry.target as HTMLElement).dataset.pageNumber,
            );
            ratios.set(pageNum, entry.intersectionRatio);
          }

          let bestPage = 1;
          let bestRatio = 0;
          for (const [page, ratio] of ratios) {
            if (ratio > bestRatio) {
              bestRatio = ratio;
              bestPage = page;
            }
          }
          onPageChange(bestPage);
        },
        {
          root: container,
          threshold: [0, 0.25, 0.5, 0.75, 1],
        },
      );

      const pages = container.querySelectorAll(".pdf-page");
      pages.forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }, [numPages, onPageChange]);

    // Text selection capture
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleMouseUp = () => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.rangeCount) {
          return;
        }

        const range = sel.getRangeAt(0);
        const text = sel.toString().trim();
        if (!text) {
          return;
        }

        // Find the enclosing .pdf-page
        let node: Node | null = range.startContainer;
        let pageEl: HTMLElement | null = null;
        while (node) {
          if (
            node instanceof HTMLElement &&
            node.classList.contains("pdf-page")
          ) {
            pageEl = node;
            break;
          }
          node = node.parentNode;
        }
        if (!pageEl) {
          return;
        }

        const pageNum = Number(pageEl.dataset.pageNumber);
        const pageRect = pageEl.getBoundingClientRect();

        // Convert client rects to page-relative percentages, clamping to page bounds
        const clientRects = range.getClientRects();
        const rawRects = [];
        for (let i = 0; i < clientRects.length; i++) {
          const r = clientRects[i];

          // Skip rects outside the page bounds (cross-page selection)
          if (
            r.bottom < pageRect.top ||
            r.top > pageRect.bottom ||
            r.right < pageRect.left ||
            r.left > pageRect.right
          ) {
            continue;
          }

          // Clamp to page bounds
          const clampedLeft = Math.max(r.left, pageRect.left);
          const clampedTop = Math.max(r.top, pageRect.top);
          const clampedRight = Math.min(r.right, pageRect.right);
          const clampedBottom = Math.min(r.bottom, pageRect.bottom);

          rawRects.push({
            x: ((clampedLeft - pageRect.left) / pageRect.width) * 100,
            y: ((clampedTop - pageRect.top) / pageRect.height) * 100,
            width: ((clampedRight - clampedLeft) / pageRect.width) * 100,
            height: ((clampedBottom - clampedTop) / pageRect.height) * 100,
          });
        }

        if (rawRects.length === 0) return;

        const rects = mergeRects(rawRects);

        // Position tooltip below the last merged rect, centered horizontally (page-relative %)
        const lastRect = rects[rects.length - 1];
        const tooltipPosition = {
          xPercent: lastRect.x + lastRect.width / 2,
          yPercent: lastRect.y + lastRect.height + 0.5,
        };

        onTextSelect({ page: pageNum, text, rects, tooltipPosition });

        // Clear browser's blue selection immediately
        sel.removeAllRanges();
      };

      container.addEventListener("mouseup", handleMouseUp);
      return () => container.removeEventListener("mouseup", handleMouseUp);
    }, [onTextSelect]);

    // Targeted clearing listeners (replaces blanket document mousedown)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          onTextSelect(null);
        }
      };

      const handleMouseDown = (e: MouseEvent) => {
        const target = e.target as HTMLElement;

        // Don't clear if clicking the tooltip itself
        if (target.closest(".selection-tooltip")) return;

        // Click on a textLayer starts a new drag — clear previous selection
        if (target.closest(".textLayer")) {
          onTextSelect(null);
          return;
        }

        // Click outside #pdf-container clears selection
        if (!target.closest("#pdf-container")) {
          onTextSelect(null);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleMouseDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("mousedown", handleMouseDown);
      };
    }, [onTextSelect]);

    // Imperative handle for scroll-to-highlight
    useImperativeHandle(ref, () => ({
      scrollToHighlight(commentId: number) {
        const container = containerRef.current;
        if (!container) return;

        const el = container.querySelector(
          `.highlight-rect[data-comment-id="${commentId}"]`,
        ) as HTMLElement | null;
        if (!el) return;

        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.remove("pulse");
        // Force reflow to restart animation
        void el.offsetWidth;
        el.classList.add("pulse");
      },
    }));

    // Build highlight data per page from comments, applying mergeRects
    const highlightsByPage = new Map<
      number,
      { commentId: number; rects: { x: number; y: number; width: number; height: number }[] }[]
    >();
    for (const comment of comments) {
      const h = comment.meta.highlight;
      if (!h) continue;
      const list = highlightsByPage.get(h.page) || [];
      list.push({ commentId: comment.id, rects: mergeRects(h.rects) });
      highlightsByPage.set(h.page, list);
    }

    // Build pending overlay rects per page (from activeSelection or pendingHighlight)
    const pendingOverlay = activeSelection
      ? { page: activeSelection.page, rects: activeSelection.rects }
      : pendingHighlight
        ? { page: pendingHighlight.page, rects: pendingHighlight.rects }
        : null;

    return (
      <section id="pdf-container" ref={containerRef}>
        {Array.from({ length: numPages }, (_, i) => {
          const pageNum = i + 1;
          const pageHighlights = highlightsByPage.get(pageNum) || [];
          const showPending = pendingOverlay && pendingOverlay.page === pageNum;
          const showTooltip = activeSelection && activeSelection.page === pageNum;

          return (
            <div
              key={pageNum}
              className="pdf-page"
              data-page-number={pageNum}
            >
              <canvas />
              <div className="highlight-layer">
                {pageHighlights.map((h) =>
                  h.rects.map((rect, ri) => (
                    <div
                      key={`${h.commentId}-${ri}`}
                      className="highlight-rect"
                      data-comment-id={h.commentId}
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.width}%`,
                        height: `${rect.height}%`,
                      }}
                      onClick={() => onHighlightClick(h.commentId)}
                    />
                  )),
                )}
                {showPending &&
                  pendingOverlay.rects.map((rect, ri) => (
                    <div
                      key={`pending-${ri}`}
                      className="pending-highlight-rect"
                      style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.width}%`,
                        height: `${rect.height}%`,
                      }}
                    />
                  ))}
              </div>
              <div className="textLayer" />
              {showTooltip && (
                <SelectionTooltip
                  selection={activeSelection}
                  onComment={onComment}
                />
              )}
            </div>
          );
        })}
      </section>
    );
  },
);
