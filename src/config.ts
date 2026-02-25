function detectRepo(): { owner: string; repo: string } {
  const { hostname, pathname } = window.location;

  // GitHub Pages: <owner>.github.io/<repo>/
  if (hostname.endsWith(".github.io")) {
    const owner = hostname.replace(".github.io", "");
    const repo = pathname.split("/")[1] ?? "papershare";
    return { owner, repo };
  }

  // Fallback for local dev — set these to your repo
  return {
    owner: "YOUR_GITHUB_USERNAME",
    repo: "papershare",
  };
}

const { owner, repo } = detectRepo();

export const config = {
  owner,
  repo,
  apiBase: "https://api.github.com",
  token: import.meta.env.VITE_GITHUB_TOKEN as string | undefined,
  pdfUrl: `${import.meta.env.BASE_URL}paper.pdf`,
  title: (import.meta.env.VITE_PROJECT_TITLE as string) || "PaperShare",
  label: "papershare",
} as const;
