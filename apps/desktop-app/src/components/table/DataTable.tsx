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

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
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
			const cmd = cmdCellsRef.current;
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

			const cmdEntries = (): Array<[number, number]> =>
				[...cmd]
					.map((k) => k.split(":").map(Number) as [number, number])
					.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

			const isMod = e.metaKey || e.ctrlKey;

			if (e.key === "Delete" || e.key === "Backspace") {
				if (cmd.size > 0) {
					e.preventDefault();
					const changes = cmdEntries().map(
						([r, c]) => [r, c, ""] as [number, number, string],
					);
					onCellBatchChangeRef.current?.(changes);
				} else if (range) {
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

			if (e.key === "Enter" && !isMod) {
				if (cell && !range && cmd.size === 0) {
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

			if (e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				onUndoRef.current?.();
				return;
			}

			if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key === "y") {
				e.preventDefault();
				onRedoRef.current?.();
				return;
			}

			if (e.key === "c") {
				e.preventDefault();
				if (cmd.size > 0) {
					navigator.clipboard.writeText(
						cmdEntries()
							.map(([r, c]) => getCellStr(r, c))
							.join("\t"),
					);
				} else if (range) {
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

			if (e.key === "x") {
				e.preventDefault();
				if (cmd.size > 0) {
					const entries = cmdEntries();
					navigator.clipboard.writeText(
						entries.map(([r, c]) => getCellStr(r, c)).join("\t"),
					);
					onCellBatchChangeRef.current?.(entries.map(([r, c]) => [r, c, ""]));
					setCmdCellsRef.current(new Set());
				} else if (range) {
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
	const onUndoRef = useRef(onUndo);
	onUndoRef.current = onUndo;
	const onRedoRef = useRef(onRedo);
	onRedoRef.current = onRedo;
	const setCmdCellsRef = useRef(setCmdCells);
	setCmdCellsRef.current = setCmdCells;

	const cellAnchorRef = useRef<{ row: number; col: number } | null>(null);

	const handleCellClick = useCallback(
		(
			rowIndex: number,
			colIndex: number,
			displayValue: string,
			metaKey: boolean,
			shiftKey: boolean,
		) => {
			if (metaKey) {
				const key = `${rowIndex}:${colIndex}`;
				const prev = cmdCellsRef.current;
				const next = new Set(prev);
				const currentCell = selectedCellRef.current;
				if (currentCell && prev.size === 0) {
					next.add(`${currentCell.row - 1}:${currentCell.col - 1}`);
				}
				if (next.has(key)) next.delete(key);
				else next.add(key);
				setCmdCells(next);
				onCellSelectRef.current(null);
				setDragRangeRef.current(null);
				cellAnchorRef.current = { row: rowIndex, col: colIndex };
				if (selectedRowsRef.current?.size) {
					onSelectedRowsChangeRef.current?.(new Set());
					lastRowAnchorRef.current = null;
				}
			} else if (shiftKey && cellAnchorRef.current) {
				const { row: ar, col: ac } = cellAnchorRef.current;
				setDragRangeRef.current({
					startRow: Math.min(ar, rowIndex),
					startCol: Math.min(ac, colIndex),
					endRow: Math.max(ar, rowIndex),
					endCol: Math.max(ac, colIndex),
				});
				onCellSelectRef.current(null);
				setCmdCells(new Set());
			} else {
				onCellSelectRef.current({
					row: rowIndex + 1,
					col: colIndex + 1,
					value: displayValue,
				});
				setDragRangeRef.current(null);
				setCmdCells(new Set());
				cellAnchorRef.current = { row: rowIndex, col: colIndex };
				if (selectedRowsRef.current?.size) {
					onSelectedRowsChangeRef.current?.(new Set());
					lastRowAnchorRef.current = null;
				}
			}
		},
		[],
	);

	const tableRef = useRef(table);
	tableRef.current = table;

	const handleColumnContextMenu = useCallback((colIdx: number) => {
		flushSync(() => setCtxMenu({ type: "column", colIdx }));
	}, []);

	const handleSortColumn = useCallback((colIdx: number, desc: boolean) => {
		tableRef.current.getFlatHeaders()[colIdx]?.column.toggleSorting(desc);
	}, []);

	const handleColSelect = useCallback((colIdx: number) => {
		setDragRangeRef.current({
			startRow: 0,
			endRow: displayDataRef.current.length - 1,
			startCol: colIdx,
			endCol: colIdx,
		});
		onCellSelectRef.current(null);
		setCmdCellsRef.current(new Set());
		if (selectedRowsRef.current?.size) {
			onSelectedRowsChangeRef.current?.(new Set());
			lastRowAnchorRef.current = null;
		}
	}, []);

	const handleRowChevronClick = useCallback(
		(rowIndex: number, clientX: number, clientY: number) => {
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
			setCtxMenu({ type: "row", rowIndex });
			const el = tableContainerRef.current?.querySelector(
				`[data-ctx-type="row"][data-ctx-row="${rowIndex}"]`,
			);
			setTimeout(() => {
				el?.dispatchEvent(
					new MouseEvent("contextmenu", {
						bubbles: true,
						cancelable: true,
						clientX,
						clientY,
					}),
				);
			}, 0);
		},
		[],
	);

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
				setCmdCellsRef.current(new Set());
				setRowDragRange(rowIdx, rowIdx);
				if (tableContainerRef.current)
					tableContainerRef.current.style.userSelect = "none";
			} else if (el.dataset.ctxType === "cell") {
				if (e.shiftKey || e.metaKey || e.ctrlKey) return;
				onCellSelectRef.current(null);
				setCmdCellsRef.current(new Set());
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
				const range = dragRangeStateRef.current;
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
					cellAnchorRef.current = { row: rowIndex, col: colIndex };
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
										isRowSelected={selectedRows?.has(row.index) ?? false}
										selectedCellRow={selectedCell?.row ?? 0}
										selectedCellCol={selectedCell?.col ?? 0}
										queryMode={queryMode}
										onCellClick={handleCellClick}
										onCellDoubleClick={onCellDoubleClick}
										renderCellValue={renderCellValue}
										onRowClick={handleRowClick}
										onRowChevronClick={handleRowChevronClick}
										dragRange={dragRange}
										cmdCells={cmdCells}
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
