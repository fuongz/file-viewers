# File Viewers — Landing Page

Landing page for the [File Viewers](https://github.com/fuongz/file-viewers) desktop app. Built with TanStack Start (React SSR), Tailwind CSS v4, and deployed to Cloudflare Workers.

## Stack

- **Framework** — [TanStack Start](https://tanstack.com/start) (React 19, SSR)
- **Routing** — [TanStack Router](https://tanstack.com/router) (file-based)
- **Styling** — [Tailwind CSS v4](https://tailwindcss.com/)
- **Linting/Formatting** — [Biome](https://biomejs.dev/)
- **Deployment** — [Cloudflare Workers](https://workers.cloudflare.com/)

## Development

Install dependencies from the repository root with Bun. Use Node.js 22.22.2 or later in the 22.x line, 24.15.0 or later in the 24.x line, or Node.js 26 and newer.

```bash
bun install
cd apps/landing
bun run dev        # starts at http://localhost:3000
```

## Build

```bash
bun run build
```

## Deploy to Cloudflare

Requires a Cloudflare account and `wrangler` authenticated:

```bash
bun run deploy     # build + wrangler deploy
```

## Code Quality

```bash
bun run lint       # Biome lint
bun run format     # Biome format
bun run check      # Biome check (lint + format)
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Home / hero page |
| `/download` | Platform download links |

## Preview gallery

The home page gallery uses screenshots from the macOS desktop app with synthetic observatory data. SQLite and Schema Diagram show the same database. JSONL, CSV, and Markdown show related sample files.

For new screenshots, open the matching sample format in a local desktop build and capture the app window. Resize to 1800 × 1140 and export WebP to `public/banners/`. Image names and accessible descriptions are set in [the home route](src/routes/index.tsx).

The download page uses the version metadata updated by the [release script](../../docs/releasing.md).
