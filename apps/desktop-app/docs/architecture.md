# Desktop architecture

## Application layout

```text
App
├── Toolbar + FileTabs
├── Workspace
│   ├── EditorPanel (Monaco, where supported)
│   └── PreviewPanel
│       ├── MarkdownPreview
│       ├── JsonPreview (JSON and JSONL)
│       ├── CsvPreview / ExcelPreview / ParquetPreview
│       └── SqlitePreview
│           ├── Table and view navigation
│           └── Table, Query, and Schema tabs
└── SettingsDialog, CommandPalette, and file dialogs
```

The Tauri shell lives in [`src-tauri/src/lib.rs`](../src-tauri/src/lib.rs). [`src/main.tsx`](../src/main.tsx) creates the React root and configures Monaco to load local Vite worker bundles. [`src/App.css`](../src/App.css) supplies theme and typography tokens.

## File lifecycle and state

[`useFileManager`](../src/hooks/useFileManager.ts) routes native picker, drag-and-drop, Open With, and HTTP(S) loads to the format viewer. Excel and Parquet receive bytes, while SQLite receives a local path and queries through native commands. The session stores open file paths, tab order, and size-limited unsaved text locally. Theme and typography preferences are persisted separately via the [Zustand store](../src/store/index.ts).

[`useFileWatcher`](../src/hooks/useFileWatcher.ts) checks modification times on visible local tabs. It reloads clean files and flags external edits when there is an unsaved buffer.

## Data viewers

- [`parseJsonLines`](../src/utils/parseJsonLines.ts) parses non-empty lines independently and reports errors with source line numbers. The JSON tree renders a page of records at a time.
- [`DataTable`](../src/components/table/DataTable.tsx) uses TanStack Table v9 and TanStack Virtual. Viewers supply rows, sorting, column sizes, selection state, and format-specific actions.
- CSV uses Papa Parse and AlaSQL. Excel reads workbook sheets with Hucre. Parquet uses DuckDB-WASM and runs queries inside the app.

## SQLite boundary

[`sqlite.rs`](../src-tauri/src/sqlite.rs) runs the bundled SQLite engine on blocking worker threads. Connections resolve and validate a local path. Table browsing and SQL queries open read-only connections. Filter operators come from an enum, column names are checked against schema metadata, and values are bound as SQL parameters. Query authorizers limit which statements the viewer can run. Table edits use separate commands against eligible tables, and update or delete targets an identified row inside a transaction.

[`SqliteSchemaDiagram`](../src/components/SqliteSchemaDiagram.tsx) lays out tables and connects foreign keys. During a drag it updates the node transform and connected paths on animation frames, then commits the new coordinates to React state. The [AppKit bridge](../src-tauri/src/schema_trackpad.rs) supplies three-finger deltas on macOS.

## Updater and permissions

[`useUpdater`](../src/hooks/useUpdater.ts) checks once on startup and can also run from the app menu. It shares concurrent checks and prompts the user before downloading and installing an update. Tauri verifies the signature using the configured public key. The release-only configuration enables signed updater artifacts. See the [release guide](../../../docs/releasing.md).

The main window's [Tauri capabilities](../src-tauri/capabilities/default.json) include file dialogs, file I/O, HTTP(S) URL loading, and updater commands. File I/O covers the user's home directory and paths granted through the system picker or drop handling.
