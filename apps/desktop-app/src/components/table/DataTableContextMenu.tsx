import {
	IconArrowDown,
	IconArrowRight,
	IconArrowUp,
	IconCopy,
	IconEraser,
	IconPlus,
	IconSortAscending,
	IconSortDescending,
	IconTrash,
} from "@tabler/icons-react";
import { ContextMenuItem, ContextMenuSeparator } from "../ui";
import type { DragRange } from "./types";

export type CtxMenuState =
	| { type: "row"; rowIndex: number }
	| { type: "cell"; rowIndex: number; colIndex: number; value: string }
	| { type: "column"; colIdx: number };

interface DataTableContextMenuContentProps {
	ctxMenu: CtxMenuState | null;
	dragRange: DragRange | null;
	cmdCells?: Set<string>;
	displayData?: Record<string, unknown>[];
	displayHeaders?: string[];
	selectedRows?: Set<number>;
	onCellChange?: (rowIndex: number, colIndex: number, value: string) => void;
	onCellBatchChange?: (changes: Array<[number, number, string]>) => void;
	onInsertRowAbove?: (rowIndex: number) => void;
	onInsertRowBelow?: (rowIndex: number) => void;
	onMoveRowUp?: (rowIndex: number) => void;
	onMoveRowDown?: (rowIndex: number) => void;
	onDeleteRows?: (rowIndices: number[]) => void;
	onSortColumn?: (colIdx: number, desc: boolean) => void;
	onDeleteColumn?: (colIdx: number) => void;
}

export function DataTableContextMenuContent({
	ctxMenu,
	dragRange,
	cmdCells,
	displayData,
	displayHeaders,
	selectedRows,
	onCellChange,
	onCellBatchChange,
	onInsertRowAbove,
	onInsertRowBelow,
	onMoveRowUp,
	onMoveRowDown,
	onDeleteRows,
	onSortColumn,
	onDeleteColumn,
}: DataTableContextMenuContentProps) {
	if (!ctxMenu) return null;

	if (ctxMenu.type === "cell") {
		const cmdEntries =
			cmdCells && cmdCells.size > 0
				? [...cmdCells]
						.map((k) => k.split(":").map(Number) as [number, number])
						.sort((a, b) => a[0] - b[0] || a[1] - b[1])
				: [];

		const getCellStr = (r: number, c: number): string => {
			const row = displayData?.[r];
			if (!row) return "";
			const val = row[displayHeaders?.[c] ?? ""];
			if (val === null || val === undefined) return "";
			if (typeof val === "object") return JSON.stringify(val);
			return String(val);
		};

		const emptyLabel =
			cmdEntries.length > 0
				? `Empty ${cmdEntries.length} cells`
				: dragRange
					? `Empty range (${(dragRange.endRow - dragRange.startRow + 1) * (dragRange.endCol - dragRange.startCol + 1)} cells)`
					: "Empty data";

		return (
			<>
				<ContextMenuItem
					onClick={() => {
						if (cmdEntries.length > 0) {
							onCellBatchChange?.(cmdEntries.map(([r, c]) => [r, c, ""]));
						} else if (dragRange) {
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
					{emptyLabel}
				</ContextMenuItem>
				<ContextMenuItem
					onClick={() => {
						if (cmdEntries.length > 0) {
							navigator.clipboard.writeText(
								cmdEntries.map(([r, c]) => getCellStr(r, c)).join("\t"),
							);
						} else {
							navigator.clipboard.writeText(ctxMenu.value);
						}
					}}
				>
					<IconCopy size={13} />
					{cmdEntries.length > 0
						? `Copy ${cmdEntries.length} cells`
						: "Copy cell"}
				</ContextMenuItem>
			</>
		);
	}

	if (ctxMenu.type === "column") {
		const colName = displayHeaders?.[ctxMenu.colIdx] ?? "";
		return (
			<>
				<ContextMenuItem onClick={() => navigator.clipboard.writeText(colName)}>
					<IconCopy size={13} />
					Copy column name
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={() => onSortColumn?.(ctxMenu.colIdx, false)}>
					<IconSortAscending size={13} />
					Sort A <IconArrowRight className="size-3" /> Z
				</ContextMenuItem>
				<ContextMenuItem onClick={() => onSortColumn?.(ctxMenu.colIdx, true)}>
					<IconSortDescending size={13} />
					Sort Z <IconArrowRight className="size-3" /> A
				</ContextMenuItem>
				{onDeleteColumn && (
					<>
						<ContextMenuSeparator />
						<ContextMenuItem
							variant="destructive"
							onClick={() => onDeleteColumn(ctxMenu.colIdx)}
						>
							<IconTrash size={13} />
							Delete column
						</ContextMenuItem>
					</>
				)}
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
