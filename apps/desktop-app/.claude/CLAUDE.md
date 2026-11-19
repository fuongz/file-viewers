# File Viewers project context

File Viewers is a Tauri 2 desktop app for Markdown, JSON, JSONL, CSV, Excel, Parquet, and SQLite.

## User Preferences
- **Package manager**: Bun — always use `bun` / `bunx`, never `npm` or `yarn`
- **CSS**: Always use Tailwind CSS utility classes — never write raw CSS
- **UI components**: Always use `src/components/ui/` primitives (`Button`, `Input`, `Textarea`, `Dialog`) for all button/input/textarea/dialog elements — never use native HTML elements directly. Build new primitives there when a new element type is needed.
- **Base UI**: Use `@base-ui/react` for higher-level components (Tabs, Select, etc.) when available — **except Dialog**: always use `src/components/ui/dialog.tsx`, never import directly from `@base-ui/react/dialog`
- **Editor**: Monaco Editor (not CodeMirror) — bundled locally, no CDN
- **No CDN dependencies**: Monaco must be bundled locally via Vite workers

## Shell Commands
- **Always prefix every Bash command with `rtk`** — e.g. `rtk git status`, `rtk bun install`, `rtk bunx tsc --noEmit`; never run bare shell commands directly
- **For file operations, always prefer native Claude tools** (Read, Glob, Grep, Edit, Write) over Bash — they are token-free and don't need `rtk`
- When Bash is the only option (e.g. running dev server, type check), `rtk` is mandatory

## Development

Run these from the repository root.

```bash
rtk mise install
rtk bun install --frozen-lockfile
rtk mise run app:dev
rtk bun run typecheck
```

Use `rtk mise run app:build` for desktop bundles or `rtk mise run app:install` to build and install the app on macOS.

## Project references

- [Desktop guide](../docs/README.md)
- [Architecture and data flows](../docs/architecture.md)
- [Component reference](../docs/components.md)
- [Release guide](../../../docs/releasing.md)
