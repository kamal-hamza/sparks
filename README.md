# Sparks - Digital Garden Engine

A highly scalable, modern digital garden generator that parses Obsidian vaults into structured JSON APIs, designed specifically to be consumed by modern frontend frameworks like Next.js.

## Features
- **Isomorphic Architecture**: Backend parses Markdown/AST; Frontend consumes JSON and renders components.
- **Incremental Builds**: Caches AST parsing for blazingly fast `>100ms` rebuilds.
- **Asset Pipeline**: Automatically discovers and copies Obsidian images, PDFs, and attachments to your public folder.
- **Watch Mode**: Live-reload your Next.js app the second you hit `Ctrl+S` in Obsidian.

## CLI Usage

You can run Sparks against any Obsidian Vault. It will copy all notes and static assets into the configured Next.js `--out` directory.

```bash
sparks --vault ./my-vault --out ./public/api/notes --watch
```

## Next.js Deployment Strategy

Because Sparks completely decouples the AST parsing from the UI rendering, deploying a Sparks + Next.js website to Vercel happens in two strict phases:
1. Sparks parses the vault and generates the JSON API (and copies images).
2. Next.js bakes the JSON into the static/dynamic routes.

To perfectly coordinate this, configure your Next.js starter template's `package.json` with the following scripts:

```json
{
  "name": "my-digital-garden",
  "scripts": {
    "dev": "sparks --watch & next dev",
    "build": "sparks && next build",
    "start": "next start"
  }
}
```

*When you push your repository to Vercel or Netlify, it automatically executes `npm run build` which safely guarantees the JSON notes API is fully built right before Next.js builds the production site!*
