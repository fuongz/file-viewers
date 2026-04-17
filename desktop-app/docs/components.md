# Component Reference

## UI Primitives (`src/components/ui/`)

Reusable base elements used across the whole app. All styles are Tailwind utility classes only. Never use bare `<button>`, `<input>`, or `<textarea>` — always import from this package.

---

### `Button`

Variant styles managed via `cva`.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `Variant` | `"toolbar"` | Visual style |
| `active` | `boolean` | `undefined` | Sets `data-active` → activates `data-[active]:` Tailwind styles |
| `className` | `string` | `""` | Merged via `cn()` on top of variant classes |

| Variant | Used for |
|---------|---------|
| `toolbar` | Toolbar actions, theme toggle |
| `ghost` | Dropdown menu items |
| `outline` | Bordered toggles (SQL mode) |
| `outline-accent` | Accent-hover bordered buttons (Run query) |
| `link` | Plain text buttons |

Active state uses `data-[active]:` Tailwind variant — higher specificity than base classes, no `!important` needed.

---

### `ButtonGroup`

Groups multiple buttons with shared border and dividers. Wraps children in a flex container with appropriate border-radius distribution.

---

### `InputGroup`

Groups an input with a leading icon or trailing button. Handles z-index and focus ring coordination between grouped elements.

---

### `Input`

Wraps the base input with baked-in border, bg, and focus ring styles. Extend via `className`.

---

### `Empty`

Empty state card with icon, title, and description. Used in previews when a file has no content or no rows match a filter.

---

### `DropdownMenu`, `ContextMenu`

Radix-based dropdown and context menu primitives with consistent styling.

---

### `Dialog`, `AlertDialog`

Modal dialog primitives. Always import from `src/components/ui/` — never from Radix directly.

---

## `App` (`src/App.tsx`)

Root component. Composes the store, sidebar layout, toolbar, workspace, and side-effect hooks.

### Side-effects (via hooks)

| Hook | Purpose |
|------|---------|
| `useNativeMenu` | Listens for `"menu-open-file"` and `"menu-close-tab"` Tauri events |
| `useDragDrop` | Tauri drag-drop listener → `isDragOver` |
| `useKeyboard` | `Cmd+S` (save), `Cmd+W` (close tab) |
| `useUpdater` | Polls for app updates on startup; controls `UpdateToast` visibility |

---

## `EditorPanel`

Monaco editor wrapper.

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Controlled editor text |
| `onChange` | `(val: string) => void` | Called on every keystroke |
| `language` | `string` | Monaco language mode |
| `isDark` | `boolean` | `"vs-dark"` or `"vs"` |

Hidden when the active format is `csv`, `xlsx`, or `parquet`.

---

## `PreviewPanel`

Format router. Renders the correct preview component based on `format`, or `EmptyState` when `content` is empty.

| Format | Component |
|--------|-----------|
| `"markdown"`, `"mdx"` | `MarkdownPreview` |
| `"json"` | `JsonPreview` |
| `"csv"` | `CsvPreview` |
| `"xlsx"` | `ExcelPreview` |
| `"parquet"` | `ParquetPreview` |
| empty content | `EmptyState` |

---

## `MarkdownPreview`

Renders GitHub Flavored Markdown with `react-markdown` + `remark-gfm` + `rehype-highlight`. Code blocks always use `github-dark` regardless of the app theme.

---

## `JsonPreview`

Renders a collapsible JSON tree via `react-json-view-lite`. Shows an error badge if `JSON.parse` fails. Receives `isDark` to select `darkStyles` / `defaultStyles`.

---

## `CsvPreview` / `ExcelPreview`

Full-featured tabular viewers built on TanStack Table v8. Both use the shared `table/` components.

| Feature | Implementation |
|---------|---------------|
| Parsing | PapaParse (`csv`) / SheetJS (`xlsx`) |
| Virtualised rows | `@tanstack/react-virtual` — large files render instantly |
| Async loading | File parses in the background; `TableSkeleton` shown while loading |
| Column resize | `columnResizeMode: "onChange"` + drag handle |
| Sort | Click header to cycle: unsorted → asc → desc |
| Search | Debounced (300ms) `globalFilter` via `SearchInput` |
| SQL mode | `alasql` — WHERE conditions, runs on `Cmd+Enter` or Run button |
| Cell selection | `selectedCell` state — row index preserved through sort/filter |
| Status bar | 3-zone: row count · selected cell coords · encoding + line ending |

---

## `ParquetPreview`

Queries `.parquet` files in-browser using DuckDB-WASM. Reads the file as a `Uint8Array` via `@tauri-apps/plugin-fs`, registers it with DuckDB, then renders results in `DataTable`. Supports full SQL via `SqlInput`.

---

## `CommandPalette` (`Cmd+K`)

| Input | Behaviour |
|-------|-----------|
| Text search | Filters open tabs by filename |
| URL (`http://` / `https://`) | Fetches the remote file via `@tauri-apps/plugin-http` and opens it as a new tab |
| Empty | Shows all open tabs |

---

## `FileTree` (`src/components/workspace/FileTree.tsx`)

Sidebar component listing all open tabs as a file tree with format icons. Clicking a file activates its tab. Supports close-on-hover per item.

---

## `UpdateToast`

In-app toast shown when a new app version is available. Displays version number, download progress bar, and an Install & Restart button. Driven by `useUpdater`.
