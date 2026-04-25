import { type RefObject, useCallback, useRef } from "react";
import type { DragRange, SelectedCell } from "../types";

interface CellInteractionRefs {
	selectedCellRef: RefObject<SelectedCell | null>;
	selectedRowsRef: RefObject<Set<number> | undefined>;
	cmdCellsRef: RefObject<Set<string>>;
	onCellSelectRef: RefObject<(cell: SelectedCell | null) => void>;
	onSelectedRowsChangeRef: RefObject<((rows: Set<number>) => void) | undefined>;
	setDragRangeRef: RefObject<
		React.Dispatch<React.SetStateAction<DragRange | null>>
	>;
	setCmdCellsRef: RefObject<React.Dispatch<React.SetStateAction<Set<string>>>>;
	displayDataRef: RefObject<Record<string, unknown>[]>;
	colCountRef: RefObject<number>;
	tableContainerRef: RefObject<HTMLDivElement | null>;
}

type CtxMenuState =
	| { type: "row"; rowIndex: number }
	| { type: "cell"; rowIndex: number; colIndex: number; value: string }
	| { type: "column"; colIdx: number };

interface UseCellInteractionsParams extends CellInteractionRefs {
	setCtxMenu: React.Dispatch<React.SetStateAction<CtxMenuState | null>>;
	lastRowAnchorRef: RefObject<number | null>;
	didDragRowRef: RefObject<boolean>;
	dragRowAnchorRef: RefObject<number | null>;
	isDraggingRowRef: RefObject<boolean>;
	isDraggingCellRef: RefObject<boolean>;
	dragCellAnchorRef: RefObject<{ row: number; col: number } | null>;
}

export function useCellInteractions({
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
}: UseCellInteractionsParams) {
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
				setCmdCellsRef.current(next);
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
				setCmdCellsRef.current(new Set());
			} else {
				onCellSelectRef.current({
					row: rowIndex + 1,
					col: colIndex + 1,
					value: displayValue,
				});
				setDragRangeRef.current(null);
				setCmdCellsRef.current(new Set());
				cellAnchorRef.current = { row: rowIndex, col: colIndex };
				if (selectedRowsRef.current?.size) {
					onSelectedRowsChangeRef.current?.(new Set());
					lastRowAnchorRef.current = null;
				}
			}
		},
		[],
	);

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
				setDragRangeRef.current(null);
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
			setDragRangeRef.current({
				startRow: Math.min(ar, row),
				startCol: Math.min(ac, col),
				endRow: Math.max(ar, row),
				endCol: Math.max(ac, col),
			});
		},
		[setRowDragRange],
	);

	return {
		cellAnchorRef,
		handleCellClick,
		handleColSelect,
		handleRowChevronClick,
		handleRowClick,
		handleTbodyMouseDown,
		handleTbodyMouseMove,
		setRowDragRange,
	};
}
