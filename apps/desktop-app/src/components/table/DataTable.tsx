import {
	type ColumnFiltersState,
	type ColumnSizingState,
	createColumnHelper,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import {
	type Dispatch,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { flushSync } from "react-dom";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "../ui";
import {
	type CtxMenuState,
	DataTableContextMenuContent,
} from "./DataTableContextMenu";
import { DataTableHeader } from "./DataTableHeader";
import { DataTableStatusBar } from "./DataTableStatusBar";
import { DataTableToolbar } from "./DataTableToolbar";
import { createSelectionDisplay } from "./hooks/selectionTypes";
import { useCellInteractions } from "./hooks/useCellInteractions";
import { useTableKeyboard } from "./hooks/useTableKeyboard";
import type { DragRange, QueryMode, SelectedCell } from "./types";
import { ROW_NUM_W, VirtualRow } from "./VirtualRow";

const columnHelper = createColumnHelper<Record<string, unknown>>();

export interface DataTableProps {
	displayData: Record<string, unknown>[];
	displayHeaders: string[];

	queryMode: QueryMode;
	onFilterMode?: () => void;
	onSqlMode?: () => void;
	hideSqlToggle?: boolean;
	hideFilterToggle?: boolean;
	sqlConnecting?: boolean;
	sqlLoading?: boolean;
	sqlError?: string | null;
	onSqlRun?: (query: string) => void;
	sqlTableName?: string;

	sorting: SortingState;
	onSortingChange: Dispatch<SetStateAction<SortingState>>;
	globalFilter?: string;
	onGlobalFilterChange?: Dispatch<SetStateAction<string>>;
	columnFilters?: ColumnFiltersState;
	onColumnFiltersChange?: Dispatch<SetStateAction<ColumnFiltersState>>;
	columnSizing: ColumnSizingState;
	onColumnSizingChange: Dispatch<SetStateAction<ColumnSizingState>>;

	selectedCell: SelectedCell | null;
	onCellSelect: Dispatch<SetStateAction<SelectedCell | null>>;
	onCellDoubleClick?: (
		rowIndex: number,
		colIndex: number,
		value: string,
		anchorEl: Element,
	) => void;
	onCellChange?: (rowIndex: number, colIndex: number, value: string) => void;
	onCellBatchChange?: (changes: Array<[number, number, string]>) => void;

	selectedRows?: Set<number>;
	onSelectedRowsChange?: (rows: Set<number>) => void;

	onDeleteRows?: (rowIndices: number[]) => void;
	onDeleteColumn?: (colIdx: number) => void;
	onInsertRowAbove?: (rowIndex: number) => void;
	onInsertRowBelow?: (rowIndex: number) => void;
	onMoveRowUp?: (rowIndex: number) => void;
	onMoveRowDown?: (rowIndex: number) => void;

	onUndo?: () => void;
	onRedo?: () => void;

	renderCellValue?: (value: unknown) => ReactNode;

	toolbarLeading?: ReactNode;
	statusRight?: ReactNode;
	bottomSlot?: ReactNode;
	overlay?: ReactNode;
}

export function DataTable({
	displayData,
	displayHeaders,
	queryMode,
	onFilterMode,
	onSqlMode,
	hideSqlToggle,
	hideFilterToggle,
	sqlConnecting,
	sqlLoading,
	sqlError,
	onSqlRun,
	sqlTableName = "data",
	sorting,
	onSortingChange,
	globalFilter,
	onGlobalFilterChange,
	columnFilters,
	onColumnFiltersChange,
	columnSizing,
	onColumnSizingChange,
	selectedCell,
	onCellSelect,
	onCellDoubleClick,
	onCellChange,
	onCellBatchChange,
	selectedRows,
	onSelectedRowsChange,
	onDeleteRows,
	onDeleteColumn,
	onInsertRowAbove,
	onInsertRowBelow,
	onMoveRowUp,
	onMoveRowDown,
	onUndo,
	onRedo,
	renderCellValue,
	toolbarLeading,
	statusRight,
	bottomSlot,
	overlay,
}: DataTableProps) {
	const tableContainerRef = useRef<HTMLDivElement>(null);
	const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
	const [cmdCells, setCmdCells] = useState<Set<string>>(new Set());
	const cmdCellsRef = useRef(cmdCells);
	cmdCellsRef.current = cmdCells;

	const [dragRange, setDragRange] = useState<DragRange | null>(null);
	const isDraggingCellRef = useRef(false);
	const dragCellAnchorRef = useRef<{ row: number; col: number } | null>(null);
	const isDraggingRowRef = useRef(false);
	const dragRowAnchorRef = useRef<number | null>(null);
	const didDragRowRef = useRef(false);
	const lastRowAnchorRef = useRef<number | null>(null);

	useEffect(() => {
		const onMouseUp = () => {
			if (isDraggingRowRef.current) {
				isDraggingRowRef.current = false;
				dragRowAnchorRef.current = null;
				if (tableContainerRef.current)
					tableContainerRef.current.style.userSelect = "";
			}
			if (!isDraggingCellRef.current) return;
			isDraggingCellRef.current = false;
			dragCellAnchorRef.current = null;
			if (tableContainerRef.current)
				tableContainerRef.current.style.userSelect = "";
		};
		document.addEventListener("mouseup", onMouseUp);
		return () => document.removeEventListener("mouseup", onMouseUp);
	}, []);

	const columns = useMemo(
		() =>
			displayHeaders.map((h, i) =>
				columnHelper.accessor(h, {
					id: `col-${i}`,
					header: h,
					cell: (info) => {
						const value = info.getValue();
						if (renderCellValue) return renderCellValue(value);
						if (value === null || value === undefined) {
							return <span className="text-[var(--text-muted)]">null</span>;
						}
						if (typeof value === "object") return JSON.stringify(value);
						return String(value);
					},
					size: 150,
					minSize: 60,
				}),
			),
		[displayHeaders, renderCellValue],
	);

	const table = useReactTable({
		data: displayData,
		columns,
		columnResizeMode: "onChange",
		state: {
			sorting,
			globalFilter: queryMode === "sql" ? "" : (globalFilter ?? ""),
			columnFilters: columnFilters ?? [],
			columnSizing,
		},
		onSortingChange,
		onGlobalFilterChange,
		onColumnFiltersChange,
		onColumnSizingChange,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	const columnSizeVars = useMemo(() => {
		const vars: Record<string, number> = {};
		for (const header of table.getFlatHeaders()) {
			vars[`--header-${header.id}-size`] = header.getSize();
			vars[`--col-${header.column.id}-size`] = header.column.getSize();
		}
		return vars;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [columnSizing, displayHeaders]);

	const { rows: tableRows } = table.getRowModel();

	const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(
		null,
	);
	const rowVirtualizer = useVirtualizer({
		count: tableRows.length,
		estimateSize: () => 33,
		getScrollElement: () => tableContainerRef.current,
		measureElement:
			typeof window !== "undefined" &&
			navigator.userAgent.indexOf("Firefox") === -1
				? (element) => element?.getBoundingClientRect().height
				: undefined,
		overscan: 5,
	});
	virtualizerRef.current = rowVirtualizer;

	const measureElement = useCallback((node: Element | null) => {
		virtualizerRef.current?.measureElement(node);
	}, []);

	// Stable refs so callbacks never go stale
	const selectedRowsRef = useRef(selectedRows);
	selectedRowsRef.current = selectedRows;
	const onSelectedRowsChangeRef = useRef(onSelectedRowsChange);
	onSelectedRowsChangeRef.current = onSelectedRowsChange;
	const onCellSelectRef = useRef(onCellSelect);
	onCellSelectRef.current = onCellSelect;
	const setDragRangeRef = useRef(setDragRange);
	setDragRangeRef.current = setDragRange;
	const colCountRef = useRef(displayHeaders.length);
	colCountRef.current = displayHeaders.length;

	const selectedCellRef = useRef(selectedCell);
	selectedCellRef.current = selectedCell;
	const dragRangeRef = useRef(dragRange);
	dragRangeRef.current = dragRange;
	const displayDataRef = useRef(displayData);
	displayDataRef.current = displayData;
	const displayHeadersRef = useRef(displayHeaders);
	displayHeadersRef.current = displayHeaders;
	const onCellChangeRef = useRef(onCellChange);
	onCellChangeRef.current = onCellChange;
	const onCellBatchChangeRef = useRef(onCellBatchChange);
	onCellBatchChangeRef.current = onCellBatchChange;
	const onCellDoubleClickRef = useRef<
		| ((
				rowIndex: number,
				colIndex: number,
				value: string,
				anchorEl: Element,
		  ) => void)
		| undefined
	>(undefined);
	onCellDoubleClickRef.current = onCellDoubleClick;
	const onUndoRef = useRef(onUndo);
	onUndoRef.current = onUndo;
	const onRedoRef = useRef(onRedo);
	onRedoRef.current = onRedo;
	const setCmdCellsRef = useRef(setCmdCells);
	setCmdCellsRef.current = setCmdCells;

	// ── Keyboard shortcuts ──
	useTableKeyboard({
		selectedCellRef,
		dragRangeRef,
		cmdCellsRef,
		displayDataRef,
		displayHeadersRef,
		onCellChangeRef,
		onCellBatchChangeRef,
		onCellDoubleClickRef,
		onUndoRef,
		onRedoRef,
		setCmdCellsRef,
		tableContainerRef,
	});

	// ── Cell interactions ──
	const {
		handleCellClick,
		handleColSelect: handleColSelectFromHook,
		handleRowChevronClick,
		handleRowClick,
		handleTbodyMouseDown,
		handleTbodyMouseMove,
	} = useCellInteractions({
		selectedCellRef,
		selectedRowsRef,
		cmdCellsRef,
		onCellSelectRef,
		onSelectedRowsChangeRef,
		setDragRangeRef,
		setCmdCellsRef,
		displayDataRef,
		colCountRef,
		tableContainerRef,
		setCtxMenu,
		lastRowAnchorRef,
		didDragRowRef,
		dragRowAnchorRef,
		isDraggingRowRef,
		isDraggingCellRef,
		dragCellAnchorRef,
	});

	// Selection state for VirtualRow
	const selection = useMemo(
		() => ({
			cell: selectedCell,
			range: dragRange,
			cmdCells,
			rows: selectedRows ?? new Set(),
		}),
		[selectedCell, dragRange, cmdCells, selectedRows],
	);

	const selectionDisplay = useMemo(
		() => createSelectionDisplay(selection),
		[selection],
	);

	const tableRef = useRef(table);
	tableRef.current = table;

	const handleColumnContextMenu = useCallback((colIdx: number) => {
		flushSync(() => setCtxMenu({ type: "column", colIdx }));
	}, []);

	const handleSortColumn = useCallback((colIdx: number, desc: boolean) => {
		tableRef.current.getFlatHeaders()[colIdx]?.column.toggleSorting(desc);
	}, []);

	const handleColSelect = handleColSelectFromHook;

	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLTableSectionElement>) => {
			const ctxEl = (e.target as Element).closest(
				"[data-ctx-type]",
			) as HTMLElement | null;
			if (!ctxEl) {
				e.preventDefault();
				e.stopPropagation();
				return;
			}
			const type = ctxEl.dataset.ctxType;
			const rowIndex = Number(ctxEl.dataset.ctxRow);
			if (type === "cell") {
				const colIndex = Number(ctxEl.dataset.ctxCol);
				const value = ctxEl.dataset.ctxVal ?? "";
				const range = dragRangeRef.current;
				const cell = selectedCellRef.current;
				const cmd = cmdCellsRef.current;
				const cellAlreadySelected =
					cmd.has(`${rowIndex}:${colIndex}`) ||
					(range
						? rowIndex >= range.startRow &&
							rowIndex <= range.endRow &&
							colIndex >= range.startCol &&
							colIndex <= range.endCol
						: cell?.row === rowIndex + 1 && cell?.col === colIndex + 1);
				if (!cellAlreadySelected) {
					onCellSelectRef.current({
						row: rowIndex + 1,
						col: colIndex + 1,
						value,
					});
					setDragRangeRef.current(null);
					setCmdCellsRef.current(new Set());
					dragCellAnchorRef.current = { row: rowIndex, col: colIndex };
					if (selectedRowsRef.current?.size) {
						onSelectedRowsChangeRef.current?.(new Set());
						lastRowAnchorRef.current = null;
					}
				}
				flushSync(() =>
					setCtxMenu({ type: "cell", rowIndex, colIndex, value }),
				);
			} else {
				const alreadySelected = selectedRowsRef.current?.has(rowIndex) ?? false;
				if (!alreadySelected) {
					onSelectedRowsChangeRef.current?.(new Set([rowIndex]));
					lastRowAnchorRef.current = rowIndex;
					setDragRangeRef.current({
						startRow: rowIndex,
						endRow: rowIndex,
						startCol: 0,
						endCol: colCountRef.current - 1,
					});
					onCellSelectRef.current(null);
					setCmdCellsRef.current(new Set());
				}
				flushSync(() => setCtxMenu({ type: "row", rowIndex }));
			}
		},
		[],
	);

	const filteredRowCount = tableRows.length;
	const totalRows = displayData.length;
	const colCount = displayHeaders.length;

	const selectionStats = useMemo(() => {
		if (selectedRows && selectedRows.size > 0) {
			let sum = 0;
			for (const rowIdx of selectedRows) {
				const row = displayData[rowIdx];
				if (!row) continue;
				for (const key of displayHeaders) {
					const v = Number(row[key]);
					if (Number.isFinite(v)) sum += v;
				}
			}
			const firstRow = Math.min(...Array.from(selectedRows));
			return {
				pos: `${firstRow + 2}:1`,
				cells: selectedRows.size * colCount,
				sum,
			};
		}
		if (cmdCells.size > 0) {
			let sum = 0;
			for (const key of cmdCells) {
				const [r, c] = key.split(":").map(Number);
				const row = displayData[r];
				if (!row) continue;
				const v = Number(row[displayHeaders[c]]);
				if (Number.isFinite(v)) sum += v;
			}
			return { pos: `${cmdCells.size} cells`, cells: cmdCells.size, sum };
		}
		if (selectedCell && !dragRange) {
			const v = Number(selectedCell.value);
			return {
				pos: `${selectedCell.row + 1}:${selectedCell.col}`,
				cells: 1,
				sum: Number.isFinite(v) ? v : 0,
			};
		}
		return null;
	}, [
		selectedRows,
		cmdCells,
		selectedCell,
		dragRange,
		displayData,
		displayHeaders,
		colCount,
	]);

	return (
		<div className="flex flex-col h-full overview-hidden max-w-full">
			{/* ── Toolbar ── */}
			<DataTableToolbar
				queryMode={queryMode}
				onFilterMode={onFilterMode}
				onSqlMode={onSqlMode}
				hideSqlToggle={hideSqlToggle}
				hideFilterToggle={hideFilterToggle}
				sqlConnecting={sqlConnecting}
				sqlLoading={sqlLoading}
				onSqlRun={onSqlRun}
				sqlTableName={sqlTableName}
				onGlobalFilterChange={onGlobalFilterChange}
				toolbarLeading={toolbarLeading}
			/>

			{/* ── SQL error bar ── */}
			{queryMode === "sql" && sqlError && (
				<div className="csv-sql-error">
					<span className="csv-sql-error-badge">SQL Error</span>
					{sqlError}
				</div>
			)}

			{/* ── Table (virtualized) ── */}
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<div
							ref={tableContainerRef}
							className="flex-1 overflow-auto overscroll-none border border-border rounded-sm m-2"
						/>
					}
				>
					<table
						className="whitespace-nowrap border-collapse text-xs text-foreground"
						style={{
							...(columnSizeVars as React.CSSProperties),
							display: "grid",
							width: table.getCenterTotalSize() + ROW_NUM_W,
						}}
					>
						<DataTableHeader
							table={table}
							dragRange={dragRange}
							selectedCell={selectedCell}
							onColSelect={handleColSelect}
							onDeleteColumn={onDeleteColumn}
							onColumnContextMenu={handleColumnContextMenu}
						/>
						<tbody
							style={{
								display: "grid",
								height: `${rowVirtualizer.getTotalSize()}px`,
								position: "relative",
							}}
							onContextMenu={handleContextMenu}
							onMouseDown={handleTbodyMouseDown}
							onMouseMove={handleTbodyMouseMove}
						>
							{rowVirtualizer.getVirtualItems().map((virtualRow) => {
								const row = tableRows[virtualRow.index];
								return (
									<VirtualRow
										key={row.id}
										row={row}
										virtualRow={virtualRow}
										measureElement={measureElement}
										queryMode={queryMode}
										selection={selection}
										selectionDisplay={selectionDisplay}
										onCellClick={handleCellClick}
										onCellDoubleClick={onCellDoubleClick}
										renderCellValue={renderCellValue}
										onRowClick={handleRowClick}
										onRowChevronClick={handleRowChevronClick}
									/>
								);
							})}
						</tbody>
					</table>
					{filteredRowCount === 0 && !sqlLoading && (
						<div className="csv-no-results">No matching rows</div>
					)}
				</ContextMenuTrigger>
				<ContextMenuContent>
					<DataTableContextMenuContent
						ctxMenu={ctxMenu}
						dragRange={dragRange}
						cmdCells={cmdCells}
						displayData={displayData}
						displayHeaders={displayHeaders}
						selectedRows={selectedRows}
						onCellChange={onCellChange}
						onCellBatchChange={onCellBatchChange}
						onInsertRowAbove={onInsertRowAbove}
						onInsertRowBelow={onInsertRowBelow}
						onMoveRowUp={onMoveRowUp}
						onMoveRowDown={onMoveRowDown}
						onDeleteRows={onDeleteRows}
						onSortColumn={handleSortColumn}
						onDeleteColumn={onDeleteColumn}
					/>
				</ContextMenuContent>
			</ContextMenu>

			{/* ── Status bar ── */}
			<DataTableStatusBar
				sqlLoading={sqlLoading}
				filteredRowCount={filteredRowCount}
				totalRows={totalRows}
				colCount={colCount}
				selectionStats={selectionStats}
				statusRight={statusRight}
			/>
			{bottomSlot}
			{overlay}
		</div>
	);
}
