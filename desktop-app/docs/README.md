# File Viewers

A cross-platform desktop app for viewing and editing **Markdown**, **JSON**, and **CSV** files side-by-side in a live split-panel interface. Built with Tauri 2 + React 19.

---

## Features

| Feature | Details |
|---------|---------|
| **Split-panel editor** | Monaco editor (left) + live preview (right), resizable via drag handle |
| **Markdown** | GitHub Flavored Markdown, tables, task lists, syntax-highlighted code blocks |
| **JSON** | Collapsible tree viewer with dark/light theme support |
| **CSV** | Sortable + resizable columns, global search, SQL mode, cell selection, tooltip on hover |
| **File open** | Native `File > Open…` menu (`⌘O` / system shortcut) or drag-and-drop onto the window |
| **Theme** | System / Light / Dark — dropdown with icons, syncs to OS appearance |
| **Empty state** | Welcome screen with quick-action list when no file is loaded |

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

### Type check only

```bash
bunx tsc --noEmit
```

---

## Opening Files

### Native menu

`File > Open…` (`⌘O` on macOS) — opens a system file picker filtered to `.md`, `.markdown`, `.json`, `.csv`.

### Drag and drop

Drag any supported file onto the window. A blue overlay appears on hover; drop to load. The correct tab is activated automatically based on the file extension.

### Supported extensions

| Extension | Tab activated |
|-----------|--------------|
| `.md`, `.markdown` | Markdown |
| `.json` | JSON |
| `.csv` | CSV |

---

## Theme

Click the theme button in the top-right corner of the toolbar to open the dropdown:

| Option | Icon | Behaviour |
|--------|------|-----------|
| System | Monitor | Follows OS appearance (dark/light) |
| Light | Sun | Forces light theme |
| Dark | Moon | Forces dark theme |

The current selection is highlighted. The theme persists for the session.

---

## CSV Viewer

### Table interactions

| Action | Result |
|--------|--------|
| Click column header | Sort ascending → descending → unsorted |
| Drag column edge | Resize column |
| Type in search box | Filter rows globally (300ms debounce) |
| Click a cell | Select it (blue highlight) |
| Hover a cell | Show full value in a tooltip |

### SQL mode

Toggle SQL mode in the toolbar. Type a `WHERE` condition (the `SELECT * FROM csv WHERE` prefix is locked):

```
[SELECT * FROM csv WHERE] [condition input ............] [⌘↵ Run] [SQL]
```

- Query runs on `⌘↵` or the **Run** button — not real-time
- Column projections (`SELECT col1, col2`) are supported
- Errors appear in a red bar below the toolbar

### Status bar

```
[ 706 rows × 8 columns ]  [ 28:1 (67 chars) ]  [ UTF-8 ]  [ LF ]
       left                      center              right
```

- **Left** — filtered / total rows × columns (when filtered: `42 / 706 rows × 8 columns`)
- **Center** — selected cell position `row:col (N chars)` — only shown when a cell is selected
- **Right** — encoding chip + line-ending chip (LF / CRLF / CR)

---

## Project Structure

```
dev-viewers/
├── src/                        # React frontend
│   ├── App.tsx                 # Root component, all top-level state
│   ├── App.css                 # All styles + CSS design tokens
│   ├── main.tsx                # Entry point; Monaco local-bundle setup
│   └── components/
│       ├── EditorPanel.tsx     # Monaco editor wrapper
│       ├── PreviewPanel.tsx    # Format router + empty state gate
│       ├── MarkdownPreview.tsx # react-markdown renderer
│       ├── JsonPreview.tsx     # react-json-view-lite renderer
│       ├── CsvPreview.tsx      # TanStack Table + SQL mode + Base UI Tooltip
│       ├── EmptyState.tsx      # Welcome screen (shown when no file loaded)
│       └── ui/                 # Button, Input, Textarea primitives
├── src-tauri/
│   ├── src/lib.rs              # Tauri setup; native OS menu
│   ├── tauri.conf.json         # App config; window; references capabilities
│   └── capabilities/
│       └── default.json        # Tauri permission grants
├── docs/                       # This documentation
├── vite.config.ts              # Vite + Tailwind CSS + Tauri dev settings
└── package.json
```
