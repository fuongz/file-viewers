# File Viewers

<p align="center">

![](https://img.shields.io/github/release/fuongz/file-viewers.svg?style=flat)
![](https://img.shields.io/github/downloads/fuongz/file-viewers/total.svg?style=flat)
![Build & Release](https://github.com/fuongz/file-viewers/workflows/Release/badge.svg)

</p>

A cross-platform desktop app for viewing and editing **Markdown**, **MDX**, **JSON**, **CSV**, **Excel**, and **Parquet** files. Built with Tauri 2 + React 19.

## Features

- Multi-tab file management with session persistence across restarts
- Markdown / MDX viewer with GFM, tables, and syntax-highlighted code blocks
- JSON tree viewer with collapsible nodes and dark/light theme support
- CSV and Excel viewer — sortable columns, global search, in-browser SQL queries
- Parquet viewer powered by DuckDB-WASM — query large files entirely in-browser
- Monaco editor for Markdown and JSON with live preview
- Command palette (`Cmd+K`) — open local files or load any file by URL
- File tree sidebar for navigating all open tabs
- Auto-updater — checks for new releases on startup with an in-app install prompt
- Drag-and-drop file loading
- System / Light / Dark theme

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Bun](https://bun.sh) `>= 1.0`

**Platform support:** macOS 12+, Linux (GTK), Windows 10+

## Development Setup

```bash
cd desktop-app
bun install
bun run tauri dev
```

### Other commands

```bash
bun run tauri build   # production bundle for current platform
bunx tsc --noEmit     # type check only
```

## Tech Stack

| Layer | Library |
|-------|---------|
| App shell | Tauri 2 |
| UI | React 19 + TypeScript |
| Build | Vite 7 + Tailwind CSS 4 |
| State | Zustand |
| Editor | Monaco Editor (local bundle, no CDN) |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| JSON | react-json-view-lite |
| CSV / Excel | TanStack Table v8 + PapaParse |
| Parquet | DuckDB-WASM (in-browser query engine) |
| SQL mode | alasql (in-memory SQL on `csv` table) |
| Icons | Hugeicons |
| UI primitives | shadcn/ui + Radix |

## Project Structure

```
file-viewers/
├── desktop-app/        # Tauri + React desktop application
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── table/          # Shared DataTable, SearchInput, SqlInput
│   │   │   ├── ui/             # Button, Input, Dialog, and other primitives
│   │   │   └── workspace/      # FileTree sidebar
│   │   ├── hooks/
│   │   ├── store/              # Zustand store
│   │   └── utils/
│   ├── src-tauri/
│   │   ├── src/lib.rs
│   │   ├── tauri.conf.json
│   │   └── capabilities/
│   └── docs/               # Architecture + component reference
├── landing/            # TanStack Start landing page (Cloudflare Workers)
└── scripts/
```

## Supported Formats

| Extension | Viewer |
|-----------|--------|
| `.md`, `.markdown`, `.mdx`, `.txt` | Markdown |
| `.json` | JSON tree |
| `.csv` | CSV table + SQL |
| `.xlsx` | Excel table + SQL |
| `.parquet` | Parquet table (DuckDB-WASM) |

## License

MIT — see [LICENSE](LICENSE)

## Docs

- [`desktop-app/docs/architecture.md`](desktop-app/docs/architecture.md) — component hierarchy, state, file loading, theme system, Tauri capabilities
- [`desktop-app/docs/components.md`](desktop-app/docs/components.md) — props reference for every component
