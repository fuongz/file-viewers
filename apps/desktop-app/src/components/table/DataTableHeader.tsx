import {
	IconArrowRight,
	IconChevronDown,
	IconCopy,
	IconSortAscending,
	IconSortDescending,
} from "@tabler/icons-react";
import { flexRender, type Table } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui";
import type { DragRange, SelectedCell } from "./types";

const ROW_NUM_W = 40;

interface DataTableHeaderProps {
	table: Table<Record<string, unknown>>;
	dragRange: DragRange | null;
	selectedCell: SelectedCell | null;
}

export function DataTableHeader({
	table,
	dragRange,
	selectedCell,
}: DataTableHeaderProps) {
	return (
		<thead style={{ display: "grid", position: "sticky", top: 0, zIndex: 2 }}>
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
								selectedCell?.col === header.index + 1 ? "bg-primary/5" : "",
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
	);
}
