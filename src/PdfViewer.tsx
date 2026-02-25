import { useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { config } from "./config";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url,
).toString();

interface PdfViewerProps {
  currentPage: number;
  onTotalPages: (total: number) => void;
}

export function PdfViewer({ currentPage, onTotalPages }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<ReturnType<
    Awaited<
      ReturnType<PDFDocumentProxy["getPage"]>
    >["render"]
  > | null>(null);

  const renderPage = useCallback(async (pageNum: number) => {
    const pdf = pdfDocRef.current;
    const canvas = canvasRef.current;
    if (!pdf || !canvas) return;

    // Cancel any in-progress render
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
      renderTaskRef.current = null;
    }

    const page = await pdf.getPage(pageNum);
    const dpr = window.devicePixelRatio || 1;
    const viewport = page.getViewport({ scale: 1.5 * dpr });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;

    const task = page.render({ canvas, viewport });
    renderTaskRef.current = task;

    try {
      await task.promise;
    } catch (err) {
      if ((err as Error).name !== "RenderingCancelledException") {
        console.error("Render error:", err);
      }
    }
  }, []);

  // Load PDF once
  useEffect(() => {
    let cancelled = false;

    pdfjsLib.getDocument(config.pdfUrl).promise.then((pdf) => {
      if (cancelled) return;
      pdfDocRef.current = pdf;
      onTotalPages(pdf.numPages);
      renderPage(1);
    });

    return () => {
      cancelled = true;
    };
  }, [onTotalPages, renderPage]);

  // Re-render on page change
  useEffect(() => {
    if (pdfDocRef.current && currentPage > 0) {
      renderPage(currentPage);
    }
  }, [currentPage, renderPage]);

  return (
    <section id="pdf-container">
      <canvas ref={canvasRef} id="pdf-canvas" />
    </section>
  );
}
