# Architecture

## Component Hierarchy

```
App (src/App.tsx)
├── UpdateToast                         # auto-updater prompt (conditional)
├── DragOverlay                         # drag-over overlay (conditional)
├── SidebarProvider
│   ├── FileTree (sidebar)              # open tabs as file tree
│   └── main.workspace
│       ├── Toolbar
│       │   ├── CommandPalette (Cmd+K)
│       │   ├── FormatTabs              # format switcher tabs
│       │   └── ThemeMenu
│       └── Workspace
│           ├── [CSV/Excel/Parquet] PreviewPanel (full width)
│           └── [MD/JSON] ResizablePanelGroup
│               ├── ResizablePanel → EditorPanel (Monaco)
│               ├── ResizableHandle
│               └── ResizablePanel → PreviewPanel
│                   ├── EmptyState
│                   ├── MarkdownPreview
│                   └── JsonPreview
```

---

## State Management (Zustand)

All top-level app state is centralised in `src/store/index.ts`.

| Slice | State | Description |
|-------|-------|-------------|
| tabs | `tabs`, `activeTabId` | All open file tabs; which is active |
| tabs | `closeConfirmTabId` | Tab pending unsaved-changes confirm dialog |
| theme | `themePref`, `isDark`, `systemDark` | Theme preference and resolved dark state |
| editor | `showEditor` | Whether the Monaco editor panel is visible |

`activeTab` is a derived selector: `tabs.find(t => t.id === activeTabId)`.

---

## File Loading

### Entry points

| Entry | API | Path |
|-------|-----|------|
| Native menu (`Cmd+O`) | Tauri event `"menu-open-file"` | `useNativeMenu` → `loadFile(path)` |
| Drag and drop | `getCurrentWebview().onDragDropEvent()` | `useDragDrop` → `loadFile(path)` |
| Command palette (local) | `@tauri-apps/plugin-dialog` | `CommandPalette` → `loadFile(path)` |
| Command palette (URL) | `@tauri-apps/plugin-http` fetch | `CommandPalette` → `onLoadUrl(url)` |

All paths ultimately call `loadFile(path: string)` or `onLoadUrl(url: string)` from `useFileManager`.

### Supported extensions → formats

| Extension | Format |
|-----------|--------|
| `.md`, `.markdown`, `.mdx`, `.txt` | `"markdown"` |
| `.json` | `"json"` |
| `.csv` | `"csv"` |
| `.xlsx` | `"xlsx"` |
| `.parquet` | `"parquet"` |

---

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│  toolbar (macOS overlay title bar / drag region)             │
│  [Cmd+K palette]  [MD] [JSON] [CSV] [XLSX] [PARQUET]  [☀▾] │
├────────────┬─────────────────────────────────────────────────┤
│ FileTree   │  EditorPanel (Monaco)  │  PreviewPanel          │
│ sidebar    │  left 50%              │  right 50%             │
│ (resizable)│  (hidden for tabular)  │                        │
└────────────┴────────────────────────────────────────────────-┘
```

- Panels resizable via `react-resizable-panels`
- For `csv`, `xlsx`, and `parquet` formats the editor panel is hidden; PreviewPanel fills 100%

---

## Auto-Updater

`useUpdater` (src/hooks/useUpdater.ts) polls for updates on startup via `@tauri-apps/plugin-updater`. When a new version is found, `UpdateToast` renders an in-app install prompt with progress state. On confirmation the app downloads, installs, and restarts via `@tauri-apps/plugin-process`.

---

## Theme System

1. User selects System / Light / Dark from the toolbar dropdown.
2. `isDark` is resolved: `themePref === "dark" || (themePref === "system" && systemDark)`.
3. A `useEffect` sets `document.documentElement.classList.toggle("dark", isDark)` — Tailwind dark mode uses the `.dark` class model.
4. When `themePref === "system"` a `MediaQueryList` listener tracks OS appearance changes.

`isDark` is passed as a prop to `EditorPanel` (Monaco theme: `vs-dark` / `vs`) and `JsonPreview` (`darkStyles` / `defaultStyles`). All other components follow Tailwind `dark:` variants automatically.

---

## Parquet Preview (DuckDB-WASM)

`ParquetPreview` loads the file as a `Uint8Array` via `@tauri-apps/plugin-fs`, registers it as an in-memory DuckDB database, and runs SQL queries using `@duckdb/duckdb-wasm`. All processing happens in-browser — no server and no file uploads.

---

## Table Components (`src/components/table/`)

Shared across CSV, Excel, and Parquet previews:

| Component | Purpose |
|-----------|---------|
| `DataTable` | TanStack Table v8 — sortable, resizable columns, row virtualisation |
| `SearchInput` | Owns debounced filter input; calls `onFilter` after 300ms |
| `SqlInput` | Owns SQL condition input; calls `onRun` on `Cmd+Enter` or Run button |
| `TableSkeleton` | Loading placeholder shown while file parses |

`SearchInput` and `SqlInput` own their input state internally — keystrokes only re-render those components; `useReactTable` in the parent never runs on every keystroke.

---

## Monaco Local Bundle (`main.tsx`)

Monaco is not loaded from any CDN. All workers are bundled by Vite at build time.

```ts
window.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") return new JsonWorker();
    return new EditorWorker();
  },
};
loader.config({ monaco });
```

---

## Tauri Capabilities (`src-tauri/capabilities/default.json`)

| Permission | Required for |
|------------|-------------|
| `core:default` | Base IPC, window management |
| `core:event:allow-listen` | `listen()` — native menu events |
| `core:event:allow-unlisten` | Cleanup `unlisten()` calls |
| `opener:default` | Opening external links |
| `dialog:allow-open` | Native file picker |
| `fs:allow-read-text-file` | `readTextFile()` |
| `fs:allow-read-file` | Binary reads (Parquet, Excel) |
| `fs:scope-home-recursive` | Access any file under `$HOME` |
| `http:default`, `http:allow-fetch` | URL file loading via command palette |
| `updater:default` | Auto-update checks |
| `process:allow-restart` | Restart after update install |

> `core:default` does NOT include `core:event:allow-listen` in Tauri 2 — it must be declared explicitly.

---

## Build Output

Produced by `bun run tauri build`. Output lives under `src-tauri/target/release/bundle/`.

| Platform | Bundle dir | Artifacts |
|----------|-----------|-----------|
| macOS | `macos/`, `dmg/` | `File Viewers.app`, `File Viewers_*.dmg` |
| Linux | `deb/`, `appimage/` | `file-viewers_*.deb`, `file-viewers_*.AppImage` |
| Windows | `msi/`, `nsis/` | `File Viewers_*.msi`, `File Viewers_*-setup.exe` |

The GitHub Actions release workflow builds all three platforms in parallel and attaches the artifacts to the GitHub Release. macOS builds use `--target universal-apple-darwin` (arm64 + x86_64 fat binary).
