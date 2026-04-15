/** biome-ignore-all lint/suspicious/noArrayIndexKey: no need */

import { Popover } from "@base-ui/react";
import {
	IconDatabase,
	IconFilter,
	IconPlayerPlay,
	IconSearch,
	IconTrash,
} from "@tabler/icons-react";
import {
	type ColumnFiltersState,
	type ColumnSizingState,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import alasql from "alasql";
import Papa from "papaparse";
import type React from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Textarea } from "./ui";

interface CsvPreviewProps {
	content: string;
	onContentChange?: (content: string) => void;
	onClearCsv?: () => void;
}

interface SelectedCell {
	row: number; // 1-based
	col: number; // 1-based
	value: string;
}

interface EditingCell {
	rowIndex: number; // original data index
	colIndex: number; // column index
	draftValue: string;
	anchorEl: Element;
}

type QueryMode = "search" | "sql";

// Deterministic widths so skeleton is stable across renders
const HEADER_WIDTHS = [72, 55, 88, 62, 78, 50, 68, 82];
const CELL_WIDTHS = [
	[68, 42, 75, 58, 82, 45, 70, 55],
	[52, 78, 48, 88, 62, 72, 44, 66],
	[80, 50, 70, 44, 90, 55, 78, 48],
	[60, 85, 55, 72, 40, 80, 52, 74],
	[74, 46, 84, 60, 70, 48, 88, 58],
	[48, 72, 62, 50, 78, 66, 42, 80],
	[82, 54, 44, 76, 56, 84, 60, 46],
	[58, 80, 68, 40, 86, 52, 76, 62],
	[70, 44, 78, 64, 48, 74, 56, 84],
	[46, 68, 52, 82, 66, 42, 80, 58],
	[86, 58, 72, 46, 76, 62, 48, 70],
	[62, 76, 40, 70, 54, 86, 64, 44],
];
const SKELETON_COLS = 6;
const SKELETON_ROWS = 12;

function CsvSkeleton() {
	return (
		<div className="csv-preview">
			<div className="csv-toolbar">
				<div className="csv-search-wrapper">
					<div className="size-3 rounded animate-pulse bg-[var(--border)]" />
					<div className="h-3 w-36 rounded animate-pulse bg-[var(--border)] ml-2" />
				</div>
			</div>

			<div className="csv-table-wrapper">
				<table className="csv-table w-full">
					<thead>
						<tr>
							<th className="csv-row-num">
								<div className="h-3 w-3 rounded animate-pulse bg-[var(--border)]" />
							</th>
							{Array.from({ length: SKELETON_COLS }).map((_, i) => (
								<th key={i} style={{ width: 150 }}>
									<div
										className="h-3 rounded animate-pulse bg-[var(--border)]"
										style={{
											width: `${HEADER_WIDTHS[i % HEADER_WIDTHS.length]}%`,
										}}
									/>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{Array.from({ length: SKELETON_ROWS }).map((_, rowIdx) => (
							<tr key={rowIdx}>
								<td className="csv-row-num">
									<div className="h-3 w-4 rounded animate-pulse bg-[var(--border)]" />
								</td>
								{Array.from({ length: SKELETON_COLS }).map((_, colIdx) => (
									<td key={colIdx}>
										<div
											className="h-3 rounded animate-pulse bg-[var(--border)]"
											style={{
												width: `${CELL_WIDTHS[rowIdx % CELL_WIDTHS.length][colIdx % CELL_WIDTHS[0].length]}%`,
											}}
										/>
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<div className="csv-statusbar">
				<div className="h-3 w-32 rounded animate-pulse bg-[var(--border)]" />
			</div>
		</div>
	);
}

// ── SearchInput ─────────────────────────────────────────────────────────────
// Owns its own value state so keystrokes don't re-render the parent table.
// Calls onFilter (debounced 300ms) only when the settled value changes.

interface SearchInputProps {
	onFilter: (value: string) => void;
}

function SearchInput({ onFilter }: SearchInputProps) {
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const id = setTimeout(() => onFilter(value), 300);
		return () => clearTimeout(id);
	}, [value, onFilter]);

	// ⌘F / Ctrl+F focuses this input when it is mounted
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
	return (
		<div className="csv-search-wrapper w-full flex-1">
			<IconSearch size={11} className="csv-search-icon" />
			<Input
				ref={inputRef}
				className="flex-1 w-full font-mono text-xs pl-7"
				placeholder="Find"
				value={value}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setValue(e.target.value)
				}
			/>
		</div>
	);
}

// ── SqlInput ─────────────────────────────────────────────────────────────────
// Owns its own value state so keystrokes don't re-render the parent table.
// Calls onRun only on ⌘Enter or Run button click.

interface SqlInputProps {
	onRun: (query: string) => void;
}

function SqlInput({ onRun }: SqlInputProps) {
	const [condition, setCondition] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	function buildQuery() {
		const trimmed = condition.trim();
		return trimmed ? `SELECT * FROM csv WHERE ${trimmed}` : "SELECT * FROM csv";
	}

	// ⌘F / Ctrl+F focuses this input when it is mounted
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	return (
		<div className="csv-sql-wrapper gap-2">
			<Input
				ref={inputRef}
				className="flex-1 w-full font-mono text-xs"
				placeholder="age > 30 AND name = 'Alice'  (⌘↵)"
				value={condition}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setCondition(e.target.value)
				}
				onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						onRun(buildQuery());
					}
				}}
				spellCheck={false}
			/>
			<Button
				variant="primary"
				onClick={() => onRun(buildQuery())}
				title="Run query (⌘↵)"
			>
				<IconPlayerPlay size={11} />
				Run
			</Button>
		</div>
	);
}

// ── CsvPreview ────────────────────────────────────────────────────────────────

export function CsvPreview({
	content,
	onContentChange,
	onClearCsv,
}: CsvPreviewProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
	const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
	const [queryMode, setQueryMode] = useState<QueryMode>("search");
	const [sqlQuery, setSqlQuery] = useState("SELECT * FROM csv");
	const [sqlError, setSqlError] = useState<string | null>(null);
	const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
	// null = use parsed rows; set = contains committed edits
	const [editRows, setEditRows] = useState<string[][] | null>(null);
	// true while we're processing our own onContentChange call
	const isMyEditRef = useRef(false);
	// used to distinguish Escape (cancel) from click-outside (commit)
	const cancelRef = useRef(false);
	// mirrors editingCell for use in callbacks without stale-closure issues
	const editingCellRef = useRef<EditingCell | null>(null);
	editingCellRef.current = editingCell;

	const deferredContent = useDeferredValue(content);
	const isStale = content !== deferredContent;

	const { headers, rows, error } = useMemo(() => {
		if (!deferredContent.trim()) return { headers: [], rows: [], error: null };
		// Strip UTF-8 BOM if present
		const raw = deferredContent.trim().replace(/^\uFEFF/, "");
		const result = Papa.parse<string[]>(raw, {
			skipEmptyLines: true,
		});
		if (result.errors.length > 0 && result.data.length === 0) {
			return { headers: [], rows: [], error: result.errors[0].message };
		}
		const [headerRow, ...dataRows] = result.data;
		const rawHeaders = headerRow ?? [];

		// Strip trailing empty columns (common in CSV exports like FastMoss)
		let lastNonEmpty = rawHeaders.length - 1;
		while (lastNonEmpty >= 0 && rawHeaders[lastNonEmpty] === "") {
			lastNonEmpty--;
		}
		const trimmedHeaders = rawHeaders.slice(0, lastNonEmpty + 1);

		// Deduplicate headers: append _2, _3 etc. for repeated names (including "")
		const seen = new Map<string, number>();
		const dedupedHeaders = trimmedHeaders.map((h, i) => {
			const key = h === "" ? `Col ${i + 1}` : h;
			const count = seen.get(key) ?? 0;
			seen.set(key, count + 1);
			return count === 0 ? key : `${key}_${count + 1}`;
		});

		const trimmedRows = dataRows.map((row) =>
			row.slice(0, dedupedHeaders.length),
		);
		return { headers: dedupedHeaders, rows: trimmedRows, error: null };
	}, [deferredContent]);

	// When rows change due to an external file load, reset editRows.
	// Skip the reset when rows changed because we called onContentChange ourselves.
	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional
	useEffect(() => {
		if (isMyEditRef.current) {
			isMyEditRef.current = false;
			return;
		}
		setEditRows(null);
	}, [rows]);

	// Detect line ending
	const lineEnding = useMemo(() => {
		if (deferredContent.includes("\r\n")) return "CRLF";
		if (deferredContent.includes("\r")) return "CR";
		return "LF";
	}, [deferredContent]);

	// Use editRows when available (user has made edits), otherwise fall back to parsed rows
	const data = useMemo(
		() =>
			(editRows ?? rows).map((row) =>
				Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])),
			),
		[editRows, rows, headers],
	);

	// Run SQL query against data when in SQL mode
	const sqlResult = useMemo(() => {
		if (queryMode !== "sql") return null;
		try {
			// Register parsed CSV rows as table "csv"
			(alasql as any).tables.csv = { data };
			const rows = alasql(sqlQuery) as Record<string, string>[];
			return {
				rows: rows.map((r) =>
					Object.fromEntries(
						Object.entries(r).map(([k, v]) => [k, v == null ? "" : String(v)]),
					),
				),
				error: null,
			};
		} catch (e) {
			return { rows: null, error: (e as Error).message };
		}
	}, [queryMode, sqlQuery, data]);

	// Update sqlError state as side-effect of sqlResult
	useEffect(() => {
		setSqlError(sqlResult?.error ?? null);
	}, [sqlResult]);

	// Display data: SQL result rows (if SQL mode + no error) or raw parsed data
	const displayData = useMemo(
		() => (queryMode === "sql" && sqlResult?.rows ? sqlResult.rows : data),
		[queryMode, sqlResult, data],
	);

	// Display headers: derived from SQL result keys or original CSV headers
	const displayHeaders = useMemo(
		() => (displayData.length > 0 ? Object.keys(displayData[0]) : headers),
		[displayData, headers],
	);

	const columnHelper = createColumnHelper<Record<string, string>>();

	// biome-ignore lint/correctness/useExhaustiveDependencies: no need
	const columns = useMemo(
		() =>
			displayHeaders.map((h, i) =>
				columnHelper.accessor(h, {
					id: `col-${i}`,
					header: h,
					cell: (info) => info.getValue(),
					size: 150,
					minSize: 60,
				}),
			),
		[displayHeaders],
	);

	const table = useReactTable({
		data: displayData,
		columns,
		columnResizeMode: "onChange",
		// Disable TanStack filtering in SQL mode — SQL handles it
		state: {
			sorting,
			globalFilter: queryMode === "sql" ? "" : globalFilter,
			columnFilters,
			columnSizing,
		},
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onColumnFiltersChange: setColumnFilters,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	function commitEdit() {
		const cell = editingCellRef.current;
		if (!cell) return;
		editingCellRef.current = null;
		const baseRows = editRows ?? rows;
		const newRows = baseRows.map((r, ri) =>
			ri === cell.rowIndex
				? r.map((c, ci) => (ci === cell.colIndex ? cell.draftValue : c))
				: r,
		);
		isMyEditRef.current = true;
		setEditRows(newRows);
		if (onContentChange) {
			onContentChange(Papa.unparse([headers, ...newRows]));
		}
		setEditingCell(null);
	}

	if (!deferredContent.trim()) {
		return (
			<div className="preview-empty">
				<p>Start typing CSV in the editor...</p>
			</div>
		);
	}

	// Skip skeleton while a cell is being edited to avoid flicker on commit
	if (isStale && !editingCell) return <CsvSkeleton />;

	if (error) {
		return (
			<div className="json-error">
				<div className="json-error-badge">Invalid CSV</div>
				<pre className="json-error-message">{error}</pre>
			</div>
		);
	}

	const filteredRowCount = table.getFilteredRowModel().rows.length;
	const totalRows = displayData.length;
	const colCount = displayHeaders.length;

	return (
		<div className="csv-preview">
			{/* ── Top toolbar ── */}
			<div className="csv-toolbar">
				{onClearCsv && (
					<Button variant="destructive" onClick={onClearCsv} title="Clear data">
						<IconTrash size={12} />
						Clear
					</Button>
				)}
				<div className="flex items-stretch rounded bg-[var(--border)] overflow-hidden flex-shrink-0">
					<Button
						variant={queryMode === "search" ? "primary" : "ghost"}
						onClick={() => {
							setQueryMode("search");
							setSelectedCell(null);
							setEditingCell(null);
						}}
						className="w-auto rounded-none py-[3px] px-[8px] text-[11px] font-medium uppercase"
					>
						<IconFilter size={13} />
						Filter
					</Button>
					<div className="w-px self-stretch bg-[var(--border)] flex-shrink-0" />
					<Button
						variant={queryMode === "sql" ? "primary" : "ghost"}
						onClick={() => {
							setQueryMode("sql");
							setSelectedCell(null);
							setEditingCell(null);
						}}
						className="w-auto rounded-none py-[3px] px-[8px] text-[11px] font-medium uppercase"
					>
						<IconDatabase size={13} />
						SQL
					</Button>
				</div>
				{queryMode === "search" ? (
					<SearchInput onFilter={setGlobalFilter} />
				) : (
					<SqlInput onRun={setSqlQuery} />
				)}
			</div>

			{/* ── SQL error bar ── */}
			{queryMode === "sql" && sqlError && (
				<div className="csv-sql-error">
					<span className="csv-sql-error-badge">SQL Error</span>
					{sqlError}
				</div>
			)}

			{/* ── Table ── */}
			<div className="csv-table-wrapper overscroll-none">
				<table
					className="csv-table"
					style={{ width: table.getCenterTotalSize() }}
				>
					<thead>
						{table.getHeaderGroups().map((hg) => (
							<tr key={hg.id}>
								<th className="csv-row-num w-16 bg-background">#</th>
								{hg.headers.map((header) => (
									<th
										key={header.id}
										style={{ width: header.getSize(), position: "relative" }}
										onClick={header.column.getToggleSortingHandler()}
										className={
											header.column.getCanSort()
												? "sortable bg-background"
												: " bg-background"
										}
									>
										<span className="th-content">
											<span className="th-label">
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											</span>
											<span className="sort-indicator">
												{header.column.getIsSorted() === "asc"
													? " ↑"
													: header.column.getIsSorted() === "desc"
														? " ↓"
														: " ⇅"}
											</span>
										</span>
										{/** biome-ignore lint/a11y/noStaticElementInteractions: no need */}
										<div
											onMouseDown={header.getResizeHandler()}
											onTouchStart={header.getResizeHandler()}
											onClick={(e) => e.stopPropagation()}
											className={`csv-col-resizer${
												header.column.getIsResizing() ? " isResizing" : ""
											}`}
										/>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody>
						{table.getRowModel().rows.map((row) => (
							<tr key={row.id}>
								<td className="csv-row-num">{row.index + 1}</td>
								{row.getVisibleCells().map((cell, colIdx) => {
									const value = String(cell.getValue() ?? "");
									const isSelected =
										selectedCell?.row === row.index + 1 &&
										selectedCell?.col === colIdx + 1;
									return (
										<td
											key={cell.id}
											style={{ width: cell.column.getSize() }}
											className={isSelected ? "csv-cell-selected" : ""}
											onClick={() =>
												setSelectedCell({
													row: row.index + 1,
													col: colIdx + 1,
													value,
												})
											}
											onDoubleClick={(e) => {
												if (queryMode === "sql") return;
												commitEdit();
												setEditingCell({
													rowIndex: row.index,
													colIndex: colIdx,
													draftValue: value,
													anchorEl: e.currentTarget,
												});
												setSelectedCell({
													row: row.index + 1,
													col: colIdx + 1,
													value,
												});
											}}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
				{filteredRowCount === 0 && (
					<div className="csv-no-results">No matching rows</div>
				)}
			</div>

			{/* ── Bottom status bar ── */}
			<div className="csv-statusbar">
				<span className="csv-statusbar-left">
					{filteredRowCount === totalRows
						? `${totalRows} rows × ${colCount} columns`
						: `${filteredRowCount} / ${totalRows} rows × ${colCount} columns`}
				</span>
				<span className="csv-statusbar-center">
					{selectedCell
						? `${selectedCell.row}:${selectedCell.col} (${selectedCell.value.length} chars)`
						: ""}
				</span>
				<span className="csv-statusbar-right">
					<span className="csv-statusbar-chip">UTF-8</span>
					<span className="csv-statusbar-chip">{lineEnding}</span>
				</span>
			</div>

			{/* ── Cell edit popover ── */}
			<Popover.Root
				open={!!editingCell}
				onOpenChange={(open) => {
					if (!open) {
						if (!cancelRef.current) commitEdit();
						else setEditingCell(null);
						cancelRef.current = false;
					}
				}}
			>
				<Popover.Portal>
					<Popover.Positioner
						anchor={editingCell?.anchorEl}
						side="bottom"
						align="start"
						sideOffset={2}
					>
						<Popover.Popup className="z-50 flex flex-col gap-1.5 rounded-md border border-[var(--csv-thead-bg)] bg-[var(--bg-toolbar)] p-2 shadow-xl min-w-[200px] max-w-[360px]">
							<Textarea
								autoFocus
								rows={4}
								className="w-full text-xs font-mono resize-y min-h-[64px]"
								value={editingCell?.draftValue ?? ""}
								onChange={(e) =>
									setEditingCell((prev) =>
										prev ? { ...prev, draftValue: e.target.value } : null,
									)
								}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										commitEdit();
									}
									if (e.key === "Escape") {
										e.preventDefault();
										cancelRef.current = true;
										setEditingCell(null);
									}
								}}
							/>
							<p className="text-[10px] text-[var(--text-muted)] select-none">
								↵ save · Shift+↵ newline · Esc cancel
							</p>
						</Popover.Popup>
					</Popover.Positioner>
				</Popover.Portal>
			</Popover.Root>
		</div>
	);
}
