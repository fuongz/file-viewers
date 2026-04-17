/** biome-ignore-all lint/suspicious/noArrayIndexKey: no need */

import { Cancel01Icon, FileCorruptIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { readXlsx } from "hucre/xlsx";
import { useEffect, useMemo, useState } from "react";
import { useTableState } from "../hooks/useTableState";
import { useAppStore } from "../store";
import { DataTable, TableSkeleton } from "./table";
import {
	Button,
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "./ui";

interface ExcelPreviewProps {
	binaryContent: Uint8Array | undefined;
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
	const {
		sorting,
		setSorting,
		globalFilter,
		setGlobalFilter,
		columnFilters,
		setColumnFilters,
		columnSizing,
		setColumnSizing,
		selectedCell,
		setSelectedCell,
	} = useTableState();

	const displayData = useMemo(
		() =>
			sheet.rows.map((row) =>
				Object.fromEntries(sheet.headers.map((h, i) => [h, row[i] ?? ""])),
			),
		[sheet.rows, sheet.headers],
	);

	const colCount = sheet.headers.length;
	const cellRef = selectedCell
		? `${colLabel(selectedCell.col - 1)}${selectedCell.row}`
		: null;

	return (
		<DataTable
			displayData={displayData}
			displayHeaders={sheet.headers}
			hideSqlToggle
			queryMode="search"
			onFilterMode={() => {}}
			onSqlMode={() => {}}
			sorting={sorting}
			onSortingChange={setSorting}
			globalFilter={globalFilter}
			onGlobalFilterChange={setGlobalFilter}
			columnFilters={columnFilters}
			onColumnFiltersChange={setColumnFilters}
			columnSizing={columnSizing}
			onColumnSizingChange={setColumnSizing}
			selectedCell={selectedCell}
			onCellSelect={setSelectedCell}
			statusRight={
				<span className="csv-statusbar-left">
					{cellRef
						? `${cellRef} · ${displayData.length} rows × ${colCount} cols`
						: `${displayData.length} rows × ${colCount} cols`}
				</span>
			}
			bottomSlot={
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
			}
		/>
	);
}

// ── ExcelPreview ──────────────────────────────────────────────────────────────

export function ExcelPreview({ binaryContent }: ExcelPreviewProps) {
	const { closeTab, activeTabId } = useAppStore();
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

					while (rows.length < MIN_ROWS) rows.push(headers.map(() => ""));

					return { name: sheet.name, headers, rows };
				});
				setSheets(parsed);
			})
			.catch((e) => setError((e as Error).message));
	}, [binaryContent]);

	if (!binaryContent) {
		return (
			<div className="flex h-full items-center justify-center">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="default" className="size-24">
							<HugeiconsIcon
								strokeWidth={0.5}
								className="size-20 text-[var(--text-muted)]"
								icon={FileCorruptIcon}
							/>
						</EmptyMedia>
					</EmptyHeader>
					<EmptyTitle>File not found.</EmptyTitle>
					<EmptyDescription>
						Select an Excel file to preview it.
					</EmptyDescription>
					<EmptyContent>
						<Button variant="destructive" onClick={() => closeTab(activeTabId)}>
							<HugeiconsIcon icon={Cancel01Icon} />
							Close Preview
						</Button>
					</EmptyContent>
				</Empty>
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

	if (!sheets) return <TableSkeleton />;

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
