import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchComments, createComment } from "./github-issues";
import { serializeComment } from "./comment-parser";
import type { Comment, CommentMeta } from "./types";

export function useComments() {
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["comments"],
    queryFn: fetchComments,
  });

  const mutation = useMutation({
    mutationFn: async ({
      meta,
      body,
    }: {
      meta: CommentMeta;
      body: string;
    }) => {
      const issue = serializeComment(meta, body);
      return createComment(issue.title, issue.body, issue.labels);
    },
    onSuccess: (newComment) => {
      queryClient.setQueryData<Comment[]>(["comments"], (old = []) => [
        newComment,
        ...old,
      ]);
      queryClient.invalidateQueries({ queryKey: ["comments"] });
    },
  });

  return {
    comments,
    isLoading,
    createComment: mutation.mutateAsync,
    isCreating: mutation.isPending,
  };
}
