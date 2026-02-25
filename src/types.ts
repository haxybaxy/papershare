export interface CommentMeta {
  page: number;
  author: string;
  created: string;
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
