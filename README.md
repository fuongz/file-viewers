# File Viewers

A native macOS desktop app for viewing and editing **Markdown**, **JSON**, and **CSV** files with a live split-panel interface.

## Features

- **Split-panel editor** — Monaco editor (left) + live preview (right), resizable via drag handle
- **Markdown** — GitHub Flavored Markdown, tables, task lists, syntax-highlighted code blocks
- **JSON** — Collapsible tree viewer with dark/light theme support
- **CSV** — Sortable + resizable columns, global search, cell selection, hover tooltips
- **File open** — Native `File > Open…` (`⌘O`) or drag-and-drop onto the window
- **Theme** — System / Light / Dark, syncs to macOS appearance

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Bun](https://bun.sh) `>= 1.0`
- macOS 12+

## Getting Started

```bash
bun install
bun run tauri dev
```

### Other commands

```bash
bun run tauri build   # production .app + .dmg
bunx tsc --noEmit     # type check only
```

## Tech Stack

| Layer | Library |
|-------|---------|
| App shell | Tauri 2 |
| UI | React 19 + TypeScript |
| Build | Vite 7 + Tailwind CSS 4 |
| Editor | Monaco Editor (local bundle, no CDN) |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| JSON | react-json-view-lite |
| CSV | TanStack Table v8 + PapaParse |
| UI primitives | Base UI |

## Project Structure

```
dev-viewers/
├── src/
│   ├── App.tsx                 # Root component, all top-level state
│   ├── App.css                 # Styles + CSS design tokens
│   ├── main.tsx                # Entry point; Monaco local-bundle setup
│   └── components/
│       ├── EditorPanel.tsx     # Monaco editor wrapper
│       ├── PreviewPanel.tsx    # Format router + empty state gate
│       ├── MarkdownPreview.tsx # react-markdown renderer
│       ├── JsonPreview.tsx     # react-json-view-lite renderer
│       ├── CsvPreview.tsx      # TanStack Table + Base UI Tooltip
│       └── EmptyState.tsx      # Welcome screen
├── src-tauri/
│   ├── src/lib.rs              # Tauri setup; native macOS menu
│   ├── tauri.conf.json         # App config
│   └── capabilities/
│       └── default.json        # Tauri permission grants
└── docs/                       # Architecture + component reference
```

## License

MIT — see [LICENSE](LICENSE)

## Docs

- [`docs/architecture.md`](docs/architecture.md) — component hierarchy, state, file loading, theme system, Tauri capabilities
- [`docs/components.md`](docs/components.md) — props reference for every component
