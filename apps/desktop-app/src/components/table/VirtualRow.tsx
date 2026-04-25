import type { Row } from "@tanstack/react-table";
import type { VirtualItem } from "@tanstack/react-virtual";
import { memo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { DragRange, QueryMode } from "./types";

export const ROW_NUM_W = 40;

export interface VirtualRowProps {
	row: Row<Record<string, unknown>>;
	virtualRow: VirtualItem;
	measureElement: (node: Element | null) => void;
	isRowSelected: boolean;
	selectedCellRow: number;
	selectedCellCol: number;
	queryMode: QueryMode;
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
	dragRange?: DragRange | null;
	isFirstRowInRange?: boolean;
	isLastRowInRange?: boolean;
	cmdCells?: Set<string>;
}

function VirtualRowComponent({
	row,
	virtualRow,
	measureElement,
	isRowSelected,
	selectedCellRow,
	selectedCellCol,
	queryMode,
	onCellClick,
	onCellDoubleClick,
	renderCellValue,
	onRowClick,
	dragRange,
	isFirstRowInRange,
	isLastRowInRange,
	cmdCells,
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
				const isCmdSelected = cmdCells?.has(`${row.index}:${colIdx}`) ?? false;
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
								: isCmdSelected
									? "cursor-default ring-2 ring-inset ring-primary bg-primary/10"
									: isSelected && !dragRange
										? "cursor-default ring-2 ring-inset ring-primary bg-primary/10"
										: isRowSelected
											? "bg-primary/15"
											: "",
							"select-none truncate flex items-center px-2 py-1 text-xs/relaxed border-r border-border",
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
	if (prev.cmdCells !== next.cmdCells) {
		const rowIdx = prev.row.index;
		const prefix = `${rowIdx}:`;
		const prevHas = [...(prev.cmdCells ?? [])].some((k) =>
			k.startsWith(prefix),
		);
		const nextHas = [...(next.cmdCells ?? [])].some((k) =>
			k.startsWith(prefix),
		);
		if (prevHas || nextHas) return false;
	}
	return true;
}

export const VirtualRow = memo(VirtualRowComponent, rowPropsEqual);
