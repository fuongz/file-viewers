# Dev Viewers — Project Context

## Project Overview
Desktop developer tool for viewing and editing Markdown, JSON, and CSV files with a live split-panel UI. Built as a native macOS app with Tauri 2.

## User Preferences
- **Package manager**: Bun — always use `bun` / `bunx`, never `npm` or `yarn`
- **CSS**: Always use Tailwind CSS utility classes — never write raw CSS
- **UI components**: Always use `src/components/ui/` primitives (`Button`, `Input`, `Textarea`) for all button/input/textarea elements — never use native HTML elements directly. Build new primitives there when a new element type is needed.
- **Base UI**: Use `@base-ui/react` for higher-level components (Tabs, Dialog, Select, etc.) when available
- **Editor**: Monaco Editor (not CodeMirror) — bundled locally, no CDN
- **No CDN dependencies**: Monaco must be bundled locally via Vite workers

## Stack
- **Framework**: Tauri 2 + React 19 + TypeScript
- **Build**: Vite 7
- **Editor**: `@monaco-editor/react` — local bundle via Vite `?worker` imports
- **Markdown**: `react-markdown` + `remark-gfm` + `rehype-highlight`
- **JSON viewer**: `react-json-view-lite`
- **CSV viewer**: `@tanstack/react-table` + `papaparse`
- **SQL on CSV**: `alasql` — in-memory SQL, table registered as `csv`
- **Code highlighting CSS**: `highlight.js/styles/github-dark.css` (imported in `main.tsx`)
- **File open**: `@tauri-apps/plugin-dialog` + `@tauri-apps/plugin-fs`
- **Icons**: `@tabler/icons-react`

## Commands
```bash
bun run tauri dev    # start dev desktop app (Rust + Vite HMR)
bun run build        # Vite frontend build only
bunx tsc --noEmit    # TypeScript type check
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root layout; all top-level state; toolbar; drag-drop handler; file open logic |
| `src/App.css` | All styles; CSS vars for dark (`:root`) and light (`[data-theme="light"]`) themes |
| `src/main.tsx` | React root; Monaco local-bundle setup (workers + loader.config) |
| `src/components/ui/Button.tsx` | Primitive button — 5 variants via Tailwind; wraps `@base-ui/react` Button |
| `src/components/ui/Input.tsx` | Primitive input — base Tailwind styles; wraps `@base-ui/react` Input |
| `src/components/ui/Textarea.tsx` | Primitive textarea — base Tailwind styles; wraps native `<textarea>` |
| `src/components/ui/index.ts` | Barrel export for all UI primitives |
| `src/components/EditorPanel.tsx` | Monaco editor wrapper; `isDark` prop → `vs-dark`/`vs` theme |
| `src/components/PreviewPanel.tsx` | Switches Markdown / JSON / CSV preview by `format` prop |
| `src/components/MarkdownPreview.tsx` | `react-markdown` renderer with GFM + rehype-highlight |
| `src/components/JsonPreview.tsx` | `react-json-view-lite`; `isDark` → `darkStyles`/`defaultStyles` |
| `src/components/CsvPreview.tsx` | TanStack Table; search/SQL mode; skeleton loading; row/cell selection; status bar |
| `src/components/EmptyState.tsx` | Welcome screen shown when no content is loaded |
| `src-tauri/src/lib.rs` | Tauri app setup; macOS native menu; emits `"menu-open-file"` event on Cmd+O |
| `src-tauri/capabilities/default.json` | Tauri permission grants |

## Architecture

### Layout
```
┌────────────────────────────────────────────────────────┐
│  toolbar (52px, macOS overlay title bar / drag region) │
│  [spacer 80px] [MD] [JSON] [CSV]  [actions] [theme ▾] │
├───────────────────────┬────────────────────────────────┤
│  EditorPanel (Monaco) │  PreviewPanel                  │
│  left 50%             │  right 50%                     │
│  (hidden for CSV)     │  (Markdown / JSON / CSV)       │
└───────────────────────┴────────────────────────────────┘
```
- Panels resizable via `react-resizable-panels`, default 50/50, min 20% each
- When `format === "csv"`, the editor panel is hidden and PreviewPanel fills 100% width

### Toolbar actions (context-sensitive)
| Format | Extra buttons |
|--------|--------------|
| JSON | Format (`IconWand`), Minify (`IconMinimize`) |
| CSV | Clear data (`IconTrash`) |

### State (`App.tsx`)
| State | Type | Description |
|-------|------|-------------|
| `format` | `Format` | Active tab: `"markdown"` \| `"json"` \| `"csv"` |
| `content` | `Record<Format, string>` | Per-format editor content; switching tabs preserves content |
| `themePref` | `ThemePreference` | `"system"` \| `"dark"` \| `"light"` |
| `systemDark` | `boolean` | Tracks OS `prefers-color-scheme` MQ |
| `isDark` | `boolean` (derived) | `themePref==="dark"` or `(system && systemDark)` |
| `themeMenuOpen` | `boolean` | Theme dropdown open/close |
| `isDragOver` | `boolean` | Drag-and-drop overlay visibility |

### Theme system
- Sets `data-theme` on `<html>` → CSS vars switch between dark (`:root`) and light (`[data-theme="light"]`)
- Monaco: `vs-dark` / `vs`; JSON viewer: `darkStyles` / `defaultStyles`
- Code blocks in Markdown preview always use `github-dark`

### File open (two paths)
Both call `loadFile(path: string)` — a stable `useCallback([], [])`:
1. **Native menu** — `Cmd+O` → Rust emits `"menu-open-file"` → `listen()` → `openFile()` → `loadFile()`
2. **Drag-and-drop** — `getCurrentWebview().onDragDropEvent()` → `"drop"` → first recognised path → `loadFile()`

### Tauri Capabilities (`src-tauri/capabilities/default.json`)
```json
"permissions": [
  "core:default",
  "core:event:allow-listen",
  "core:event:allow-unlisten",
  "opener:default",
  "dialog:allow-open",
  "fs:allow-read-text-file",
  "fs:allow-read-file",
  "fs:scope-home-recursive"
]
```
> `core:default` does NOT include `core:event:allow-listen` in Tauri 2 — must be explicit.

### Monaco Local Bundle (`main.tsx`)
```ts
window.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") return new JsonWorker();
    return new EditorWorker();
  },
};
loader.config({ monaco });
```

### UI Primitives (`src/components/ui/`)
All button, input, and textarea elements use these wrappers — never native HTML. Styles are 100% Tailwind; no raw CSS.

**`Button` variants:**
| Variant | Used for |
|---------|---------|
| `toolbar` (default) | Toolbar actions (Format, Minify, Clear data, theme toggle) |
| `ghost` | Dropdown menu items (theme options); `active` prop for selected state |
| `outline` | Bordered toggles (SQL mode button); `active` prop for selected state |
| `outline-accent` | Accent-hover bordered buttons (Run query) |
| `link` | Plain text buttons (Open File in EmptyState) |

Active state uses `data-[active]:` Tailwind variant — reliable higher specificity, no `!important`.

**`Input`**: wraps `@base-ui/react` Input; base border/bg/focus styles baked in. Use `className` to extend (e.g. `pl-7` for icon-prefixed inputs, `flex-1` for full-width).

**`Textarea`**: wraps native `<textarea>`; same base styles as `Input`.
