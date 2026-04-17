/** biome-ignore-all lint/suspicious/noArrayIndexKey: no need */

import { Popover } from "@base-ui/react";
import { Trash } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import alasql from "alasql";
import Papa from "papaparse";
import type React from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useTableState } from "../hooks/useTableState";
import { DataTable, TableSkeleton } from "./table";
import { Button, Textarea } from "./ui";

interface CsvPreviewProps {
	content: string;
	onContentChange?: (content: string) => void;
	onClearCsv?: () => void;
}

interface EditingCell {
	rowIndex: number; // original data index
	colIndex: number; // column index
	draftValue: string;
	anchorEl: Element;
}

// ── CsvPreview ────────────────────────────────────────────────────────────────

export function CsvPreview({
	content,
	onContentChange,
	onClearCsv,
}: CsvPreviewProps) {
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
		queryMode,
		setQueryMode,
	} = useTableState();

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
		const raw = deferredContent.trim().replace(/^\uFEFF/, "");
		const result = Papa.parse<string[]>(raw, { skipEmptyLines: true });
		if (result.errors.length > 0 && result.data.length === 0) {
			return { headers: [], rows: [], error: result.errors[0].message };
		}
		const [headerRow, ...dataRows] = result.data;
		const rawHeaders = headerRow ?? [];

		// Strip trailing empty columns
		let lastNonEmpty = rawHeaders.length - 1;
		while (lastNonEmpty >= 0 && rawHeaders[lastNonEmpty] === "") lastNonEmpty--;
		const trimmedHeaders = rawHeaders.slice(0, lastNonEmpty + 1);

		// Deduplicate headers
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

	// When rows change due to external file load, reset editRows
	useEffect(() => {
		if (isMyEditRef.current) {
			isMyEditRef.current = false;
			return;
		}
		setEditRows(null);
	}, [rows]);

	const lineEnding = useMemo(() => {
		if (deferredContent.includes("\r\n")) return "CRLF";
		if (deferredContent.includes("\r")) return "CR";
		return "LF";
	}, [deferredContent]);

	const data = useMemo(
		() =>
			(editRows ?? rows).map((row) =>
				Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ""])),
			),
		[editRows, rows, headers],
	);

	const sqlResult = useMemo(() => {
		if (queryMode !== "sql") return null;
		try {
			(alasql as any).tables.csv = { data };
			const resultRows = alasql(sqlQuery) as Record<string, string>[];
			return {
				rows: resultRows.map((r) =>
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

	useEffect(() => {
		setSqlError(sqlResult?.error ?? null);
	}, [sqlResult]);

	const displayData = useMemo(
		() => (queryMode === "sql" && sqlResult?.rows ? sqlResult.rows : data),
		[queryMode, sqlResult, data],
	);

	const displayHeaders = useMemo(
		() => (displayData.length > 0 ? Object.keys(displayData[0]) : headers),
		[displayData, headers],
	);

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
		if (onContentChange) onContentChange(Papa.unparse([headers, ...newRows]));
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
	if (isStale && !editingCell) return <TableSkeleton />;

	if (error) {
		return (
			<div className="json-error">
				<div className="json-error-badge">Invalid CSV</div>
				<pre className="json-error-message">{error}</pre>
			</div>
		);
	}

	return (
		<DataTable
			displayData={displayData}
			displayHeaders={displayHeaders}
			queryMode={queryMode}
			onFilterMode={() => {
				setQueryMode("search");
				setSelectedCell(null);
				setEditingCell(null);
			}}
			onSqlMode={() => {
				setQueryMode("sql");
				setSelectedCell(null);
				setEditingCell(null);
			}}
			sqlError={sqlError}
			onSqlRun={setSqlQuery}
			sqlTableName="csv"
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
			onCellDoubleClick={(rowIndex, colIndex, value, anchorEl) => {
				commitEdit();
				setEditingCell({ rowIndex, colIndex, draftValue: value, anchorEl });
				setSelectedCell({ row: rowIndex + 1, col: colIndex + 1, value });
			}}
			toolbarLeading={
				onClearCsv ? (
					<Button type="button" variant="destructive" onClick={onClearCsv}>
						<HugeiconsIcon icon={Trash} />
						Clear file
					</Button>
				) : undefined
			}
			statusRight={
				<>
					<span className="csv-statusbar-chip">UTF-8</span>
					<span className="csv-statusbar-chip">{lineEnding}</span>
				</>
			}
			overlay={
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
									onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
										setEditingCell((prev) =>
											prev ? { ...prev, draftValue: e.target.value } : null,
										)
									}
									onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
			}
		/>
	);
}
