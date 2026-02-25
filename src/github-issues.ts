import { config } from "./config";
import { deserializeComment } from "./comment-parser";
import type { Comment } from "./types";

interface GitHubIssue {
  id: number;
  body: string | null;
  html_url: string;
}

const headers = (): Record<string, string> => {
  const h: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (config.token) {
    h["Authorization"] = `Bearer ${config.token}`;
  }
  return h;
};

export async function fetchComments(): Promise<Comment[]> {
  const comments: Comment[] = [];
  let page = 1;

  while (true) {
    const url = `${config.apiBase}/repos/${config.owner}/${config.repo}/issues?labels=${config.label}&state=open&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: headers() });

    if (!res.ok) {
      throw new Error(`Failed to fetch issues: ${res.status}`);
    }

    const issues: GitHubIssue[] = await res.json();
    if (issues.length === 0) break;

    for (const issue of issues) {
      if (!issue.body) continue;
      const parsed = deserializeComment(issue.body);
      if (!parsed) continue;

      comments.push({
        id: issue.id,
        meta: parsed.meta,
        body: parsed.body,
        htmlUrl: issue.html_url,
      });
    }

    if (issues.length < 100) break;
    page++;
  }

  return comments;
}

export async function createComment(
  title: string,
  body: string,
  labels: string[],
): Promise<Comment> {
  if (!config.token) {
    throw new Error("No GitHub token configured. Comments are read-only.");
  }

  // Ensure labels exist (best-effort, ignore errors)
  for (const label of labels) {
    await fetch(
      `${config.apiBase}/repos/${config.owner}/${config.repo}/labels`,
      {
        method: "POST",
        headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ name: label, color: "c5def5" }),
      },
    ).catch(() => {});
  }

  const res = await fetch(
    `${config.apiBase}/repos/${config.owner}/${config.repo}/issues`,
    {
      method: "POST",
      headers: { ...headers(), "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, labels }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to create issue: ${res.status} ${err}`);
  }

  const issue: GitHubIssue = await res.json();
  const parsed = deserializeComment(issue.body ?? "");
  if (!parsed) {
    throw new Error("Failed to parse created comment");
  }

  return {
    id: issue.id,
    meta: parsed.meta,
    body: parsed.body,
    htmlUrl: issue.html_url,
  };
}
