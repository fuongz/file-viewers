/** biome-ignore-all lint/suspicious/noArrayIndexKey: no need */

import {
	IconArrowDown,
	IconArrowRight,
	IconArrowUp,
	IconChevronDown,
	IconCopy,
	IconDatabase,
	IconEraser,
	IconFilter,
	IconPlus,
	IconSortAscending,
	IconSortDescending,
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
	type Row,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	useVirtualizer,
	type VirtualItem,
	type Virtualizer,
} from "@tanstack/react-virtual";
import {
	type Dispatch,
	memo,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import {
	Button,
	ButtonGroup,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui";
import { SearchInput } from "./SearchInput";
import { SqlInput } from "./SqlInput";
import type { QueryMode, SelectedCell } from "./types";

// ── Module-level constants ─────────────────────────────────────────────────────
const ROW_NUM_W = 40;
const columnHelper = createColumnHelper<Record<string, unknown>>();

// ── Floating context menu ──────────────────────────────────────────────────────
type CtxMenuState =
	| { type: "row"; rowIndex: number }
	| { type: "cell"; rowIndex: number; colIndex: number; value: string };

// ── VirtualRow ─────────────────────────────────────────────────────────────────

interface VirtualRowProps {
	row: Row<Record<string, unknown>>;
	virtualRow: VirtualItem;
	measureElement: (node: Element | null) => void;
	isRowSelected: boolean;
	selectedCellRow: number; // 1-based row of selectedCell, 0 = none
	selectedCellCol: number; // 1-based col of selectedCell, 0 = none
	queryMode: QueryMode;
	onCellSelect: Dispatch<SetStateAction<SelectedCell | null>>;
	onCellDoubleClick?: (
		rowIndex: number,
		colIndex: number,
		value: string,
		anchorEl: Element,
	) => void;
	renderCellValue?: (value: unknown) => ReactNode;
	onRowClick: (rowIndex: number, metaKey: boolean, shiftKey: boolean) => void;
	dragRange?: {
		startRow: number;
		startCol: number;
		endRow: number;
		endCol: number;
	} | null;
	isFirstRowInRange?: boolean;
	isLastRowInRange?: boolean;
}

function VirtualRowComponent({
	row,
	virtualRow,
	measureElement,
	isRowSelected,
	selectedCellRow,
	selectedCellCol,
	queryMode,
	onCellSelect,
	onCellDoubleClick,
	renderCellValue,
	onRowClick,
	dragRange,
	isFirstRowInRange,
	isLastRowInRange,
}: VirtualRowProps) {
	const isRowInRange =
		dragRange != null &&
		row.index >= dragRange.startRow &&
		row.index <= dragRange.endRow;
	return (
		<tr
			data-index={virtualRow.index}
			ref={(node) => measureElement(node)}
			style={{
				transform: `translateY(${virtualRow.start}px)`,
			}}
			className="flex absolute w-full border-b border-border"
		>
			{/* Row number */}
			<td
				data-ctx-type="row"
				data-ctx-row={row.index}
				className={cn(
					isRowSelected
						? "bg-primary/25 text-primary font-semibold"
						: isRowInRange || (!dragRange && selectedCellRow === row.index + 1)
							? "bg-primary/20 text-primary"
							: "bg-muted text-muted-foreground",
					"text-xs border-r select-none font-medium sticky left-0 z-10 flex cursor-pointer justify-center items-center font-mono",
				)}
				style={{
					width: ROW_NUM_W,
				}}
				onClick={(e) => {
					e.stopPropagation();
					onRowClick(row.index, e.metaKey || e.ctrlKey, e.shiftKey);
				}}
			>
				<span>{row.index + 2}</span>
			</td>

			{/* Data cells */}
			{row.getVisibleCells().map((cell, colIdx) => {
				const rawValue = cell.getValue();
				const displayValue =
					rawValue === null || rawValue === undefined
						? "null"
						: typeof rawValue === "object"
							? JSON.stringify(rawValue)
							: String(rawValue);
				const isSelected =
					selectedCellRow === row.index + 1 && selectedCellCol === colIdx + 1;
				const isCellInRange =
					isRowInRange &&
					colIdx >= dragRange!.startCol &&
					colIdx <= dragRange!.endCol;
				const isTopEdge = isCellInRange && isFirstRowInRange;
				const isBottomEdge = isCellInRange && isLastRowInRange;
				const isLeftEdge = isCellInRange && colIdx === dragRange!.startCol;
				const isRightEdge = isCellInRange && colIdx === dragRange!.endCol;
				const edgeShadowParts: string[] = [];
				if (isTopEdge) edgeShadowParts.push("inset 0 2px 0 0 var(--primary)");
				if (isBottomEdge)
					edgeShadowParts.push("inset 0 -2px 0 0 var(--primary)");
				if (isLeftEdge) edgeShadowParts.push("inset 2px 0 0 0 var(--primary)");
				if (isRightEdge)
					edgeShadowParts.push("inset -2px 0 0 0 var(--primary)");
				return (
					<td
						key={cell.id}
						data-ctx-type="cell"
						data-ctx-row={row.index}
						data-ctx-col={colIdx}
						data-ctx-val={displayValue}
						style={{
							width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
							boxShadow: edgeShadowParts.length
								? edgeShadowParts.join(", ")
								: undefined,
						}}
						className={cn(
							isCellInRange
								? "bg-primary/15 cursor-default"
								: isSelected && !dragRange
									? "cursor-default ring-2 ring-inset ring-primary bg-primary/10"
									: isRowSelected
										? "bg-primary/15"
										: "",
							"select-none truncate flex items-center px-2 py-1 text-xs/relaxed border-r border-border",
						)}
						onClick={() =>
							onCellSelect({
								row: row.index + 1,
								col: colIdx + 1,
								value: displayValue,
							})
						}
						onDoubleClick={
							onCellDoubleClick
								? (e) => {
										if (queryMode === "sql") return;
										onCellDoubleClick(
											row.index,
											colIdx,
											displayValue,
											e.currentTarget,
										);
									}
								: undefined
						}
					>
						{renderCellValue ? (
							renderCellValue(rawValue)
						) : rawValue === null || rawValue === undefined ? (
							<span className="text-[var(--text-muted)]">null</span>
						) : typeof rawValue === "object" ? (
							JSON.stringify(rawValue)
						) : (
							String(rawValue)
						)}
					</td>
				);
			})}
		</tr>
	);
}

function rowPropsEqual(prev: VirtualRowProps, next: VirtualRowProps): boolean {
	if (prev.row !== next.row) return false;
	if (prev.virtualRow.start !== next.virtualRow.start) return false;
	if (prev.isRowSelected !== next.isRowSelected) return false;
	if (prev.queryMode !== next.queryMode) return false;
	if (prev.isFirstRowInRange !== next.isFirstRowInRange) return false;
	if (prev.isLastRowInRange !== next.isLastRowInRange) return false;
	// Only re-render for selection changes that affect this specific row
	const rowNum = prev.row.index + 1;
	const prevOnRow = prev.selectedCellRow === rowNum;
	const nextOnRow = next.selectedCellRow === rowNum;
	if (prevOnRow !== nextOnRow) return false;
	if (prevOnRow && prev.selectedCellCol !== next.selectedCellCol) return false;
	if (prev.dragRange !== next.dragRange) {
		const rowIdx = prev.row.index;
		const prevInRange =
			prev.dragRange != null &&
			rowIdx >= prev.dragRange.startRow &&
			rowIdx <= prev.dragRange.endRow;
		const nextInRange =
			next.dragRange != null &&
			rowIdx >= next.dragRange.startRow &&
			rowIdx <= next.dragRange.endRow;
		if (prevInRange || nextInRange) return false;
	}
	return true;
}

const VirtualRow = memo(VirtualRowComponent, rowPropsEqual);

// ── DataTable ──────────────────────────────────────────────────────────────────

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
	onInsertRowAbove?: (rowIndex: number) => void;
	onInsertRowBelow?: (rowIndex: number) => void;
	onMoveRowUp?: (rowIndex: number) => void;
	onMoveRowDown?: (rowIndex: number) => void;

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
	onInsertRowAbove,
	onInsertRowBelow,
	onMoveRowUp,
	onMoveRowDown,
	renderCellValue,
	toolbarLeading,
	statusRight,
	bottomSlot,
	overlay,
}: DataTableProps) {
	const tableContainerRef = useRef<HTMLDivElement>(null);
	const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

	const [dragRange, setDragRange] = useState<{
		startRow: number;
		startCol: number;
		endRow: number;
		endCol: number;
	} | null>(null);
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

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			// Don't intercept when an input/textarea/contenteditable has focus
			const active = document.activeElement;
			if (
				active &&
				(active.tagName === "INPUT" ||
					active.tagName === "TEXTAREA" ||
					(active as HTMLElement).isContentEditable)
			)
				return;

			const cell = selectedCellRef.current;
			const range = dragRangeStateRef.current;
			const data = displayDataRef.current;
			const headers = displayHeadersRef.current;

			const getCellStr = (rowIdx: number, colIdx: number): string => {
				const row = data[rowIdx];
				if (!row) return "";
				const val = row[headers[colIdx]];
				if (val === null || val === undefined) return "";
				if (typeof val === "object") return JSON.stringify(val);
				return String(val);
			};

			const isMod = e.metaKey || e.ctrlKey;

			// Delete / Backspace → empty selected cells
			if (e.key === "Delete" || e.key === "Backspace") {
				if (range) {
					e.preventDefault();
					const changes: Array<[number, number, string]> = [];
					for (let r = range.startRow; r <= range.endRow; r++)
						for (let c = range.startCol; c <= range.endCol; c++)
							changes.push([r, c, ""]);
					onCellBatchChangeRef.current?.(changes);
				} else if (cell) {
					e.preventDefault();
					onCellChangeRef.current?.(cell.row - 1, cell.col - 1, "");
				}
				return;
			}

			// Enter → open inline editor (single cell only)
			if (e.key === "Enter" && !isMod) {
				if (cell && !range) {
					e.preventDefault();
					const el = tableContainerRef.current?.querySelector(
						`[data-ctx-row="${cell.row - 1}"][data-ctx-col="${cell.col - 1}"][data-ctx-type="cell"]`,
					);
					if (el && onCellDoubleClickRef.current) {
						onCellDoubleClickRef.current(
							cell.row - 1,
							cell.col - 1,
							cell.value,
							el,
						);
					}
				}
				return;
			}

			if (!isMod) return;

			// Cmd/Ctrl+C → copy
			if (e.key === "c") {
				e.preventDefault();
				if (range) {
					const lines: string[] = [];
					for (let r = range.startRow; r <= range.endRow; r++) {
						const cols: string[] = [];
						for (let c = range.startCol; c <= range.endCol; c++)
							cols.push(getCellStr(r, c));
						lines.push(cols.join("\t"));
					}
					navigator.clipboard.writeText(lines.join("\n"));
				} else if (cell) {
					navigator.clipboard.writeText(cell.value);
				}
				return;
			}

			// Cmd/Ctrl+X → cut (copy then empty)
			if (e.key === "x") {
				e.preventDefault();
				if (range) {
					const lines: string[] = [];
					const changes: Array<[number, number, string]> = [];
					for (let r = range.startRow; r <= range.endRow; r++) {
						const cols: string[] = [];
						for (let c = range.startCol; c <= range.endCol; c++) {
							cols.push(getCellStr(r, c));
							changes.push([r, c, ""]);
						}
						lines.push(cols.join("\t"));
					}
					navigator.clipboard.writeText(lines.join("\n"));
					onCellBatchChangeRef.current?.(changes);
				} else if (cell) {
					navigator.clipboard.writeText(cell.value);
					onCellChangeRef.current?.(cell.row - 1, cell.col - 1, "");
				}
				return;
			}

			// Cmd/Ctrl+V → paste
			if (e.key === "v") {
				e.preventDefault();
				navigator.clipboard.readText().then((text) => {
					const pasteRows = text
						.replace(/\r\n/g, "\n")
						.split("\n")
						.map((r) => r.split("\t"));
					let startRow: number;
					let startCol: number;
					if (range) {
						startRow = range.startRow;
						startCol = range.startCol;
					} else if (cell) {
						startRow = cell.row - 1;
						startCol = cell.col - 1;
					} else {
						return;
					}
					const currentData = displayDataRef.current;
					const currentHeaders = displayHeadersRef.current;
					const changes: Array<[number, number, string]> = [];
					for (let ri = 0; ri < pasteRows.length; ri++) {
						for (let ci = 0; ci < pasteRows[ri].length; ci++) {
							const rowIdx = startRow + ri;
							const colIdx = startCol + ci;
							if (rowIdx < currentData.length && colIdx < currentHeaders.length)
								changes.push([rowIdx, colIdx, pasteRows[ri][ci]]);
						}
					}
					if (changes.length === 1) {
						onCellChangeRef.current?.(
							changes[0][0],
							changes[0][1],
							changes[0][2],
						);
					} else if (changes.length > 1) {
						onCellBatchChangeRef.current?.(changes);
					}
				});
				return;
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
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

	// Only recompute CSS vars when column sizing or headers change
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

	// Stable measureElement so it doesn't break VirtualRow memo
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
	// State setter is stable — ref lets us call it from zero-dep callbacks
	const setDragRangeRef = useRef(setDragRange);
	setDragRangeRef.current = setDragRange;
	const colCountRef = useRef(displayHeaders.length);
	colCountRef.current = displayHeaders.length;

	// Keyboard handler refs
	const selectedCellRef = useRef(selectedCell);
	selectedCellRef.current = selectedCell;
	const dragRangeStateRef = useRef(dragRange);
	dragRangeStateRef.current = dragRange;
	const displayDataRef = useRef(displayData);
	displayDataRef.current = displayData;
	const displayHeadersRef = useRef(displayHeaders);
	displayHeadersRef.current = displayHeaders;
	const onCellChangeRef = useRef(onCellChange);
	onCellChangeRef.current = onCellChange;
	const onCellBatchChangeRef = useRef(onCellBatchChange);
	onCellBatchChangeRef.current = onCellBatchChange;
	const onCellDoubleClickRef = useRef(onCellDoubleClick);
	onCellDoubleClickRef.current = onCellDoubleClick;

	const setRowDragRange = useCallback((startRow: number, endRow: number) => {
		setDragRangeRef.current({
			startRow,
			endRow,
			startCol: 0,
			endCol: colCountRef.current - 1,
		});
	}, []);

	const handleRowClick = useCallback(
		(rowIndex: number, metaKey: boolean, shiftKey: boolean) => {
			// If mouseup after a drag, the click event still fires — ignore it
			if (didDragRowRef.current) {
				didDragRowRef.current = false;
				return;
			}
			const change = onSelectedRowsChangeRef.current;
			if (!change) return;
			const current = selectedRowsRef.current;

			if (shiftKey && lastRowAnchorRef.current !== null) {
				const anchor = lastRowAnchorRef.current;
				const start = Math.min(anchor, rowIndex);
				const end = Math.max(anchor, rowIndex);
				const next = new Set(current ?? []);
				for (let i = start; i <= end; i++) next.add(i);
				change(next);
				setRowDragRange(start, end);
			} else if (metaKey) {
				// Toggle — can produce non-contiguous set; use isRowSelected visual fallback
				const next = new Set(current ?? []);
				if (next.has(rowIndex)) next.delete(rowIndex);
				else next.add(rowIndex);
				lastRowAnchorRef.current = rowIndex;
				change(next);
				setDragRangeRef.current(null);
			} else {
				if (current?.size === 1 && current.has(rowIndex)) {
					change(new Set());
					lastRowAnchorRef.current = null;
					setDragRangeRef.current(null);
				} else {
					change(new Set([rowIndex]));
					lastRowAnchorRef.current = rowIndex;
					setRowDragRange(rowIndex, rowIndex);
				}
			}
		},
		[setRowDragRange],
	);

	const handleTbodyMouseDown = useCallback(
		(e: React.MouseEvent<HTMLTableSectionElement>) => {
			if (e.button !== 0) return;
			const el = (e.target as Element).closest(
				"[data-ctx-type]",
			) as HTMLElement | null;
			if (!el) return;

			if (el.dataset.ctxType === "row") {
				const rowIdx = Number(el.dataset.ctxRow);
				dragRowAnchorRef.current = rowIdx;
				isDraggingRowRef.current = true;
				didDragRowRef.current = false;
				onCellSelectRef.current(null);
				setRowDragRange(rowIdx, rowIdx);
				if (tableContainerRef.current)
					tableContainerRef.current.style.userSelect = "none";
			} else if (el.dataset.ctxType === "cell") {
				// Data cell — deselect any selected rows, then start cell-drag
				if (selectedRowsRef.current?.size) {
					onSelectedRowsChangeRef.current?.(new Set());
					lastRowAnchorRef.current = null;
				}
				onCellSelectRef.current(null);
				dragCellAnchorRef.current = {
					row: Number(el.dataset.ctxRow),
					col: Number(el.dataset.ctxCol),
				};
				isDraggingCellRef.current = true;
				setDragRange(null);
				if (tableContainerRef.current)
					tableContainerRef.current.style.userSelect = "none";
			}
		},
		[setRowDragRange],
	);

	const handleTbodyMouseMove = useCallback(
		(e: React.MouseEvent<HTMLTableSectionElement>) => {
			if (isDraggingRowRef.current && dragRowAnchorRef.current !== null) {
				const el = (e.target as Element).closest(
					"[data-ctx-row]",
				) as HTMLElement | null;
				if (!el) return;
				const currentRow = Number(el.dataset.ctxRow);
				const anchor = dragRowAnchorRef.current;
				if (currentRow !== anchor) didDragRowRef.current = true;
				const start = Math.min(anchor, currentRow);
				const end = Math.max(anchor, currentRow);
				const next = new Set<number>();
				for (let i = start; i <= end; i++) next.add(i);
				lastRowAnchorRef.current = anchor;
				onSelectedRowsChangeRef.current?.(next);
				setRowDragRange(start, end);
				return;
			}

			if (!isDraggingCellRef.current || !dragCellAnchorRef.current) return;
			const el = (e.target as Element).closest(
				"[data-ctx-type='cell']",
			) as HTMLElement | null;
			if (!el) return;
			const row = Number(el.dataset.ctxRow);
			const col = Number(el.dataset.ctxCol);
			const { row: ar, col: ac } = dragCellAnchorRef.current;
			setDragRange({
				startRow: Math.min(ar, row),
				startCol: Math.min(ac, col),
				endRow: Math.max(ar, row),
				endCol: Math.max(ac, col),
			});
		},
		[setRowDragRange],
	);

	// Capture which cell/row was right-clicked before ContextMenuTrigger opens the menu
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
				setCtxMenu({
					type: "cell",
					rowIndex,
					colIndex: Number(ctxEl.dataset.ctxCol),
					value: ctxEl.dataset.ctxVal ?? "",
				});
			} else {
				setCtxMenu({ type: "row", rowIndex });
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
		selectedCell,
		dragRange,
		displayData,
		displayHeaders,
		colCount,
	]);

	return (
		<div className="csv-preview max-w-full">
			{/* ── Toolbar ── */}
			<div className="flex gap-2 px-2 py-1 border-b w-full items-center wrap-flex">
				{toolbarLeading}
				{!hideSqlToggle && !hideFilterToggle && (
					<ButtonGroup>
						<Button
							variant={queryMode === "search" ? "default" : "outline"}
							onClick={onFilterMode}
						>
							<IconFilter />
							Filter
						</Button>
						<Button
							variant={queryMode === "sql" ? "default" : "outline"}
							onClick={onSqlMode}
							disabled={sqlConnecting}
						>
							<IconDatabase />
							{sqlConnecting ? "Connecting..." : "SQL"}
						</Button>
					</ButtonGroup>
				)}
				{(queryMode === "search" && !hideFilterToggle) || hideSqlToggle ? (
					<SearchInput onFilter={(v) => onGlobalFilterChange?.(v)} />
				) : (
					<SqlInput
						onRun={onSqlRun ?? (() => {})}
						disabled={sqlLoading}
						tableName={sqlTableName}
					/>
				)}
			</div>

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
						<thead
							style={{ display: "grid", position: "sticky", top: 0, zIndex: 2 }}
						>
							{/* Column index row */}
							<tr className="flex w-full bg-card border-b">
								<th
									className="sticky left-0 z-10 bg-muted border-r"
									style={{ width: ROW_NUM_W }}
								/>
								{table.getFlatHeaders().map((header, idx) => (
									<th
										key={header.id}
										className={cn(
											"group relative flex text-[10px] select-none border-r border-border/40",
											(dragRange != null &&
												idx >= dragRange.startCol &&
												idx <= dragRange.endCol) ||
												(dragRange == null && selectedCell?.col === idx + 1)
												? "bg-primary/15 text-primary"
												: "text-muted-foreground/50 hover:bg-muted/60",
										)}
										style={{
											width: `calc(var(--header-${header.id}-size) * 1px)`,
										}}
									>
										<DropdownMenu>
											<DropdownMenuTrigger className="flex flex-1 justify-center items-center py-0.5 px-1 focus:outline-none cursor-pointer relative">
												<span>{idx + 1}</span>
												{header.column.getIsSorted() ? (
													header.column.getIsSorted() === "asc" ? (
														<IconSortAscending
															size={9}
															className="absolute right-0.5"
														/>
													) : (
														<IconSortDescending
															size={9}
															className="absolute right-0.5"
														/>
													)
												) : (
													<IconChevronDown
														size={9}
														className="absolute right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
													/>
												)}
											</DropdownMenuTrigger>
											<DropdownMenuContent
												side="bottom"
												align="start"
												className="min-w-42"
											>
												<DropdownMenuItem
													onClick={() =>
														navigator.clipboard.writeText(
															String(header.column.columnDef.header),
														)
													}
												>
													<IconCopy size={13} />
													Copy column name
												</DropdownMenuItem>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => header.column.toggleSorting(false)}
												>
													<IconSortAscending
														size={13}
														className="mr-1 text-foreground"
													/>
													Sort A <IconArrowRight className="size-3" /> Z
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => header.column.toggleSorting(true)}
												>
													<IconSortDescending
														size={13}
														className="mr-1 text-foreground"
													/>
													Sort Z <IconArrowRight className="size-3" /> A
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
										{/** biome-ignore lint/a11y/noStaticElementInteractions: no need */}
										<div
											onMouseDown={header.getResizeHandler()}
											onTouchStart={header.getResizeHandler()}
											className={`csv-col-resizer${header.column.getIsResizing() ? " isResizing" : ""}`}
										/>
									</th>
								))}
							</tr>
							{table.getHeaderGroups().map((hg) => (
								<tr key={hg.id} className="flex w-full bg-card border-b">
									<th
										className="text-xs font-mono text-muted-foreground bg-muted sticky left-0 z-10 flex justify-center items-center border-r select-none"
										style={{ width: ROW_NUM_W }}
									>
										1
									</th>
									{hg.headers.map((header) => (
										<th
											key={header.id}
											style={{
												display: "flex",
												width: `calc(var(--header-${header.id}-size) * 1px)`,
												position: "relative",
												alignItems: "center",
												padding: 0,
											}}
											className={cn(
												"select-none border-r border-border",
												selectedCell?.col === header.index + 1
													? "bg-primary/5"
													: "",
											)}
										>
											<div className="th-content flex justify-between flex-1 min-w-0 px-[14px] py-[8px]">
												<span className="th-label">
													{flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
												</span>
												{header.column.getIsSorted() && (
													<span className="sort-indicator">
														{header.column.getIsSorted() === "asc" ? (
															<IconSortAscending className="size-4" />
														) : (
															<IconSortDescending className="size-4" />
														)}
													</span>
												)}
											</div>
										</th>
									))}
								</tr>
							))}
						</thead>
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
										isRowSelected={selectedRows?.has(row.index) ?? false}
										selectedCellRow={selectedCell?.row ?? 0}
										selectedCellCol={selectedCell?.col ?? 0}
										queryMode={queryMode}
										onCellSelect={onCellSelect}
										onCellDoubleClick={onCellDoubleClick}
										renderCellValue={renderCellValue}
										onRowClick={handleRowClick}
										dragRange={dragRange}
										isFirstRowInRange={
											dragRange != null && row.index === dragRange.startRow
										}
										isLastRowInRange={
											dragRange != null && row.index === dragRange.endRow
										}
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
					{ctxMenu &&
						(ctxMenu.type === "cell" ? (
							<>
								<ContextMenuItem
									onClick={() => {
										if (dragRange) {
											const changes: Array<[number, number, string]> = [];
											for (
												let r = dragRange.startRow;
												r <= dragRange.endRow;
												r++
											)
												for (
													let c = dragRange.startCol;
													c <= dragRange.endCol;
													c++
												)
													changes.push([r, c, ""]);
											onCellBatchChange?.(changes);
										} else {
											onCellChange?.(ctxMenu.rowIndex, ctxMenu.colIndex, "");
										}
									}}
								>
									<IconEraser size={13} />
									{dragRange
										? `Empty range (${(dragRange.endRow - dragRange.startRow + 1) * (dragRange.endCol - dragRange.startCol + 1)} cells)`
										: "Empty data"}
								</ContextMenuItem>
								<ContextMenuItem
									onClick={() => navigator.clipboard.writeText(ctxMenu.value)}
								>
									<IconCopy size={13} />
									Copy cell
								</ContextMenuItem>
							</>
						) : (
							<>
								<ContextMenuItem
									onClick={() => onInsertRowAbove?.(ctxMenu.rowIndex)}
								>
									<IconPlus size={13} />
									Insert row above
								</ContextMenuItem>
								<ContextMenuItem
									onClick={() => onInsertRowBelow?.(ctxMenu.rowIndex)}
								>
									<IconPlus size={13} />
									Insert row below
								</ContextMenuItem>
								<ContextMenuSeparator />
								<ContextMenuItem
									onClick={() => onMoveRowUp?.(ctxMenu.rowIndex)}
								>
									<IconArrowUp size={13} />
									Move row up
								</ContextMenuItem>
								<ContextMenuItem
									onClick={() => onMoveRowDown?.(ctxMenu.rowIndex)}
								>
									<IconArrowDown size={13} />
									Move row down
								</ContextMenuItem>
								<ContextMenuSeparator />
								{(() => {
									const isMulti =
										(selectedRows?.has(ctxMenu.rowIndex) ?? false) &&
										(selectedRows?.size ?? 0) > 1;
									return (
										<ContextMenuItem
											variant="destructive"
											onClick={() =>
												onDeleteRows?.(
													isMulti
														? Array.from(selectedRows!)
														: [ctxMenu.rowIndex],
												)
											}
										>
											<IconTrash size={13} />
											{isMulti
												? `Delete ${selectedRows!.size} rows`
												: "Delete row"}
										</ContextMenuItem>
									);
								})()}
							</>
						))}
				</ContextMenuContent>
			</ContextMenu>

			{/* ── Status bar ── */}
			<div className="w-full flex justify-between border-t px-2 text-xs py-1 items-center text-muted-foreground gap-4">
				<div className="flex items-center gap-4 min-w-0 overflow-hidden">
					<span className="shrink-0">
						{sqlLoading
							? "Running…"
							: filteredRowCount === totalRows
								? `${totalRows} rows × ${colCount} columns`
								: `${filteredRowCount} / ${totalRows} rows × ${colCount} columns`}
					</span>
					{selectionStats && (
						<>
							<span className="shrink-0">
								{selectionStats.pos} ({selectionStats.cells} cells)
							</span>
							<span className="shrink-0">
								Sum:{" "}
								{new Intl.NumberFormat("en-US", {
									maximumFractionDigits: 10,
									useGrouping: false,
								}).format(selectionStats.sum)}
							</span>
						</>
					)}
				</div>
				<span className="shrink-0">{statusRight}</span>
			</div>
			{bottomSlot}
			{overlay}
		</div>
	);
}
