# File Viewers

[![GitHub release](https://img.shields.io/github/v/release/fuongz/file-viewers)](https://github.com/fuongz/file-viewers/releases)
[![GitHub downloads](https://img.shields.io/github/downloads/fuongz/file-viewers/total)](https://github.com/fuongz/file-viewers/releases)
[![Release workflow](https://github.com/fuongz/file-viewers/actions/workflows/release.yml/badge.svg)](https://github.com/fuongz/file-viewers/actions/workflows/release.yml)

File Viewers is a desktop workspace for Markdown, structured documents, tabular data, and SQLite databases. Open local files in tabs, drag to reorder them, or use the command palette to switch between them.

## Supported formats

| Files | In the viewer |
| --- | --- |
| `.md`, `.markdown`, `.mdx`, `.txt` | Markdown preview with GFM, highlighted code blocks, and a split editor |
| `.json` | Collapsible tree, raw view, and JSON formatting |
| `.jsonl` | Paginated records, raw lines, and line-numbered parse errors |
| `.csv` | Search, sort, resize columns, edit cells, run SQL, and split or merge files |
| `.xlsx` | Switch sheets and explore data with search, sorting, and cell selection |
| `.parquet` | Explore and query tables with local DuckDB-WASM |
| `.sqlite`, `.sqlite3`, `.db`, `.db3` | Browse tables and views, run read-only SQL, edit eligible rows, and explore a relationship diagram |

System, light, and dark themes are available in Settings, with separate font controls for the interface and editor. The desktop app checks GitHub Releases for updates and asks before installing them.

## Get started

Download a macOS, Windows, or Linux build from [GitHub Releases](https://github.com/fuongz/file-viewers/releases). For local development, install the platform prerequisites for Tauri 2 and use [mise](https://mise.jdx.dev/) to pick up the pinned Rust and Bun versions.

```sh
mise install
bun install --frozen-lockfile
mise run app:dev
```

| Command | What it does |
| --- | --- |
| `mise run app:build` | Build desktop bundles for the current platform |
| `mise run app:install` | Build and install the macOS app in `/Applications` |
| `bun run landing:dev` | Start the landing page on port 3000 |
| `bun run typecheck` | Type-check both workspaces |
| `mise run clean` | Remove generated build files and caches |
| `mise run clean:deep` | Also remove installed JavaScript dependencies |

Stop active development and build tasks before cleaning. Restore dependencies with `bun install --frozen-lockfile` after a deep clean.

## Repository guide

| Path | Contents |
| --- | --- |
| [`apps/desktop-app`](apps/desktop-app) | Tauri desktop app with a React interface, Monaco, and native SQLite |
| [`apps/landing`](apps/landing) | TanStack Start landing page and release downloads |
| [`scripts`](scripts) | Desktop install, cleanup, and release preparation |
| [`.github/workflows/release.yml`](.github/workflows/release.yml) | Cross-platform bundles and signed updater assets |

- [Desktop guide](apps/desktop-app/docs/README.md)
- [Desktop architecture](apps/desktop-app/docs/architecture.md)
- [Component reference](apps/desktop-app/docs/components.md)
- [Landing page guide](apps/landing/README.md)
- [Release guide](docs/releasing.md)

[MIT license](LICENSE)
