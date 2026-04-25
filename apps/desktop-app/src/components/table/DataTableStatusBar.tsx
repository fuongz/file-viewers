import type { ReactNode } from "react";

interface SelectionStats {
	pos: string;
	cells: number;
	sum: number;
}

interface DataTableStatusBarProps {
	sqlLoading?: boolean;
	filteredRowCount: number;
	totalRows: number;
	colCount: number;
	selectionStats: SelectionStats | null;
	statusRight?: ReactNode;
}

export function DataTableStatusBar({
	sqlLoading,
	filteredRowCount,
	totalRows,
	colCount,
	selectionStats,
	statusRight,
}: DataTableStatusBarProps) {
	return (
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
	);
}
