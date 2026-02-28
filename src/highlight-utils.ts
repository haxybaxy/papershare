import type { HighlightRect } from "./types";

/**
 * Merge fragmented client rects into one rect per visual line.
 * Sorts by Y, then merges vertically-overlapping rects into bounding boxes.
 */
export function mergeRects(rects: HighlightRect[]): HighlightRect[] {
  if (rects.length === 0) return [];

  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x);
  const merged: HighlightRect[] = [{ ...sorted[0] }];

  for (let i = 1; i < sorted.length; i++) {
    const curr = sorted[i];
    const prev = merged[merged.length - 1];

    // If rects overlap vertically (same line), merge into bounding box
    if (curr.y < prev.y + prev.height) {
      const minX = Math.min(prev.x, curr.x);
      const maxX = Math.max(prev.x + prev.width, curr.x + curr.width);
      const minY = Math.min(prev.y, curr.y);
      const maxY = Math.max(prev.y + prev.height, curr.y + curr.height);
      prev.x = minX;
      prev.y = minY;
      prev.width = maxX - minX;
      prev.height = maxY - minY;
    } else {
      merged.push({ ...curr });
    }
  }

  return merged;
}
