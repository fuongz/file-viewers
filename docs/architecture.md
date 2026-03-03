# Architecture

## Component Hierarchy

```
App (src/App.tsx)
├── drag-overlay (conditional)
├── header.toolbar
│   ├── Tabs.Root (format selector)
│   │   └── Tabs.List
│   │       ├── Tabs.Tab  value="markdown"
│   │       ├── Tabs.Tab  value="json"
│   │       └── Tabs.Tab  value="csv"
│   ├── toolbar-actions (context-sensitive)
│   │   ├── Button "Format"   (JSON + content only)
│   │   ├── Button "Minify"   (JSON + content only)
│   │   └── Button "Clear"    (CSV + content only)
│   └── theme-menu-wrap
│       ├── Button.toolbar (theme toggle)
│       └── div.theme-dropdown (conditional)
│           └── Button.ghost × 3 (System / Light / Dark)
└── main.workspace
    ├── [CSV mode] PreviewPanel (full width)
    └── [MD/JSON mode] Group (react-resizable-panels)
        ├── Panel (50%)
        │   └── EditorPanel
        │       └── MonacoEditor
        ├── Separator (drag handle)
        └── Panel (50%)
            └── PreviewPanel
                ├── EmptyState          (when content is empty)
                ├── MarkdownPreview     (format === "markdown")
                ├── JsonPreview         (format === "json")
                └── CsvPreview          (format === "csv")
```

---

## State Management (`App.tsx`)

All top-level state lives in `App`. Child components are pure/controlled — they receive data and callbacks via props.

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `format` | `Format` | `"markdown"` | Active tab |
| `content` | `Record<Format, string>` | `{ markdown: "", json: "", csv: "" }` | Per-format editor text; switching tabs preserves each tab's content |
| `themePref` | `ThemePreference` | `"system"` | User theme selection |
| `systemDark` | `boolean` | `window.matchMedia(…).matches` | OS dark-mode state (only updated when `themePref === "system"`) |
| `themeMenuOpen` | `boolean` | `false` | Theme dropdown visibility |
| `isDragOver` | `boolean` | `false` | Drag-over overlay visibility |

`isDark` is a derived boolean (not state):

```ts
const isDark = themePref === "dark" || (themePref === "system" && systemDark);
```

---

## File Loading

### Callback chain

```
openFile()
  └── openDialog() → path: string
      └── loadFile(path)
            ├── ext  = path.split(".").pop()
            ├── fmt  = EXT_TO_FORMAT[ext] ?? "markdown"
            ├── text = await readTextFile(path)
            ├── setContent(prev => ({ ...prev, [fmt]: text }))
            └── setFormat(fmt)
```

Both callbacks are stable `useCallback` hooks:

```ts
const loadFile = useCallback(async (path: string) => { … }, []);
const openFile = useCallback(async () => { … }, [loadFile]);
```

### Two entry points

| Entry point | API | How it calls `loadFile` |
|-------------|-----|------------------------|
| Native menu `⌘O` | `@tauri-apps/api/event` → `listen("menu-open-file", …)` | `openFile()` → `loadFile(path)` |
| Drag and drop | `getCurrentWebview().onDragDropEvent()` | Iterates `event.payload.paths`, picks first recognised extension, calls `loadFile(path)` directly |

Both effects use the `cancelled` flag pattern to avoid race conditions with React StrictMode double-invocation:

```ts
useEffect(() => {
  let cancelled = false;
  let unlisten: (() => void) | null = null;
  listen("menu-open-file", () => openFile()).then((fn) => {
    if (cancelled) fn(); else unlisten = fn;
  });
  return () => { cancelled = true; unlisten?.(); };
}, [openFile]);
```

### Supported extensions

| Extension | Format |
|-----------|--------|
| `.md`, `.markdown` | `"markdown"` |
| `.json` | `"json"` |
| `.csv` | `"csv"` |

---

## Layout: CSV Full-Width Mode

When `format === "csv"`, the editor panel is hidden and the preview fills the entire workspace:

```tsx
{format === "csv" ? (
  <PreviewPanel … />          // 100% width, no editor
) : (
  <Group>                     // 50/50 resizable split
    <Panel><EditorPanel /></Panel>
    <Separator />
    <Panel><PreviewPanel /></Panel>
  </Group>
)}
```

---

## Theme System

### Preference → CSS

1. User selects System / Light / Dark from the dropdown.
2. `isDark` is recomputed.
3. A `useEffect` sets `document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light")`.
4. CSS variables defined in `:root` (dark, default) are overridden under `[data-theme="light"]`.

When `themePref === "system"`, a second `useEffect` attaches a `MediaQueryList` listener to update `systemDark` when the OS appearance changes. The listener is removed if the user switches to an explicit preference.

### Theme propagation to sub-components

`isDark` is passed down as a prop to components that need it:

| Component | Uses `isDark` for |
|-----------|------------------|
| `EditorPanel` | Monaco theme: `"vs-dark"` vs `"vs"` |
| `JsonPreview` | `react-json-view-lite` styles: `darkStyles` vs `defaultStyles` |

Markdown and CSV previews follow the CSS variables automatically without needing the `isDark` prop.

---

## UI Component System

All button, input, and textarea elements use `src/components/ui/` primitives — never bare HTML elements. Each primitive:

- Wraps `@base-ui/react` (Button, Input) or a native element (Textarea)
- Defines all styles as Tailwind utility classes — no raw CSS
- Uses `cva` (class-variance-authority) for variant logic
- Uses `cn()` for className merging

### Button active state pattern

Active/selected state uses `data-[active]:` Tailwind variant:

```tsx
<Button variant="outline" active={queryMode === "sql"}>
  SQL
</Button>
```

```tsx
// In Button.tsx
<BaseButton
  data-active={active || undefined}
  className={cn(buttonVariants({ variant }), className)}
/>
```

`data-[active]:` selectors have higher CSS specificity than plain class selectors — the active styles reliably override base styles without `!important`.

---

## CsvPreview Performance Pattern

Typing in the search or SQL input should never trigger a TanStack Table recalculation. This is achieved by isolating input state inside sub-components:

```
SearchInput  (owns value state)
  │  onFilter(debouncedValue)           ← only fires after 300ms of no typing
  ▼
CsvPreview.globalFilter                 ← table re-renders here

SqlInput     (owns condition state)
  │  onRun(fullQuery)                   ← only fires on ⌘↵ or Run button
  ▼
CsvPreview.sqlQuery                     ← table re-renders here
```

Keystrokes only re-render the sub-component. The parent's `useReactTable` call never runs on every keystroke.

---

## Monaco Local Bundle (`main.tsx`)

Monaco is **not** loaded from any CDN. All language workers are bundled by Vite at build time and served locally.

```ts
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import loader from "@monaco-editor/loader";

window.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === "json") return new JsonWorker();
    return new EditorWorker();
  },
};

loader.config({ monaco });
```

`loader.config({ monaco })` tells `@monaco-editor/react` to use the already-imported local instance instead of fetching from jsDelivr.

---

## Drag-and-Drop

Uses the Tauri v2 Webview API — **not** the browser `dragover`/`drop` events (which don't fire for OS-level file drops into a Tauri window).

```ts
getCurrentWebview().onDragDropEvent(async (event) => {
  const { type } = event.payload;
  if (type === "enter" || type === "over") {
    setIsDragOver(true);
  } else if (type === "drop") {
    setIsDragOver(false);
    for (const path of event.payload.paths) {
      const ext = path.split(".").pop()?.toLowerCase() ?? "";
      if (EXT_TO_FORMAT[ext]) {
        await loadFile(path);
        break;  // only load the first recognised file
      }
    }
  } else {
    setIsDragOver(false);  // "leave"
  }
});
```

The overlay (`div.drag-overlay`) is rendered conditionally when `isDragOver === true` — a fixed-inset blue-tinted layer with a centred card containing `IconFileDownload` and a label.

---

## Tauri Capabilities

Defined in `src-tauri/capabilities/default.json`. Referenced by name in `src-tauri/tauri.conf.json` as `"capabilities": ["default"]`.

| Permission | Required for |
|------------|-------------|
| `core:default` | Base IPC, window management |
| `core:event:allow-listen` | `listen()` (native menu event) |
| `core:event:allow-unlisten` | Cleanup `unlisten()` functions |
| `opener:default` | Opening external links |
| `dialog:allow-open` | Native file picker (`openDialog`) |
| `fs:allow-read-text-file` | `readTextFile()` |
| `fs:allow-read-file` | Binary file reads (future use) |
| `fs:scope-home-recursive` | Access any file under `$HOME` |

> **Note**: `core:default` does NOT include `core:event:allow-listen` in Tauri 2. It must be declared explicitly.

---

## Build Output

```
src-tauri/target/release/bundle/
├── macos/
│   └── File Viewers.app
└── dmg/
    └── File Viewers_*.dmg
```

Produced by `bun run tauri build`. The app is code-signed with the system developer identity if available.
