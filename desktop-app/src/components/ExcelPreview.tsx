/** biome-ignore-all lint/suspicious/noArrayIndexKey: no need */

import { IconSearch } from "@tabler/icons-react";
import {
	type ColumnSizingState,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { readXlsx } from "hucre/xlsx";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "./ui";

interface ExcelPreviewProps {
	binaryContent: Uint8Array | undefined;
}

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

function ExcelSkeleton() {
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

type CellValue = string | number | boolean | Date | null | undefined;

interface ParsedSheet {
	name: string;
	headers: string[];
	rows: string[][];
}

function colLabel(i: number): string {
	let label = "";
	let n = i + 1;
	while (n > 0) {
		const rem = (n - 1) % 26;
		label = String.fromCharCode(65 + rem) + label;
		n = Math.floor((n - 1) / 26);
	}
	return label;
}

function cellToString(val: CellValue): string {
	if (val == null) return "";
	if (val instanceof Date) return val.toLocaleDateString();
	return String(val);
}

// ── SearchInput ───────────────────────────────────────────────────────────────

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

// ── SheetTable ────────────────────────────────────────────────────────────────

interface SheetTableProps {
	sheet: ParsedSheet;
	sheets: ParsedSheet[];
	activeSheet: number;
	onSheetChange: (i: number) => void;
}

function SheetTable({
	sheet,
	sheets,
	activeSheet,
	onSheetChange,
}: SheetTableProps) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
	const [selectedCell, setSelectedCell] = useState<{
		row: number;
		col: number;
	} | null>(null);
	const [hoveredCell, setHoveredCell] = useState<{
		row: number;
		col: number;
	} | null>(null);

	const columnHelper = createColumnHelper<Record<string, string>>();

	// biome-ignore lint/correctness/useExhaustiveDependencies: no need
	const columns = useMemo(
		() =>
			sheet.headers.map((h, i) =>
				columnHelper.accessor(h, {
					id: `col-${i}`,
					header: h,
					cell: (info) => info.getValue(),
					size: 150,
					minSize: 60,
				}),
			),
		[sheet.headers],
	);

	const data = useMemo(
		() =>
			sheet.rows.map((row) =>
				Object.fromEntries(sheet.headers.map((h, i) => [h, row[i] ?? ""])),
			),
		[sheet.rows, sheet.headers],
	);

	const table = useReactTable({
		data,
		columns,
		columnResizeMode: "onChange",
		state: { sorting, globalFilter, columnSizing },
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	const filteredRowCount = table.getFilteredRowModel().rows.length;
	const totalRows = data.length;
	const colCount = sheet.headers.length;
	const cellRef = selectedCell
		? `${colLabel(selectedCell.col)}${selectedCell.row + 1}`
		: null;

	return (
		<div className="csv-preview">
			<div className="csv-toolbar">
				<SearchInput onFilter={setGlobalFilter} />
			</div>

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
												: "bg-background"
										}
									>
										<span className="th-content">
											{flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
											<span className="sort-indicator">
												{header.column.getIsSorted() === "asc"
													? " ↑"
													: header.column.getIsSorted() === "desc"
														? " ↓"
														: " ⇅"}
											</span>
										</span>
										{/** biome-ignore lint/a11y/useKeyWithClickEvents: no need */}
										{/** biome-ignore lint/a11y/noStaticElementInteractions: no need */}
										<div
											onMouseDown={header.getResizeHandler()}
											onTouchStart={header.getResizeHandler()}
											onClick={(e) => e.stopPropagation()}
											className={`csv-col-resizer${header.column.getIsResizing() ? " isResizing" : ""}`}
										/>
									</th>
								))}
							</tr>
						))}
					</thead>
					<tbody onMouseLeave={() => setHoveredCell(null)}>
						{table.getRowModel().rows.map((row) => (
							<tr key={row.id}>
								<td className="csv-row-num">{row.index + 1}</td>
								{row.getVisibleCells().map((cell, colIdx) => {
									const isHovered =
										hoveredCell?.row === row.index &&
										hoveredCell?.col === colIdx;
									return (
										<td
											key={cell.id}
											style={{ width: cell.column.getSize(), position: "relative" }}
											className={
												selectedCell?.row === row.index &&
												selectedCell?.col === colIdx
													? "csv-cell-selected"
													: undefined
											}
											onMouseEnter={() =>
												setHoveredCell({ row: row.index, col: colIdx })
											}
											onClick={() =>
												setSelectedCell({ row: row.index, col: colIdx })
											}
											onKeyDown={(e) =>
												e.key === "Enter" &&
												setSelectedCell({ row: row.index, col: colIdx })
											}
										>
											{isHovered && (
												<span className="absolute top-0 left-0 z-20 px-1 leading-tight text-[9px] font-mono font-semibold rounded-br bg-[var(--accent)] text-white pointer-events-none select-none">
													{colLabel(colIdx)}{row.index + 1}
												</span>
											)}
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
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

			<div className="flex items-center gap-0 border-t border-[var(--border)] bg-app px-2 flex-shrink-0 overflow-x-auto">
				{sheets.map((s, i) => (
					<button
						key={i}
						type="button"
						onClick={() => onSheetChange(i)}
						className={`px-3 py-1.5 text-xs cursor-pointer whitespace-nowrap border-t-2 transition-colors bg-transparent ${
							i === activeSheet
								? "border-[var(--accent)] text-foreground font-semibold"
								: "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
						}`}
					>
						{s.name}
					</button>
				))}
			</div>
			<div className="csv-statusbar">
				<span className="csv-statusbar-left">
					{cellRef
						? `${cellRef} · ${filteredRowCount === totalRows ? `${totalRows} rows × ${colCount} cols` : `${filteredRowCount} / ${totalRows} rows × ${colCount} cols`}`
						: filteredRowCount === totalRows
							? `${totalRows} rows × ${colCount} columns`
							: `${filteredRowCount} / ${totalRows} rows × ${colCount} columns`}
				</span>
			</div>
		</div>
	);
}

// ── ExcelPreview ──────────────────────────────────────────────────────────────

export function ExcelPreview({ binaryContent }: ExcelPreviewProps) {
	const [sheets, setSheets] = useState<ParsedSheet[] | null>(null);
	const [activeSheet, setActiveSheet] = useState(0);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!binaryContent) return;
		setSheets(null);
		setError(null);
		setActiveSheet(0);

		readXlsx(binaryContent)
			.then((wb) => {
				const source = wb.sheets.length
					? wb.sheets
					: [{ name: "Sheet 1", rows: [] }];
				const parsed: ParsedSheet[] = source.map((sheet) => {
					const rawRows = sheet.rows as CellValue[][];

					const MIN_COLS = 26;
					const MIN_ROWS = 100;

					const maxCols = rawRows.length
						? Math.max(MIN_COLS, ...rawRows.map((r) => r.length))
						: MIN_COLS;
					const headers = Array.from({ length: maxCols }, (_, i) =>
						colLabel(i),
					);
					const rows = rawRows.map((row) =>
						headers.map((_, i) => cellToString(row[i])),
					);

					while (rows.length < MIN_ROWS) {
						rows.push(headers.map(() => ""));
					}

					return { name: sheet.name, headers, rows };
				});
				setSheets(parsed);
			})
			.catch((e) => setError((e as Error).message));
	}, [binaryContent]);

	if (!binaryContent) {
		return (
			<div className="preview-empty">
				<p>No Excel file loaded.</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="json-error">
				<div className="json-error-badge">Invalid XLSX</div>
				<pre className="json-error-message">{error}</pre>
			</div>
		);
	}

	if (!sheets) return <ExcelSkeleton />;

	const sheet = sheets[activeSheet];

	return (
		<div className="flex flex-col h-full">
			{sheet && (
				<SheetTable
					key={activeSheet}
					sheet={sheet}
					sheets={sheets}
					activeSheet={activeSheet}
					onSheetChange={setActiveSheet}
				/>
			)}
		</div>
	);
}
