import type { VirtualItem } from "@tanstack/react-virtual";
import { memo, type ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import type { SelectionDisplay, SelectionState } from "./hooks/selectionTypes";
import type { DataTableRow } from "./tableFeatures";
import type { QueryMode } from "./types";

export const ROW_NUM_W = 40;

export interface VirtualRowProps {
	row: DataTableRow;
	rowNumberOffset?: number;
	rowNumberWidth?: number;
	databaseStyle?: boolean;
	editingCell?: { rowIndex: number; colIndex: number; value: string } | null;
	onCellEditChange?: (value: string) => void;
	onCellEditCommit?: () => void;
	onCellEditCancel?: () => void;
	virtualRow: VirtualItem;
	measureElement: (node: Element | null) => void;
	queryMode: QueryMode;
	selection: SelectionState;
	selectionDisplay: SelectionDisplay;
	onCellClick: (
		rowIndex: number,
		colIndex: number,
		displayValue: string,
		metaKey: boolean,
		shiftKey: boolean,
	) => void;
	onCellDoubleClick?: (
		rowIndex: number,
		colIndex: number,
		value: string,
		anchorEl: Element,
	) => void;
	renderCellValue?: (value: unknown) => ReactNode;
	onRowClick: (rowIndex: number, metaKey: boolean, shiftKey: boolean) => void;
}

function VirtualRowComponent({
	row,
	rowNumberOffset,
	rowNumberWidth = ROW_NUM_W,
	databaseStyle,
	editingCell,
	onCellEditChange,
	onCellEditCommit,
	onCellEditCancel,
	virtualRow,
	measureElement,
	queryMode,
	selection,
	selectionDisplay,
	onCellClick,
	onCellDoubleClick,
	renderCellValue,
	onRowClick,
}: VirtualRowProps) {
	const { range } = selection;

	const isRowSelected = useMemo(
		() => selectionDisplay.isRowSelected(row.index),
		[selectionDisplay, row.index],
	);

	const isRowInRange = useMemo(
		() => selectionDisplay.isInRange(row.index, 0),
		[selectionDisplay, row.index],
	);

	return (
		<tr
			data-index={virtualRow.index}
			ref={(node) => measureElement(node)}
			style={{
				transform: `translateY(${virtualRow.start}px)`,
			}}
			className={`group absolute flex w-full border-b border-border ${databaseStyle ? "bg-background" : ""}`}
		>
			<td
				data-ctx-type="row"
				data-ctx-row={row.index}
				className={cn(
					isRowSelected
						? "bg-primary/25 text-primary font-semibold"
						: isRowInRange || (!range && selection.cell?.row === row.index + 1)
							? "bg-primary/20 text-primary"
							: "bg-muted text-muted-foreground",
					"relative text-xs border-r select-none font-medium sticky left-0 z-10 flex cursor-pointer justify-center items-center font-mono",
					databaseStyle && "bg-background text-muted-foreground",
				)}
				style={{ width: rowNumberWidth }}
				onClick={(e) => {
					e.stopPropagation();
					onRowClick(row.index, e.metaKey || e.ctrlKey, e.shiftKey);
				}}
			>
				<span>
					{rowNumberOffset === undefined
						? row.index + 2
						: rowNumberOffset + virtualRow.index + 1}
				</span>
			</td>

			{row.getVisibleCells().map((cell, colIdx) => {
				const rawValue = cell.getValue();
				const displayValue =
					rawValue === null || rawValue === undefined
						? "null"
						: typeof rawValue === "object"
							? JSON.stringify(rawValue)
							: String(rawValue);

				const isSelected = selectionDisplay.isCellSelected(row.index, colIdx);
				const isCellInRange = selectionDisplay.isInRange(row.index, colIdx);
				const isEditing =
					editingCell?.rowIndex === row.index &&
					editingCell.colIndex === colIdx;

				const content = renderCellValue ? (
					renderCellValue(rawValue)
				) : rawValue === null || rawValue === undefined ? (
					<span className="text-[var(--text-muted)]">null</span>
				) : typeof rawValue === "object" ? (
					JSON.stringify(rawValue)
				) : (
					String(rawValue)
				);

				const isTopEdge = isCellInRange && range?.startRow === row.index;
				const isBottomEdge = isCellInRange && range?.endRow === row.index;
				const isLeftEdge = isCellInRange && range?.startCol === colIdx;
				const isRightEdge = isCellInRange && range?.endCol === colIdx;

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
								: isSelected && !isEditing
									? "cursor-default ring-2 ring-inset ring-primary bg-primary/10"
									: isRowSelected
										? "bg-primary/15"
										: "",
							"relative select-none truncate flex items-center px-2 py-1 text-xs/relaxed border-r border-border",
							databaseStyle &&
								"bg-background px-3 py-1 font-mono text-xs/relaxed",
							isEditing && "overflow-hidden bg-background",
						)}
						onClick={(e) =>
							onCellClick(
								row.index,
								colIdx,
								displayValue,
								e.metaKey || e.ctrlKey,
								e.shiftKey,
							)
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
						{isEditing ? (
							<>
								<span
									aria-hidden="true"
									className="min-w-0 flex-1 truncate invisible"
								>
									{content}
								</span>
								<Input
									autoFocus
									aria-label={`Edit ${String(cell.column.columnDef.header ?? "cell")}`}
									value={editingCell?.value ?? ""}
									className={cn(
										"absolute inset-0 size-full rounded-none border-2 border-primary bg-background font-mono text-xs/relaxed shadow-none focus-visible:border-primary focus-visible:ring-0",
										databaseStyle ? "px-3 py-1" : "px-2 py-1",
									)}
									onFocus={(event) => event.currentTarget.select()}
									onChange={(event) =>
										onCellEditChange?.(event.currentTarget.value)
									}
									onBlur={() => onCellEditCommit?.()}
									onMouseDown={(event) => event.stopPropagation()}
									onClick={(event) => event.stopPropagation()}
									onKeyDown={(event) => {
										event.stopPropagation();
										if (event.key === "Enter") {
											event.preventDefault();
											onCellEditCommit?.();
										} else if (event.key === "Escape") {
											event.preventDefault();
											onCellEditCancel?.();
										}
									}}
								/>
							</>
						) : (
							content
						)}
					</td>
				);
			})}
		</tr>
	);
}

function propsAreEqual(prev: VirtualRowProps, next: VirtualRowProps): boolean {
	if (prev.rowNumberOffset !== next.rowNumberOffset) return false;
	if (prev.rowNumberWidth !== next.rowNumberWidth) return false;
	if (prev.databaseStyle !== next.databaseStyle) return false;
	if (prev.editingCell !== next.editingCell) {
		if (!prev.editingCell || !next.editingCell) return false;
		if (
			prev.editingCell.rowIndex !== next.editingCell.rowIndex ||
			prev.editingCell.colIndex !== next.editingCell.colIndex ||
			prev.editingCell.value !== next.editingCell.value
		)
			return false;
	}
	if (prev.virtualRow.index !== next.virtualRow.index) return false;
	if (prev.row !== next.row) return false;
	if (prev.virtualRow.start !== next.virtualRow.start) return false;
	if (prev.queryMode !== next.queryMode) return false;
	if (prev.selection !== next.selection) return false;
	if (prev.selection.cell !== next.selection.cell) {
		const prevCell = prev.selection.cell;
		const nextCell = next.selection.cell;
		if (!prevCell || !nextCell) return false;
		if (prevCell.row !== nextCell.row || prevCell.col !== nextCell.col)
			return false;
	}
	if (prev.selection.range !== next.selection.range) {
		const prevRange = prev.selection.range;
		const nextRange = next.selection.range;
		if (!prevRange || !nextRange) return false;
		if (
			prevRange.startRow !== nextRange.startRow ||
			prevRange.endRow !== nextRange.endRow ||
			prevRange.startCol !== nextRange.startCol ||
			prevRange.endCol !== nextRange.endCol
		)
			return false;
	}
	if (prev.selection.rows !== next.selection.rows) {
		if (
			prev.selection.rows.size !== next.selection.rows.size ||
			![...prev.selection.rows].every((r) => next.selection.rows.has(r))
		)
			return false;
	}
	if (prev.selection.cmdCells !== next.selection.cmdCells) {
		if (
			prev.selection.cmdCells.size !== next.selection.cmdCells.size ||
			![...prev.selection.cmdCells].every((c) => next.selection.cmdCells.has(c))
		)
			return false;
	}
	return true;
}

export const VirtualRow = memo(VirtualRowComponent, propsAreEqual);
