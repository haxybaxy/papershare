import type { CommentMeta } from "./types";

const META_REGEX = /<!--\s*papershare:(.*?)\s*-->/;

export function serializeComment(
  meta: CommentMeta,
  body: string,
): { title: string; body: string; labels: string[] } {
  const metaJson = JSON.stringify(meta);
  const truncated =
    body.length > 80 ? body.substring(0, 77) + "..." : body;

  return {
    title: `[Page ${meta.page}] ${truncated}`,
    body: `<!-- papershare:${metaJson} -->\n\n${body}\n\n---\n*Posted via PaperShare*`,
    labels: ["papershare", `page:${meta.page}`],
  };
}

export function deserializeComment(
  issueBody: string,
): { meta: CommentMeta; body: string } | null {
  const match = META_REGEX.exec(issueBody);
  if (!match?.[1]) return null;

  try {
    const meta = JSON.parse(match[1]) as CommentMeta;
    // Extract body: everything after the HTML comment, trimmed, minus the footer
    const afterMeta = issueBody.replace(META_REGEX, "").trim();
    const body = afterMeta
      .replace(/---\s*\n\*Posted via PaperShare\*\s*$/, "")
      .trim();
    return { meta, body };
  } catch {
    return null;
  }
}
