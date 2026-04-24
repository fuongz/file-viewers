/** biome-ignore-all lint/suspicious/noArrayIndexKey: no need */

import {
	IconArrowDown,
	IconArrowRight,
	IconArrowUp,
	IconCopy,
	IconDatabase,
	IconEraser,
	IconFilter,
	IconPlus,
	IconSortAscending,
	IconSortDescending,
	IconTrash,
} from "@tabler/icons-react";
import {
	type ColumnFiltersState,
	type ColumnSizingState,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type Row,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import {
	useVirtualizer,
	type VirtualItem,
	type Virtualizer,
} from "@tanstack/react-virtual";
import {
	type Dispatch,
	memo,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Button,
	ButtonGroup,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui";
import { SearchInput } from "./SearchInput";
import { SqlInput } from "./SqlInput";
import type { QueryMode, SelectedCell } from "./types";

// ── Module-level constants ─────────────────────────────────────────────────────

const ROW_NUM_W = 40;
const columnHelper = createColumnHelper<Record<string, unknown>>();

// ── Floating context menu ──────────────────────────────────────────────────────

type CtxMenuState =
	| { type: "row"; rowIndex: number; x: number; y: number }
	| {
			type: "cell";
			rowIndex: number;
			colIndex: number;
			value: string;
			x: number;
			y: number;
	  };

function FlatMenuItem({
	icon: Icon,
	children,
	onClick,
	variant,
}: {
	icon?: React.FC<{ size?: number; className?: string }>;
	children: ReactNode;
	onClick: () => void;
	variant?: "destructive";
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`group/ctx-item relative flex min-h-7 w-full cursor-default items-center gap-2 rounded-md px-2 py-1 text-xs/relaxed outline-hidden select-none hover:bg-foreground/10 focus:bg-foreground/10 ${
				variant === "destructive"
					? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
					: ""
			}`}
		>
			{Icon && <Icon size={13} />}
			{children}
		</button>
	);
}

function CtxSep() {
	return <div className="-mx-1 my-1 h-px bg-border/50" />;
}

// ── VirtualRow ─────────────────────────────────────────────────────────────────

interface VirtualRowProps {
	row: Row<Record<string, unknown>>;
	virtualRow: VirtualItem;
	measureElement: (node: Element | null) => void;
	isRowSelected: boolean;
	selectedCellRow: number; // 1-based row of selectedCell, 0 = none
	selectedCellCol: number; // 1-based col of selectedCell, 0 = none
	queryMode: QueryMode;
	onCellSelect: Dispatch<SetStateAction<SelectedCell | null>>;
	onCellDoubleClick?: (
		rowIndex: number,
		colIndex: number,
		value: string,
		anchorEl: Element,
	) => void;
	renderCellValue?: (value: unknown) => ReactNode;
	onRowClick: (rowIndex: number, shiftKey: boolean) => void;
}

function VirtualRowComponent({
	row,
	virtualRow,
	measureElement,
	isRowSelected,
	selectedCellRow,
	selectedCellCol,
	queryMode,
	onCellSelect,
	onCellDoubleClick,
	renderCellValue,
	onRowClick,
}: VirtualRowProps) {
	return (
		<tr
			data-index={virtualRow.index}
			ref={(node) => measureElement(node)}
			style={{
				display: "flex",
				position: "absolute",
				transform: `translateY(${virtualRow.start}px)`,
				width: "100%",
			}}
		>
			{/* Row number */}
			<td
				data-ctx-type="row"
				data-ctx-row={row.index}
				className={`csv-row-num${isRowSelected ? " csv-row-selected" : ""}`}
				style={{
					display: "flex",
					width: ROW_NUM_W,
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
				}}
				onClick={(e) => {
					e.stopPropagation();
					onRowClick(row.index, e.shiftKey);
				}}
			>
				<span className="select-none">{row.index + 1}</span>
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

				return (
					<td
						key={cell.id}
						data-ctx-type="cell"
						data-ctx-row={row.index}
						data-ctx-col={colIdx}
						data-ctx-val={displayValue}
						style={{
							display: "flex",
							width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
							alignItems: "center",
							overflow: "hidden",
							outlineOffset: "-1px",
						}}
						className={
							isSelected
								? "cursor-default outline-2 bg-accent outline-primary"
								: isRowSelected
									? "bg-accent/50"
									: ""
						}
						onClick={() =>
							onCellSelect({
								row: row.index + 1,
								col: colIdx + 1,
								value: displayValue,
							})
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
	// Only re-render for selection changes that affect this specific row
	const rowNum = prev.row.index + 1;
	const prevOnRow = prev.selectedCellRow === rowNum;
	const nextOnRow = next.selectedCellRow === rowNum;
	if (prevOnRow !== nextOnRow) return false;
	if (prevOnRow && prev.selectedCellCol !== next.selectedCellCol) return false;
	return true;
}

const VirtualRow = memo(VirtualRowComponent, rowPropsEqual);

// ── DataTable ──────────────────────────────────────────────────────────────────

export interface DataTableProps {
	displayData: Record<string, unknown>[];
	displayHeaders: string[];

	queryMode: QueryMode;
	onFilterMode?: () => void;
	onSqlMode?: () => void;
	hideSqlToggle?: boolean;
	hideFilterToggle?: boolean;
	sqlConnecting?: boolean;
	sqlLoading?: boolean;
	sqlError?: string | null;
	onSqlRun?: (query: string) => void;
	sqlTableName?: string;

	sorting: SortingState;
	onSortingChange: Dispatch<SetStateAction<SortingState>>;
	globalFilter?: string;
	onGlobalFilterChange?: Dispatch<SetStateAction<string>>;
	columnFilters?: ColumnFiltersState;
	onColumnFiltersChange?: Dispatch<SetStateAction<ColumnFiltersState>>;
	columnSizing: ColumnSizingState;
	onColumnSizingChange: Dispatch<SetStateAction<ColumnSizingState>>;

	selectedCell: SelectedCell | null;
	onCellSelect: Dispatch<SetStateAction<SelectedCell | null>>;
	onCellDoubleClick?: (
		rowIndex: number,
		colIndex: number,
		value: string,
		anchorEl: Element,
	) => void;
	onCellChange?: (rowIndex: number, colIndex: number, value: string) => void;

	selectedRows?: Set<number>;
	onSelectedRowsChange?: (rows: Set<number>) => void;

	onDeleteRows?: (rowIndices: number[]) => void;
	onInsertRowAbove?: (rowIndex: number) => void;
	onInsertRowBelow?: (rowIndex: number) => void;
	onMoveRowUp?: (rowIndex: number) => void;
	onMoveRowDown?: (rowIndex: number) => void;

	renderCellValue?: (value: unknown) => ReactNode;

	toolbarLeading?: ReactNode;
	statusRight?: ReactNode;
	bottomSlot?: ReactNode;
	overlay?: ReactNode;
}

export function DataTable({
	displayData,
	displayHeaders,
	queryMode,
	onFilterMode,
	onSqlMode,
	hideSqlToggle,
	hideFilterToggle,
	sqlConnecting,
	sqlLoading,
	sqlError,
	onSqlRun,
	sqlTableName = "data",
	sorting,
	onSortingChange,
	globalFilter,
	onGlobalFilterChange,
	columnFilters,
	onColumnFiltersChange,
	columnSizing,
	onColumnSizingChange,
	selectedCell,
	onCellSelect,
	onCellDoubleClick,
	onCellChange,
	selectedRows,
	onSelectedRowsChange,
	onDeleteRows,
	onInsertRowAbove,
	onInsertRowBelow,
	onMoveRowUp,
	onMoveRowDown,
	renderCellValue,
	toolbarLeading,
	statusRight,
	bottomSlot,
	overlay,
}: DataTableProps) {
	const tableContainerRef = useRef<HTMLDivElement>(null);
	const ctxMenuRef = useRef<HTMLDivElement>(null);
	const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

	useEffect(() => {
		if (!ctxMenu) return;
		// Close when mousedown outside the menu (contains check lets item clicks through)
		const closeOnOutside = (e: MouseEvent) => {
			if (!ctxMenuRef.current?.contains(e.target as Node)) setCtxMenu(null);
		};
		// Close on any new right-click (capture = fires before tbody opens new menu)
		const closeOnCtx = () => setCtxMenu(null);
		document.addEventListener("mousedown", closeOnOutside);
		document.addEventListener("contextmenu", closeOnCtx, { capture: true });
		return () => {
			document.removeEventListener("mousedown", closeOnOutside);
			document.removeEventListener("contextmenu", closeOnCtx, {
				capture: true,
			});
		};
	}, [ctxMenu]);

	const columns = useMemo(
		() =>
			displayHeaders.map((h, i) =>
				columnHelper.accessor(h, {
					id: `col-${i}`,
					header: h,
					cell: (info) => {
						const value = info.getValue();
						if (renderCellValue) return renderCellValue(value);
						if (value === null || value === undefined) {
							return <span className="text-[var(--text-muted)]">null</span>;
						}
						if (typeof value === "object") return JSON.stringify(value);
						return String(value);
					},
					size: 150,
					minSize: 60,
				}),
			),
		[displayHeaders, renderCellValue],
	);

	const table = useReactTable({
		data: displayData,
		columns,
		columnResizeMode: "onChange",
		state: {
			sorting,
			globalFilter: queryMode === "sql" ? "" : (globalFilter ?? ""),
			columnFilters: columnFilters ?? [],
			columnSizing,
		},
		onSortingChange,
		onGlobalFilterChange,
		onColumnFiltersChange,
		onColumnSizingChange,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
	});

	// Only recompute CSS vars when column sizing or headers change
	const columnSizeVars = useMemo(() => {
		const vars: Record<string, number> = {};
		for (const header of table.getFlatHeaders()) {
			vars[`--header-${header.id}-size`] = header.getSize();
			vars[`--col-${header.column.id}-size`] = header.column.getSize();
		}
		return vars;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [columnSizing, displayHeaders]);

	const { rows: tableRows } = table.getRowModel();

	const virtualizerRef = useRef<Virtualizer<HTMLDivElement, Element> | null>(
		null,
	);
	const rowVirtualizer = useVirtualizer({
		count: tableRows.length,
		estimateSize: () => 33,
		getScrollElement: () => tableContainerRef.current,
		measureElement:
			typeof window !== "undefined" &&
			navigator.userAgent.indexOf("Firefox") === -1
				? (element) => element?.getBoundingClientRect().height
				: undefined,
		overscan: 5,
	});
	virtualizerRef.current = rowVirtualizer;

	// Stable measureElement so it doesn't break VirtualRow memo
	const measureElement = useCallback((node: Element | null) => {
		virtualizerRef.current?.measureElement(node);
	}, []);

	// Stable row-click handler — reads selectedRows from a ref to avoid recreating
	const selectedRowsRef = useRef(selectedRows);
	selectedRowsRef.current = selectedRows;
	const handleRowClick = useCallback(
		(rowIndex: number, shiftKey: boolean) => {
			if (!onSelectedRowsChange) return;
			const current = selectedRowsRef.current;
			const next = new Set(current ?? []);
			if (shiftKey && current && current.size > 0) {
				const lastSelected = Array.from(current).pop()!;
				const start = Math.min(lastSelected, rowIndex);
				const end = Math.max(lastSelected, rowIndex);
				for (let i = start; i <= end; i++) next.add(i);
			} else if (current?.has(rowIndex)) {
				next.delete(rowIndex);
			} else {
				next.add(rowIndex);
			}
			onSelectedRowsChange(next);
		},
		[onSelectedRowsChange],
	);

	// Single context menu handler via event delegation on tbody
	const handleContextMenu = useCallback(
		(e: React.MouseEvent<HTMLTableSectionElement>) => {
			e.preventDefault();
			const el = e.target as Element;
			const ctxEl = el.closest("[data-ctx-type]") as HTMLElement | null;
			if (!ctxEl) return;
			const type = ctxEl.dataset.ctxType;
			const rowIndex = Number(ctxEl.dataset.ctxRow);
			if (type === "cell") {
				setCtxMenu({
					type: "cell",
					rowIndex,
					colIndex: Number(ctxEl.dataset.ctxCol),
					value: ctxEl.dataset.ctxVal ?? "",
					x: e.clientX,
					y: e.clientY,
				});
			} else {
				setCtxMenu({ type: "row", rowIndex, x: e.clientX, y: e.clientY });
			}
		},
		[],
	);

	const filteredRowCount = tableRows.length;
	const totalRows = displayData.length;
	const colCount = displayHeaders.length;

	return (
		<div className="csv-preview max-w-full">
			{/* ── Toolbar ── */}
			<div className="flex gap-2 px-2 py-1 border-b w-full items-center wrap-flex">
				{toolbarLeading}
				{!hideSqlToggle && !hideFilterToggle && (
					<ButtonGroup>
						<Button
							variant={queryMode === "search" ? "default" : "outline"}
							onClick={onFilterMode}
						>
							<IconFilter />
							Filter
						</Button>
						<Button
							variant={queryMode === "sql" ? "default" : "outline"}
							onClick={onSqlMode}
							disabled={sqlConnecting}
						>
							<IconDatabase />
							{sqlConnecting ? "Connecting..." : "SQL"}
						</Button>
					</ButtonGroup>
				)}
				{(queryMode === "search" && !hideFilterToggle) || hideSqlToggle ? (
					<SearchInput onFilter={(v) => onGlobalFilterChange?.(v)} />
				) : (
					<SqlInput
						onRun={onSqlRun ?? (() => {})}
						disabled={sqlLoading}
						tableName={sqlTableName}
					/>
				)}
			</div>

			{/* ── SQL error bar ── */}
			{queryMode === "sql" && sqlError && (
				<div className="csv-sql-error">
					<span className="csv-sql-error-badge">SQL Error</span>
					{sqlError}
				</div>
			)}

			{/* ── Table (virtualized) ── */}
			<div
				ref={tableContainerRef}
				className="flex-1 overflow-auto overscroll-none"
			>
				<table
					className="csv-table"
					style={{
						...(columnSizeVars as React.CSSProperties),
						display: "grid",
						width: table.getCenterTotalSize() + ROW_NUM_W,
					}}
				>
					<thead
						style={{ display: "grid", position: "sticky", top: 0, zIndex: 2 }}
					>
						{table.getHeaderGroups().map((hg) => (
							<tr key={hg.id} style={{ display: "flex", width: "100%" }}>
								<th
									className="csv-row-num cursor-pointer"
									style={{
										display: "flex",
										width: ROW_NUM_W,
										alignItems: "center",
										justifyContent: "center",
									}}
									onClick={() => {
										if (!onSelectedRowsChange) return;
										if (
											selectedRows &&
											selectedRows.size === displayData.length
										) {
											onSelectedRowsChange(new Set());
										} else {
											const all = new Set(displayData.map((_, i) => i));
											onSelectedRowsChange(all);
										}
									}}
									title="Select all rows"
								>
									<span
										className={`size-4 rounded border ${
											selectedRows &&
											selectedRows.size === displayData.length &&
											displayData.length > 0
												? "bg-primary border-primary"
												: "border-input"
										}`}
									/>
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
									>
										<DropdownMenu>
											<DropdownMenuTrigger
												className="th-content flex justify-between flex-1 min-w-0 px-[14px] py-[8px] bg-transparent border-none text-left cursor-pointer hover:bg-[var(--csv-thead-hover-bg)] focus:outline-none"
												style={{ color: "inherit", font: "inherit" }}
											>
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
						))}
					</thead>
					<tbody
						style={{
							display: "grid",
							height: `${rowVirtualizer.getTotalSize()}px`,
							position: "relative",
						}}
						onContextMenu={handleContextMenu}
					>
						{rowVirtualizer.getVirtualItems().map((virtualRow) => {
							const row = tableRows[virtualRow.index];
							return (
								<VirtualRow
									key={row.id}
									row={row}
									virtualRow={virtualRow}
									measureElement={measureElement}
									isRowSelected={selectedRows?.has(row.index) ?? false}
									selectedCellRow={selectedCell?.row ?? 0}
									selectedCellCol={selectedCell?.col ?? 0}
									queryMode={queryMode}
									onCellSelect={onCellSelect}
									onCellDoubleClick={onCellDoubleClick}
									renderCellValue={renderCellValue}
									onRowClick={handleRowClick}
								/>
							);
						})}
					</tbody>
				</table>
				{filteredRowCount === 0 && !sqlLoading && (
					<div className="csv-no-results">No matching rows</div>
				)}
			</div>

			{/* ── Status bar ── */}
			<div className="w-full flex justify-between border-t px-2 text-xs py-1 items-center text-muted-foreground">
				<span>
					{sqlLoading
						? "Running…"
						: filteredRowCount === totalRows
							? `${totalRows} rows - ${colCount} cols`
							: `${filteredRowCount} / ${totalRows} rows x ${colCount} cols`}
				</span>
				<span>
					{selectedCell
						? `${selectedCell.row}:${selectedCell.col} (${selectedCell.value.length} chars)`
						: ""}
				</span>
				<span>{statusRight}</span>
			</div>
			{bottomSlot}
			{overlay}

			{/* ── Single floating context menu ── */}
			{ctxMenu && (
				<div
					ref={ctxMenuRef}
					role="menu"
					className="fixed z-50 min-w-36 rounded-lg border bg-popover/80 p-1 shadow-md ring-1 ring-foreground/10 backdrop-blur-xl"
					style={{ left: ctxMenu.x, top: ctxMenu.y }}
				>
					{ctxMenu.type === "cell" ? (
						<>
							<FlatMenuItem
								icon={IconEraser}
								onClick={() => {
									onCellChange?.(ctxMenu.rowIndex, ctxMenu.colIndex, "");
									setCtxMenu(null);
								}}
							>
								Empty data
							</FlatMenuItem>
							<FlatMenuItem
								icon={IconCopy}
								onClick={() => {
									navigator.clipboard.writeText(ctxMenu.value);
									setCtxMenu(null);
								}}
							>
								Copy cell
							</FlatMenuItem>
						</>
					) : (
						<>
							<FlatMenuItem
								icon={IconPlus}
								onClick={() => {
									onInsertRowAbove?.(ctxMenu.rowIndex);
									setCtxMenu(null);
								}}
							>
								Insert row above
							</FlatMenuItem>
							<FlatMenuItem
								icon={IconPlus}
								onClick={() => {
									onInsertRowBelow?.(ctxMenu.rowIndex);
									setCtxMenu(null);
								}}
							>
								Insert row below
							</FlatMenuItem>
							<CtxSep />
							<FlatMenuItem
								icon={IconArrowUp}
								onClick={() => {
									onMoveRowUp?.(ctxMenu.rowIndex);
									setCtxMenu(null);
								}}
							>
								Move row up
							</FlatMenuItem>
							<FlatMenuItem
								icon={IconArrowDown}
								onClick={() => {
									onMoveRowDown?.(ctxMenu.rowIndex);
									setCtxMenu(null);
								}}
							>
								Move row down
							</FlatMenuItem>
							<CtxSep />
							<FlatMenuItem
								icon={IconTrash}
								variant="destructive"
								onClick={() => {
									onDeleteRows?.([ctxMenu.rowIndex]);
									setCtxMenu(null);
								}}
							>
								Delete row
							</FlatMenuItem>
						</>
					)}
				</div>
			)}
		</div>
	);
}
