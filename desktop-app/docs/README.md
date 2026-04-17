# File Viewers — Desktop App

A cross-platform desktop app for viewing and editing **Markdown**, **MDX**, **JSON**, **CSV**, **Excel**, and **Parquet** files. Built with Tauri 2 + React 19.

---

## Features

| Feature | Details |
|---------|---------|
| **Multi-tab** | Multiple files open simultaneously; session persists across restarts |
| **File tree sidebar** | Resizable sidebar listing all open tabs for quick navigation |
| **Command palette** | `Cmd+K` — search open files, open local files, or load a file by pasting a URL |
| **Auto-updater** | Checks for new releases on startup; installs and restarts from an in-app toast |
| **Markdown / MDX** | GFM, tables, task lists, syntax-highlighted code blocks |
| **JSON** | Collapsible tree viewer with dark/light theme support |
| **CSV / Excel** | Sortable + resizable columns, global search, SQL mode, cell selection |
| **Parquet** | In-browser queries via DuckDB-WASM — no server, no uploads |
| **Monaco editor** | Live split-panel editor for Markdown and JSON |
| **File open** | Native `File > Open…` (`Cmd+O`), drag-and-drop, or URL via command palette |
| **Theme** | System / Light / Dark — persists across sessions |

---

## Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Bun](https://bun.sh) `>= 1.0`

**Platform support:** macOS 12+, Linux (GTK 3), Windows 10+

### Install dependencies

```bash
bun install
```

### Development

```bash
bun run tauri dev
```

Starts the Vite dev server on `localhost:1420` and opens the Tauri window with hot-module reload.

### Production build

```bash
bun run tauri build
```

Produces a platform-native bundle in `src-tauri/target/release/bundle/`:

| Platform | Output |
|----------|--------|
| macOS | `.app` + `.dmg` (universal binary via CI) |
| Linux | `.deb` + `.AppImage` |
| Windows | `.msi` + `.exe` (NSIS) |

### Type check

```bash
bunx tsc --noEmit
```

---

## Opening Files

### Command palette

`Cmd+K` — type a filename to switch tabs, or paste a remote URL to fetch and open a file directly from the internet.

### Native menu

`File > Open…` (`Cmd+O` on macOS) — opens a system file picker filtered to supported extensions.

### Drag and drop

Drag any supported file onto the window. A blue overlay appears on hover; drop to load.

### Supported extensions

| Extension | Viewer |
|-----------|--------|
| `.md`, `.markdown`, `.mdx`, `.txt` | Markdown |
| `.json` | JSON tree |
| `.csv` | CSV table + SQL |
| `.xlsx` | Excel table + SQL |
| `.parquet` | Parquet table (DuckDB-WASM) |

---

## CSV / Excel Viewer

### Table interactions

| Action | Result |
|--------|--------|
| Click column header | Sort ascending → descending → unsorted |
| Drag column edge | Resize column |
| Type in search box | Filter rows globally (300ms debounce) |
| Click a cell | Select it (blue highlight) |

### SQL mode

Toggle SQL mode in the toolbar. Type a `WHERE` condition (the `SELECT * FROM csv WHERE` prefix is locked):

```
[SELECT * FROM csv WHERE] [condition input ............] [Cmd+Enter Run] [SQL]
```

- Query runs on `Cmd+Enter` or the **Run** button — not real-time
- Column projections (`SELECT col1, col2`) are supported
- Errors appear in a red bar below the toolbar

### Status bar

```
[ 706 rows × 8 columns ]  [ 28:1 (67 chars) ]  [ UTF-8 ]  [ LF ]
       left                      center              right
```

- **Left** — filtered / total rows × columns
- **Center** — selected cell position `row:col (N chars)` — shown only when a cell is selected
- **Right** — encoding chip + line-ending chip (LF / CRLF / CR)

---

## Project Structure

```
desktop-app/
├── src/
│   ├── App.tsx                         # Root component
│   ├── App.css                         # Global styles + CSS design tokens
│   ├── main.tsx                        # Entry point; Monaco local-bundle setup
│   ├── store/
│   │   └── index.ts                    # Zustand store (tabs, theme, editor actions)
│   ├── components/
│   │   ├── CsvPreview.tsx
│   │   ├── ExcelPreview.tsx
│   │   ├── ParquetPreview.tsx
│   │   ├── JsonPreview.tsx
│   │   ├── MarkdownPreview.tsx
│   │   ├── EditorPanel.tsx
│   │   ├── PreviewPanel.tsx
│   │   ├── Workspace.tsx
│   │   ├── DragOverlay.tsx
│   │   ├── table/                      # Shared DataTable, SearchInput, SqlInput, TableSkeleton
│   │   ├── toolbar/                    # Toolbar, FormatTabs, ThemeMenu
│   │   ├── ui/                         # Button, Input, Dialog, and other primitives
│   │   └── workspace/
│   │       └── FileTree.tsx            # File tree sidebar
│   ├── hooks/
│   │   ├── useFileManager.ts
│   │   ├── useEditorActions.ts
│   │   ├── useUpdater.ts               # Auto-update polling
│   │   ├── useDragDrop.ts
│   │   ├── useKeyboard.ts
│   │   └── useNativeMenu.ts
│   ├── utils/
│   │   └── detectFormat.ts
│   └── types/
│       └── index.ts
├── src-tauri/
│   ├── src/lib.rs                      # Tauri setup; native OS menu; plugins
│   ├── tauri.conf.json                 # App config; updater endpoint
│   └── capabilities/
│       └── default.json                # Tauri permission grants
├── docs/                               # This documentation
├── vite.config.ts
└── package.json
```
