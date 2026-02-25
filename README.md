# PaperShare

A lightweight PDF viewer with page-level comments, powered by GitHub Issues. Deploy any PDF to GitHub Pages — either for this repo or as a reusable workflow from any other repo.

## Use PaperShare in Your Repo

Add a PDF to your repo and create `.github/workflows/deploy.yml`:

```yaml
name: Deploy Paper
on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    uses: haxybaxy/papershare/.github/workflows/deploy.yml@main
    with:
      pdf-path: paper.pdf # path to PDF in your repo
      title: "My Research Paper" # optional, defaults to "PaperShare"
    secrets:
      VITE_GITHUB_TOKEN: ${{ secrets.PAPERSHARE_TOKEN }} # optional, for comments
```

That's it. Push to `main` and your paper will be live at `https://<you>.github.io/<repo>/`.

### Inputs

| Input      | Required | Default        | Description                       |
| ---------- | -------- | -------------- | --------------------------------- |
| `pdf-path` | Yes      | —              | Path to the PDF file in your repo |
| `title`    | No       | `"PaperShare"` | Browser tab and page header title |

### Secrets

| Secret              | Required | Description                                                          |
| ------------------- | -------- | -------------------------------------------------------------------- |
| `VITE_GITHUB_TOKEN` | No       | GitHub token with `public_repo` scope, needed for the comment system |

### Setup

1. In your repo, go to **Settings > Pages** and set Source to **GitHub Actions**
2. (Optional) Create a fine-grained personal access token with `Issues: Read and write` permission on your repo, then add it as a repository secret named `PAPERSHARE_TOKEN`

### How Comments Work

Comments are stored as GitHub Issues on your repo (not on the PaperShare repo). Each comment is tagged with the page number. The app detects the repo from the deployed GitHub Pages URL at runtime, so no extra configuration is needed.

## Local Development

```bash
npm install
npm run dev
```

The dev server runs at `http://localhost:5173/papershare/`. Place your PDF at `public/paper.pdf`.

## Self-Hosting

If you fork this repo and deploy it directly, it works the same as before — push to `main` and it deploys to your fork's GitHub Pages.
