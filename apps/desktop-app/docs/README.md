# Desktop guide

Use the native file picker, drag and drop, or open a supported file from a URL through the command palette. Dropped files open in preview mode. URL loading supports text formats. SQLite, Excel, and Parquet use local files.

## Shortcuts

Use **Cmd** on macOS and **Ctrl** on Windows or Linux.

| Shortcut | Action |
| --- | --- |
| Cmd/Ctrl + O | Open local files |
| Cmd/Ctrl + K | Search open tabs and run app commands |
| Cmd/Ctrl + T | Open a new tab |
| Cmd/Ctrl + W | Close the active tab |
| Cmd/Ctrl + 1–9 | Switch to a file tab |
| Alt + Left/Right | Move the focused file tab |
| Cmd/Ctrl + E | Toggle the editor for supported formats |
| Cmd/Ctrl + , | Open Settings |

## Browse data

The JSONL viewer displays one record per non-empty line. Use **Auto** to expand records or **Raw** to inspect the original lines. Invalid records show their source line number.

CSV, Excel, Parquet, and SQLite reuse the shared table grid. Click or drag across cells to select them. Use the column header controls to sort and drag a column edge to resize. CSV supports editing, undo/redo, and split or merge commands. Select an Excel sheet from the sheet tabs. CSV and Parquet provide a SQL mode.

## SQLite workspace

Open a database and choose a table or view in the left pane. Drag the divider to resize the panes. Each table opens in its own tab. In the grid, column markers identify primary keys, references, indexes, and other column details. Enter a single expression in the filter bar, such as `exposure_s >= 180`, `quality LIKE 'ver%'`, or `notes IS NULL`. Text matching uses SQLite's `LIKE` patterns.

The Query tab runs read-only SQL and displays up to 500 rows per result. Open additional query tabs with **+**. The Run menu can execute the current statement, run statements in order or within a read-only transaction, and show a query plan.

On eligible tables, use **Insert row**, double-click a cell to edit it, or select a row to delete it after confirmation. SQLite writes these changes to the open database.

Open **Schema** to inspect table relationships. Drag a node to rearrange it or drag the canvas to pan. Scroll up or down to zoom and click the percentage to reset. On a Mac trackpad, two-finger vertical scrolling zooms. A three-finger gesture moves the node under the pointer or pans from empty space when macOS delivers the gesture to the app.

## Develop and package

Run these from the repository root.

```sh
mise install
bun install --frozen-lockfile
mise run app:dev
bun run typecheck
```

Use `mise run app:build` for platform bundles. Use `mise run app:install` to build and install the macOS app locally. See the [release guide](../../../docs/releasing.md) for CI packaging and updater verification.

[Architecture](architecture.md) · [Component reference](components.md) · [Color palette](color-palette.md)
