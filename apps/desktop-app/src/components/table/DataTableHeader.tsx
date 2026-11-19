import {
	IconArrowRight,
	IconChevronDown,
	IconCopy,
	IconSortAscending,
	IconSortDescending,
	IconTrash,
} from "@tabler/icons-react";
import { flexRender } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui";
import type { DataTableInstance } from "./tableFeatures";
import type { DragRange, SelectedCell } from "./types";

const ROW_NUM_W = 40;

export interface ColumnMetaItem {
	label: string;
	detail?: string;
	icon?: ReactNode;
}

interface DataTableHeaderProps {
	table: DataTableInstance;
	renderColumnDetails?: (column: number) => ReactNode;
	columnMeta?: (column: number) => ColumnMetaItem[];
	sortOnHeaderClick?: boolean;
	showRowNumberLabel?: boolean;
	hideColumnIndexRow?: boolean;
	databaseStyle?: boolean;
	rowNumberWidth?: number;
	dragRange: DragRange | null;
	selectedCell: SelectedCell | null;
	onColSelect?: (colIdx: number) => void;
	onDeleteColumn?: (colIdx: number) => void;
	onColumnContextMenu?: (colIdx: number) => void;
}

export function DataTableHeader({
	table,
	renderColumnDetails,
	columnMeta,
	sortOnHeaderClick,
	showRowNumberLabel,
	hideColumnIndexRow,
	databaseStyle,
	rowNumberWidth = ROW_NUM_W,
	dragRange,
	selectedCell,
	onColSelect,
	onDeleteColumn,
	onColumnContextMenu,
}: DataTableHeaderProps) {
	return (
		<thead style={{ display: "grid", position: "sticky", top: 0, zIndex: 2 }}>
			{/* Column index row */}
			{!hideColumnIndexRow && (
				<tr className="flex w-full bg-card border-b">
					<th
						className="sticky left-0 z-10 bg-muted border-r"
						style={{ width: rowNumberWidth }}
					/>
					{table.getFlatHeaders().map((header, idx) => (
						<th
							key={header.id}
							className={cn(
								"group relative flex text-xs select-none border-r border-border/40 cursor-pointer",
								(dragRange != null &&
									idx >= dragRange.startCol &&
									idx <= dragRange.endCol) ||
									(dragRange == null && selectedCell?.col === idx + 1)
									? "bg-primary/15 text-primary"
									: "text-muted-foreground/50 hover:bg-muted/60",
							)}
							style={{ width: `calc(var(--header-${header.id}-size) * 1px)` }}
							onClick={() => onColSelect?.(idx)}
							onContextMenu={() => onColumnContextMenu?.(idx)}
						>
							<div className="flex flex-1 justify-center items-center py-1.5 px-1 relative">
								<span>{idx + 1}</span>
								<DropdownMenu>
									<DropdownMenuTrigger
										className={cn(
											"absolute right-0.5 focus:outline-none transition-opacity",
											header.column.getIsSorted()
												? ""
												: "opacity-0 group-hover:opacity-100",
										)}
										onClick={(e) => e.stopPropagation()}
										render={<Button size="icon-sm" variant="ghost" />}
									>
										{header.column.getIsSorted() === "asc" ? (
											<IconSortAscending size={9} />
										) : header.column.getIsSorted() === "desc" ? (
											<IconSortDescending size={9} />
										) : (
											<IconChevronDown size={9} />
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
										{onDeleteColumn && (
											<>
												<DropdownMenuSeparator />
												<DropdownMenuItem onClick={() => onDeleteColumn(idx)}>
													<IconTrash size={13} />
													Delete column
												</DropdownMenuItem>
											</>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
							{/** biome-ignore lint/a11y/noStaticElementInteractions: no need */}
							<div
								onMouseDown={header.getResizeHandler()}
								onTouchStart={header.getResizeHandler()}
								className={`csv-col-resizer${header.column.getIsResizing() ? " isResizing" : ""}`}
							/>
						</th>
					))}
				</tr>
			)}
			{table.getHeaderGroups().map((hg) => (
				<tr
					key={hg.id}
					className={cn(
						"flex w-full bg-card border-b",
						databaseStyle && "border-border bg-muted/40",
					)}
				>
					<th
						className={cn(
							"text-xs font-mono text-muted-foreground bg-muted sticky left-0 z-10 flex justify-center items-center border-r select-none",
							databaseStyle && "bg-muted/40 font-medium",
						)}
						style={{ width: rowNumberWidth }}
					>
						{showRowNumberLabel ? "#" : 1}
					</th>
					{hg.headers.map((header) => {
						const meta = columnMeta?.(header.index) ?? [];
						const sorted = header.column.getIsSorted();
						return (
							<th
								key={header.id}
								aria-sort={
									sorted === "asc"
										? "ascending"
										: sorted === "desc"
											? "descending"
											: undefined
								}
								style={{
									display: "flex",
									width: `calc(var(--header-${header.id}-size) * 1px)`,
									position: "relative",
									alignItems: "center",
									padding: 0,
								}}
								className={cn(
									"select-none border-r border-border",
									databaseStyle && "font-mono text-xs/relaxed",
									selectedCell?.col === header.index + 1 ? "bg-primary/5" : "",
								)}
								onContextMenu={() => onColumnContextMenu?.(header.index)}
							>
								{databaseStyle ? (
									<DropdownMenu>
										<DropdownMenuTrigger
											className={cn(
												"flex h-full min-w-0 flex-1 items-center gap-2 px-3 py-1 text-start outline-none select-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/30",
												selectedCell?.col === header.index + 1 &&
													"bg-primary/10",
											)}
										>
											{renderColumnDetails?.(header.index)}
											<span className="th-label">
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											</span>
											{sorted && (
												<span className="sort-indicator ms-auto">
													{sorted === "asc" ? (
														<IconSortAscending className="size-3.5" />
													) : (
														<IconSortDescending className="size-3.5" />
													)}
												</span>
											)}
										</DropdownMenuTrigger>
										<DropdownMenuContent align="start" className="min-w-52">
											<DropdownMenuGroup>
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
												<DropdownMenuItem
													onClick={() => header.column.toggleSorting(false)}
												>
													<IconSortAscending size={13} />
													Sort A <IconArrowRight className="size-3" /> Z
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => header.column.toggleSorting(true)}
												>
													<IconSortDescending size={13} />
													Sort Z <IconArrowRight className="size-3" /> A
												</DropdownMenuItem>
											</DropdownMenuGroup>
											{meta.length > 0 && (
												<>
													<DropdownMenuSeparator />
													<DropdownMenuGroup>
														<DropdownMenuLabel>
															Constraints and Indexes
														</DropdownMenuLabel>
														{meta.map(({ label, detail, icon }) => (
															<DropdownMenuItem
																key={`${label}-${detail ?? ""}`}
																disabled
																className="data-disabled:opacity-100"
															>
																{icon}
																<span className="flex min-w-0 flex-col">
																	<span>{label}</span>
																	{detail && (
																		<span className="truncate text-muted-foreground">
																			{detail}
																		</span>
																	)}
																</span>
															</DropdownMenuItem>
														))}
													</DropdownMenuGroup>
												</>
											)}
										</DropdownMenuContent>
									</DropdownMenu>
								) : (
									<div
										className={cn(
											"th-content flex justify-between flex-1 min-w-0 px-[14px] py-[8px]",
											renderColumnDetails && "justify-start gap-2",
										)}
									>
										{renderColumnDetails?.(header.index)}
										{sortOnHeaderClick ? (
											<button
												type="button"
												className="th-label cursor-pointer text-start hover:underline"
												aria-label={`Sort by ${header.column.columnDef.header}`}
												onClick={() => header.column.toggleSorting()}
											>
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											</button>
										) : (
											<span className="th-label">
												{flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
											</span>
										)}
										{sorted && (
											<span className="sort-indicator">
												{sorted === "asc" ? (
													<IconSortAscending className="size-4" />
												) : (
													<IconSortDescending className="size-4" />
												)}
											</span>
										)}
									</div>
								)}
								{databaseStyle && (
									/** biome-ignore lint/a11y/noStaticElementInteractions: resize handle */
									<div
										onMouseDown={header.getResizeHandler()}
										onTouchStart={header.getResizeHandler()}
										className={`csv-col-resizer${header.column.getIsResizing() ? " isResizing" : ""}`}
									/>
								)}
							</th>
						);
					})}
				</tr>
			))}
		</thead>
	);
}
