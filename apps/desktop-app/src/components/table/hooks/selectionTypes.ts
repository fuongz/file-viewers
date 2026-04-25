import type { DragRange, SelectedCell } from "../types";

export interface SelectionState {
	cell: SelectedCell | null;
	range: DragRange | null;
	cmdCells: Set<string>;
	rows: Set<number>;
}

export interface SelectionDisplay {
	isRowSelected: (rowIndex: number) => boolean;
	isCellSelected: (rowIndex: number, colIndex: number) => boolean;
	isInRange: (rowIndex: number, colIndex: number) => boolean;
}

export function createSelectionDisplay(
	selection: SelectionState,
): SelectionDisplay {
	return {
		isRowSelected: (rowIndex: number) => selection.rows.has(rowIndex),
		isCellSelected: (rowIndex: number, colIndex: number) => {
			if (
				selection.cell &&
				selection.cell.row === rowIndex + 1 &&
				selection.cell.col === colIndex + 1
			)
				return true;
			if (selection.cmdCells.has(`${rowIndex}:${colIndex}`)) return true;
			return false;
		},
		isInRange: (rowIndex: number, colIndex: number) => {
			if (!selection.range) return false;
			return (
				rowIndex >= selection.range.startRow &&
				rowIndex <= selection.range.endRow &&
				colIndex >= selection.range.startCol &&
				colIndex <= selection.range.endCol
			);
		},
	};
}
