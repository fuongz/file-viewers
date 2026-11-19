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

The home page uses screenshots of the macOS desktop app with synthetic sample data, in a light and a dark version each. The page shows the one that matches the visitor's color scheme.

For new screenshots, open the matching sample format in a local desktop build and capture the app window. Capture a light and a dark version, export them as WebP named `<view>-light.webp` and `<view>-dark.webp` in `public/shots/`, then register the view in [`src/shots.ts`](src/shots.ts).

The download page uses the version metadata updated by the [release script](../../docs/releasing.md).
