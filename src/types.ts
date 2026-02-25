export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number; // all percentages (0-100) relative to page
}

export interface Highlight {
  page: number;
  text: string;
  rects: HighlightRect[];
}

export interface TextSelection {
  page: number;
  text: string;
  rects: HighlightRect[];
  tooltipPosition: { top: number; left: number };
}

export interface CommentMeta {
  page: number;
  author: string;
  created: string;
  highlight?: Highlight;
}

export interface Comment {
  id: number;
  meta: CommentMeta;
  body: string;
  htmlUrl: string;
}

export interface AppState {
  currentPage: number;
  totalPages: number;
  comments: Comment[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
}
