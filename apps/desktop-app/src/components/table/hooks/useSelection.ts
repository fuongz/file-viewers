import { useMemo, useState } from "react";
import type { DragRange, SelectedCell } from "../types";

export interface SelectionState {
	cell: SelectedCell | null;
	range: DragRange | null;
	cmdCells: Set<string>;
	rows: Set<number>;
}

export interface SelectionStats {
	pos: string;
	cells: number;
	sum: number;
}

export interface SelectionActions {
	selectCell: (rowIndex: number, colIndex: number, value: string) => void;
	selectRange: (
		startRow: number,
		startCol: number,
		endRow: number,
		endCol: number,
	) => void;
	selectRow: (rowIndex: number) => void;
	toggleCmdCell: (rowIndex: number, colIndex: number) => void;
	clearSelection: () => void;
	extendRowSelection: (rowIndex: number, anchor: number) => void;
	toggleRow: (rowIndex: number) => void;
}

export interface SelectionComputed {
	isCellSelected: (rowIndex: number, colIndex: number) => boolean;
	isRowSelected: (rowIndex: number) => boolean;
	isInRange: (rowIndex: number, colIndex: number) => boolean;
	getSelectionStats: (
		data: Record<string, unknown>[],
		headers: string[],
	) => SelectionStats | null;
}

export interface UseSelectionReturn {
	state: SelectionState;
	actions: SelectionActions;
	computed: SelectionComputed;
}

export function useSelection(
	initialRows: Set<number> = new Set(),
): UseSelectionReturn {
	const [cell, setCell] = useState<SelectedCell | null>(null);
	const [range, setRange] = useState<DragRange | null>(null);
	const [cmdCells, setCmdCells] = useState<Set<string>>(new Set());
	const [rows, setRows] = useState<Set<number>>(initialRows);

	const actions = useMemo<SelectionActions>(
		() => ({
			selectCell: (rowIndex: number, colIndex: number, value: string) => {
				setCell({ row: rowIndex + 1, col: colIndex + 1, value });
				setRange(null);
				setCmdCells(new Set());
			},
			selectRange: (
				startRow: number,
				startCol: number,
				endRow: number,
				endCol: number,
			) => {
				setRange({ startRow, startCol, endRow, endCol });
				setCell(null);
			},
			selectRow: (rowIndex: number) => {
				setRows(new Set([rowIndex]));
				setCmdCells(new Set());
				setCell(null);
				setRange(null);
			},
			toggleCmdCell: (rowIndex: number, colIndex: number) => {
				setCmdCells((prev) => {
					const next = new Set(prev);
					const key = `${rowIndex}:${colIndex}`;
					if (next.has(key)) next.delete(key);
					else next.add(key);
					return next;
				});
			},
			clearSelection: () => {
				setCell(null);
				setRange(null);
				setCmdCells(new Set());
				setRows(new Set());
			},
			extendRowSelection: (rowIndex: number, anchor: number) => {
				const start = Math.min(anchor, rowIndex);
				const end = Math.max(anchor, rowIndex);
				const next = new Set<number>();
				for (let i = start; i <= end; i++) next.add(i);
				setRows(next);
			},
			toggleRow: (rowIndex: number) => {
				setRows((prev) => {
					const next = new Set(prev);
					if (next.has(rowIndex)) next.delete(rowIndex);
					else next.add(rowIndex);
					return next;
				});
			},
		}),
		[],
	);

	const computed = useMemo<SelectionComputed>(
		() => ({
			isCellSelected: (rowIndex: number, colIndex: number) => {
				if (cell && cell.row === rowIndex + 1 && cell.col === colIndex + 1)
					return true;
				if (cmdCells.has(`${rowIndex}:${colIndex}`)) return true;
				return false;
			},
			isRowSelected: (rowIndex: number) => rows.has(rowIndex),
			isInRange: (rowIndex: number, colIndex: number) => {
				if (!range) return false;
				return (
					rowIndex >= range.startRow &&
					rowIndex <= range.endRow &&
					colIndex >= range.startCol &&
					colIndex <= range.endCol
				);
			},
			getSelectionStats: (
				data: Record<string, unknown>[],
				headers: string[],
			) => {
				if (rows.size > 0) {
					let sum = 0;
					const rowIndices = Array.from(rows);
					for (const rowIdx of rowIndices) {
						const row = data[rowIdx];
						if (!row) continue;
						for (const key of headers) {
							const v = Number(row[key]);
							if (Number.isFinite(v)) sum += v;
						}
					}
					const firstRow = Math.min(...rowIndices);
					return {
						pos: `${firstRow + 2}:1`,
						cells: rows.size * headers.length,
						sum,
					};
				}
				if (cmdCells.size > 0) {
					let sum = 0;
					for (const key of cmdCells) {
						const [r, c] = key.split(":").map(Number);
						const row = data[r];
						if (!row) continue;
						const v = Number(row[headers[c]]);
						if (Number.isFinite(v)) sum += v;
					}
					return { pos: `${cmdCells.size} cells`, cells: cmdCells.size, sum };
				}
				if (cell && !range) {
					const v = Number(cell.value);
					return {
						pos: `${cell.row}:${cell.col}`,
						cells: 1,
						sum: Number.isFinite(v) ? v : 0,
					};
				}
				return null;
			},
		}),
		[cell, range, cmdCells, rows],
	);

	const state = useMemo(
		() => ({ cell, range, cmdCells, rows }),
		[cell, range, cmdCells, rows],
	);

	return { state, actions, computed };
}
