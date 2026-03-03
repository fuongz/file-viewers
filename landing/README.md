# File Viewers — Landing Page

Landing page for the [File Viewers](https://github.com/fuongz/file-viewers) desktop app. Built with TanStack Start (React SSR), Tailwind CSS v4, and deployed to Cloudflare Workers.

## Stack

- **Framework** — [TanStack Start](https://tanstack.com/start) (React 19, SSR)
- **Routing** — [TanStack Router](https://tanstack.com/router) (file-based)
- **Styling** — [Tailwind CSS v4](https://tailwindcss.com/)
- **Linting/Formatting** — [Biome](https://biomejs.dev/)
- **Deployment** — [Cloudflare Workers](https://workers.cloudflare.com/)

## Development

```bash
bun install
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

Or deploy manually:

```bash
bun run build
bun x wrangler deploy
```

## Code Quality

```bash
bun run lint       # Biome lint
bun run format     # Biome format
bun run check      # Biome check (lint + format)
```

## Routes

| Path        | Description          |
| ----------- | -------------------- |
| `/`         | Home / hero page     |
| `/download` | Platform download    |
