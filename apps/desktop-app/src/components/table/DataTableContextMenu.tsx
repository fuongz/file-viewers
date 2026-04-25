import {
	IconArrowDown,
	IconArrowUp,
	IconCopy,
	IconEraser,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { ContextMenuItem, ContextMenuSeparator } from "../ui";
import type { DragRange } from "./types";

export type CtxMenuState =
	| { type: "row"; rowIndex: number }
	| { type: "cell"; rowIndex: number; colIndex: number; value: string };

interface DataTableContextMenuContentProps {
	ctxMenu: CtxMenuState | null;
	dragRange: DragRange | null;
	selectedRows?: Set<number>;
	onCellChange?: (rowIndex: number, colIndex: number, value: string) => void;
	onCellBatchChange?: (changes: Array<[number, number, string]>) => void;
	onInsertRowAbove?: (rowIndex: number) => void;
	onInsertRowBelow?: (rowIndex: number) => void;
	onMoveRowUp?: (rowIndex: number) => void;
	onMoveRowDown?: (rowIndex: number) => void;
	onDeleteRows?: (rowIndices: number[]) => void;
}

export function DataTableContextMenuContent({
	ctxMenu,
	dragRange,
	selectedRows,
	onCellChange,
	onCellBatchChange,
	onInsertRowAbove,
	onInsertRowBelow,
	onMoveRowUp,
	onMoveRowDown,
	onDeleteRows,
}: DataTableContextMenuContentProps) {
	if (!ctxMenu) return null;

	if (ctxMenu.type === "cell") {
		return (
			<>
				<ContextMenuItem
					onClick={() => {
						if (dragRange) {
							const changes: Array<[number, number, string]> = [];
							for (let r = dragRange.startRow; r <= dragRange.endRow; r++)
								for (let c = dragRange.startCol; c <= dragRange.endCol; c++)
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
		);
	}

	const isMulti =
		(selectedRows?.has(ctxMenu.rowIndex) ?? false) &&
		(selectedRows?.size ?? 0) > 1;

	return (
		<>
			<ContextMenuItem onClick={() => onInsertRowAbove?.(ctxMenu.rowIndex)}>
				<IconPlus size={13} />
				Insert row above
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onInsertRowBelow?.(ctxMenu.rowIndex)}>
				<IconPlus size={13} />
				Insert row below
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem onClick={() => onMoveRowUp?.(ctxMenu.rowIndex)}>
				<IconArrowUp size={13} />
				Move row up
			</ContextMenuItem>
			<ContextMenuItem onClick={() => onMoveRowDown?.(ctxMenu.rowIndex)}>
				<IconArrowDown size={13} />
				Move row down
			</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem
				variant="destructive"
				onClick={() =>
					onDeleteRows?.(
						isMulti ? Array.from(selectedRows!) : [ctxMenu.rowIndex],
					)
				}
			>
				<IconTrash size={13} />
				{isMulti ? `Delete ${selectedRows!.size} rows` : "Delete row"}
			</ContextMenuItem>
		</>
	);
}
