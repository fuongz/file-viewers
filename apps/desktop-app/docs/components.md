# Component reference

Paths are relative to the desktop workspace.

| Component | Responsibility |
| --- | --- |
| [App](../src/App.tsx) | Connects window events, shortcuts, session state, Settings, and update notifications |
| [FileTabs](../src/components/workspace/FileTabs.tsx) | Selects, closes, and reorders files. Shows shortcut hints and file metadata with a copyable path |
| [Workspace](../src/components/Workspace.tsx) | Lays out the Monaco editor and format preview in resizable panels |
| [EditorPanel](../src/components/EditorPanel.tsx) | Configures Monaco with local workers and the chosen monospace typography |
| [PreviewPanel](../src/components/PreviewPanel.tsx) | Selects a preview by file format and renders the empty state when appropriate |
| [CommandPalette](../src/components/ui/CommandPalette.tsx) | Searches open files, runs app commands, and opens supported text files from URLs |
| [SettingsDialog](../src/components/SettingsDialog.tsx) | Offers system, light, and dark schemes, live typography controls, and a shortcut reference |
| [UpdateToast](../src/components/ui/UpdateToast.tsx) | Displays update availability and download progress |

## File previews

| Component | Responsibility |
| --- | --- |
| [MarkdownPreview](../src/components/MarkdownPreview.tsx) | Renders GitHub Flavored Markdown, including tables, task lists, and highlighted code |
| [JsonPreview](../src/components/JsonPreview.tsx) | Shows expandable JSON, paginated JSONL records, or raw text |
| [CsvPreview](../src/components/CsvPreview.tsx) | Parses CSV and provides search, SQL, editing, and export tools |
| [ExcelPreview](../src/components/ExcelPreview.tsx) | Parses workbooks and displays selectable sheets |
| [ParquetPreview](../src/components/ParquetPreview.tsx) | Uses local DuckDB-WASM to preview and query Parquet |
| [SqlitePreview](../src/components/SqlitePreview.tsx) | Manages the resizable SQLite workspace, table tabs, query tabs, and schema tab |
| [SqliteData](../src/components/SqliteData.tsx) | Handles table filters, pagination, row actions, and read-only query results |
| [SqliteSchemaDiagram](../src/components/SqliteSchemaDiagram.tsx) | Draws table relationships and handles node movement, zoom, and pan |

The [shared grid](../src/components/table) provides virtualized rows, resizable headers, selection, and clipboard behavior. Individual previews supply columns, data, and any format-specific editing or server-side sorting.

Use the [shared UI components](../src/components/ui) for controls and dialogs. Many of those components wrap Base UI, including the tabs, selects, and dialogs. Theme and typography tokens are defined in [App.css](../src/App.css).
