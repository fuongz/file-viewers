# Component Reference

## UI Primitives (`src/components/ui/`)

Reusable base elements used across the whole app. All styles are **Tailwind utility classes only** — no raw CSS. Never use native `<button>`, `<input>`, or `<textarea>` directly; always import from this package.

---

### `Button` (`src/components/ui/Button.tsx`)

Wraps `@base-ui/react` Button. Variant styles managed via `cva` (class-variance-authority).

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `Variant` | `"toolbar"` | Visual style |
| `active` | `boolean` | `undefined` | Sets `data-active` → activates `data-[active]:` Tailwind styles |
| `className` | `string` | `""` | Merged via `cn()` on top of variant classes |
| …rest | `ComponentProps<BaseButton>` | — | Forwarded to `@base-ui/react` Button |

#### Variants

| Variant | Used for | Hover / Active behaviour |
|---------|---------|--------------------------|
| `toolbar` | Toolbar actions (Format, Minify, Clear data, theme toggle) | bg tint + text-primary on hover |
| `ghost` | Dropdown menu items (theme options) | bg tint on hover; pill bg + white text when `active` |
| `outline` | Bordered toggles (SQL mode button) | accent border on hover; accent text + tinted bg when `active` |
| `outline-accent` | Accent-hover bordered buttons (Run query) | accent text + border + bg tint on hover |
| `link` | Plain text buttons (Open File in EmptyState) | underline on hover |

Active state uses `data-[active]:` Tailwind variant — higher specificity than base classes, no `!important` needed.

---

### `Input` (`src/components/ui/Input.tsx`)

Wraps `@base-ui/react` Input with baked-in base styles (border, bg, focus ring, placeholder colour).

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Merged on top of base styles via template literal |
| …rest | `ComponentProps<BaseInput>` | Forwarded to `@base-ui/react` Input |

#### Common `className` extensions

| className | Purpose |
|-----------|---------|
| `pl-7` | Leaves room for an absolutely-positioned leading icon (left: 8px, 13px wide) |
| `flex-1 w-full` | Full-width inside a flex row (e.g. SQL condition input) |
| `font-mono text-xs` | Monospace for SQL/code inputs |

---

### `Textarea` (`src/components/ui/Textarea.tsx`)

Wraps native `<textarea>` (`@base-ui/react` has no Textarea primitive). Same base styles as `Input` plus `resize-y`.

#### Props

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | Merged on top of base styles |
| …rest | `ComponentProps<"textarea">` | All native textarea attributes |

---

## `App` (`src/App.tsx`)

Root component. Owns all top-level state and wires together the toolbar, panels, and side-effects.

### Side-effects

| Effect | Deps | Purpose |
|--------|------|---------|
| `data-theme` setter | `[isDark]` | Applies CSS theme to `<html>` |
| OS dark-mode listener | `[themePref]` | Tracks system appearance when pref is `"system"` |
| Click-outside handler | `[themeMenuOpen]` | Closes theme dropdown on outside click |
| `listen("menu-open-file")` | `[openFile]` | Wires native ⌘O menu item → `openFile()` |
| `onDragDropEvent` | `[loadFile]` | Handles OS drag-and-drop file loads |

### Toolbar actions

Context-sensitive buttons appear between the tab group and the theme toggle:

| Format | Actions |
|--------|---------|
| JSON (with content) | `<Button>Format</Button>` `<Button>Minify</Button>` |
| CSV (with content) | `<Button>Clear data</Button>` |

---

## `EditorPanel` (`src/components/EditorPanel.tsx`)

Monaco editor wrapper.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | Current editor text (controlled) |
| `onChange` | `(val: string) => void` | Called on every keystroke |
| `language` | `string` | Monaco language mode (`"markdown"`, `"json"`, `"plaintext"`) |
| `isDark` | `boolean` | Selects Monaco theme: `"vs-dark"` or `"vs"` |

### Notes

- `options.minimap.enabled = false` — hides the minimap
- `automaticLayout: true` — editor resizes with its container
- Monaco is pre-configured as a local bundle in `main.tsx` — no network calls
- **Hidden when `format === "csv"`** — CSV is full-width; no left editor panel

---

## `PreviewPanel` (`src/components/PreviewPanel.tsx`)

Format router. Renders the correct preview sub-component based on `format`, or `EmptyState` when `content` is blank.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | Editor text to render |
| `format` | `Format` | `"markdown"` \| `"json"` \| `"csv"` |
| `isDark` | `boolean` | Forwarded to `JsonPreview` |
| `onOpenFile` | `() => void` | Forwarded to `EmptyState` |

### Routing logic

```
content.trim() === ""  →  EmptyState
format === "markdown"  →  MarkdownPreview
format === "json"      →  JsonPreview
format === "csv"       →  CsvPreview
```

---

## `MarkdownPreview` (`src/components/MarkdownPreview.tsx`)

Renders GitHub Flavored Markdown with syntax-highlighted code blocks.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | Raw Markdown text |

### Dependencies

| Library | Purpose |
|---------|---------|
| `react-markdown` | Core Markdown → React renderer |
| `remark-gfm` | GFM plugin: tables, strikethrough, task lists, autolinks |
| `rehype-highlight` | Wraps code blocks with `highlight.js` class names |
| `highlight.js/styles/github-dark.css` | Code block colour theme (imported globally in `main.tsx`) |

### Notes

- Code highlighting uses `github-dark` regardless of the current app theme (no light swap).
- The component has no error state — invalid Markdown just renders as-is.

---

## `JsonPreview` (`src/components/JsonPreview.tsx`)

Renders a JSON tree viewer with collapse/expand support.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | Raw JSON text |
| `isDark` | `boolean` | Selects `darkStyles` or `defaultStyles` from `react-json-view-lite` |

### Behaviour

- `JSON.parse` is attempted; if it throws, an error badge + message are shown instead of the tree.
- The tree starts fully expanded.

### Error state

```
┌──────────────────────────────┐
│  [Invalid JSON]               │
│  Unexpected token …           │
└──────────────────────────────┘
```

---

## `CsvPreview` (`src/components/CsvPreview.tsx`)

Full-featured CSV viewer built on TanStack Table v8. Shown full-width (no editor panel) when the CSV tab is active.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | Raw CSV text |

### Features

| Feature | Implementation |
|---------|---------------|
| Parsing | `papaparse` with `skipEmptyLines: true` |
| Skeleton loading | `useDeferredValue` — shows `CsvSkeleton` while large data parses |
| Column resize | `columnResizeMode: "onChange"` + drag handle |
| Sort | Click header to cycle: unsorted → asc → desc |
| Search mode | Debounced (300ms) `globalFilter` via `SearchInput` sub-component |
| SQL mode | `alasql` — user types WHERE conditions; query runs on ⌘↵ or Run button |
| Cell selection | `selectedCell` state (`{ row, col, value }`) — row uses original `row.index` so it survives sort/filter |
| Status bar | 3-zone bar: row count, selected cell coords + length, encoding + line ending |
| ⌘F shortcut | Focuses active input (search or SQL condition) |

### Internal state

| State | Type | Description |
|-------|------|-------------|
| `sorting` | `SortingState` | TanStack sort state |
| `globalFilter` | `string` | Committed search value (updated by `SearchInput` after 300ms debounce) |
| `columnFilters` | `ColumnFiltersState` | Per-column filters (available for extension) |
| `columnSizing` | `ColumnSizingState` | Per-column widths after resize |
| `selectedCell` | `SelectedCell \| null` | `{ row, col, value }` — 1-based, original row index preserved |
| `queryMode` | `"search" \| "sql"` | Active toolbar mode |
| `sqlQuery` | `string` | Last committed SQL query (full `SELECT … WHERE …` string) |
| `sqlError` | `string \| null` | alasql error from last run |

### Sub-components

**`SearchInput`** — owns its own `value` state; calls `onFilter` (debounced 300ms) so the parent only re-renders when the settled filter value changes. Registers ⌘F/Ctrl+F window listener while mounted.

**`SqlInput`** — owns its own `condition` state; builds `SELECT * FROM csv WHERE {condition}` (or bare `SELECT *` when blank) and calls `onRun` only on ⌘↵ or Run button click. Displays a locked `SELECT * FROM csv WHERE` prefix so users only type the condition. Registers ⌘F/Ctrl+F window listener while mounted.

**`CsvSkeleton`** — deterministic skeleton table (6 cols × 12 rows, fixed width arrays) shown via `useDeferredValue` while deferred content differs from live content.

> **Performance note:** `SearchInput` and `SqlInput` own their input state internally. Keystrokes only re-render those tiny components — the `useReactTable` call in the parent never runs on every keystroke.

### SQL mode

```
toolbar: [SELECT * FROM csv WHERE] [condition input ............] [⌘↵ Run] [SQL toggle]
```

- User types WHERE conditions only — the `SELECT * FROM csv WHERE` prefix is locked/read-only (visual span, not editable)
- Query executes only on ⌘↵ or the Run button — not real-time
- `alasql.tables.csv` is registered with parsed row data before each query
- On error: a red error bar appears below the toolbar with the alasql message
- Column headers in results adapt dynamically (supports `SELECT col1, col2` projections)

### Status bar zones

```
left (flex:1)          center (flex:1)         right (flex:1)
────────────────────────────────────────────────────────────
706 rows × 8 cols   |  28:1 (67 chars)    |  UTF-8   LF
```

- **Left**: total or filtered row count × column count
- **Center**: `row:col (N chars)` — only visible when a cell is selected
- **Right**: encoding chip + line-ending chip (auto-detected from raw content)

---

## `EmptyState` (`src/components/EmptyState.tsx`)

Welcome screen shown in the preview panel when no content has been loaded.

### Props

| Prop | Type | Description |
|------|------|-------------|
| `onOpenFile` | `() => void` | Called when the "Open File" button is clicked |

### Layout

```
      [Markdown icon]
   [Braces icon] [Table icon]

   Open File          ⌘ O
   Drop a file anywhere  ↓
```

The icon trio acts as a ghost brand mark (very low opacity). The "Open File" action uses `<Button variant="link">`. The action list uses `<Kbd>` — an internal sub-component that wraps key labels in `.es-kbd` styled `<span>` elements.

### `Kbd` sub-component

```tsx
function Kbd({ children }: { children: React.ReactNode }) {
  return <span className="es-kbd">{children}</span>;
}
```

Only used internally within `EmptyState`.
