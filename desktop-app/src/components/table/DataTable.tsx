/** biome-ignore-all lint/suspicious/noArrayIndexKey: no need */

import {
	IconArrowRight,
	IconCopy,
	IconDatabase,
	IconFilter,
	IconSortAscending,
	IconSortDescending,
} from "@tabler/icons-react";
import {
	type ColumnFiltersState,
	type ColumnSizingState,
	createColumnHelper,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useMemo, useRef } from "react";
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "../ui";
import { SearchInput } from "./SearchInput";
import { SqlInput } from "./SqlInput";
import type { QueryMode, SelectedCell } from "./types";

const ROW_NUM_W = 40;

export interface DataTableProps {
	/** Processed rows to display — already SQL-filtered or raw data */
	displayData: Record<string, unknown>[];
	/** Column headers derived from displayData */
	displayHeaders: string[];

	// ── Query mode ───────────────────────────────────────────────────────────
	queryMode: QueryMode;
	/** Called when the Filter button is clicked */
	onFilterMode: () => void;
	/** Called when the SQL button is clicked */
	onSqlMode: () => void;
	/** Hide the Filter/SQL toggle entirely (e.g. Excel has no SQL mode) */
	hideSqlToggle?: boolean;
	/** True while an async SQL connection is being opened (e.g. DuckDB) */
	sqlConnecting?: boolean;
	/** True while an async SQL query is running */
	sqlLoading?: boolean;
	/** Current SQL error message, if any */
	sqlError?: string | null;
	/** Called with the full SQL query string when the user runs a query */
	onSqlRun?: (query: string) => void;
	/** Table name embedded in the auto-generated SQL (e.g. "csv", "parquet") */
	sqlTableName?: string;

	// ── Controlled table state ───────────────────────────────────────────────
	sorting: SortingState;
	onSortingChange: Dispatch<SetStateAction<SortingState>>;
	globalFilter: string;
	onGlobalFilterChange: Dispatch<SetStateAction<string>>;
	columnFilters: ColumnFiltersState;
	onColumnFiltersChange: Dispatch<SetStateAction<ColumnFiltersState>>;
	columnSizing: ColumnSizingState;
	onColumnSizingChange: Dispatch<SetStateAction<ColumnSizingState>>;

	// ── Cell interaction ─────────────────────────────────────────────────────
	selectedCell: SelectedCell | null;
	onCellSelect: Dispatch<SetStateAction<SelectedCell | null>>;
	/**
	 * Called on double-click with (rowIndex, colIndex, stringValue, anchorElement).
	 * When provided, double-click is enabled on all cells except in SQL mode.
	 */
	onCellDoubleClick?: (
		rowIndex: number,
		colIndex: number,
		value: string,
		anchorEl: Element,
	) => void;

	// ── Render customization ─────────────────────────────────────────────────
	/**
	 * Custom cell value renderer. Defaults to:
	 * - null/undefined → muted "null" text
	 * - object → JSON.stringify
	 * - other → String(value)
	 */
	renderCellValue?: (value: unknown) => ReactNode;

	// ── Slots ────────────────────────────────────────────────────────────────
	/** Rendered before the mode toggle in the toolbar (e.g. CSV Clear button) */
	toolbarLeading?: ReactNode;
	/** Chips/badges on the right side of the status bar */
	statusRight?: ReactNode;
	/** Rendered below the status bar (e.g. Excel sheet tabs) */
	bottomSlot?: ReactNode;
	/** Overlay rendered after the table root (e.g. cell edit popovers) */
	overlay?: ReactNode;
}

export function DataTable({
	displayData,
	displayHeaders,
	queryMode,
	onFilterMode,
	onSqlMode,
	hideSqlToggle,
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
	renderCellValue,
	toolbarLeading,
	statusRight,
	bottomSlot,
	overlay,
}: DataTableProps) {
	const tableContainerRef = useRef<HTMLDivElement>(null);

	const columnHelper = createColumnHelper<Record<string, unknown>>();

	// biome-ignore lint/correctness/useExhaustiveDependencies: renderCellValue identity is stable per call site
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
			globalFilter: queryMode === "sql" ? "" : globalFilter,
			columnFilters,
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

	const { rows: tableRows } = table.getRowModel();

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

	const filteredRowCount = tableRows.length;
	const totalRows = displayData.length;
	const colCount = displayHeaders.length;

	return (
		<div className="csv-preview">
			{/* ── Toolbar ── */}
			<div className="csv-toolbar">
				{toolbarLeading}
				{!hideSqlToggle && (
					<div className="flex items-stretch rounded border border-[var(--border)] overflow-hidden flex-shrink-0 divide-x divide-[var(--border)]">
						<Button
							variant={queryMode === "search" ? "primary" : "ghost"}
							onClick={onFilterMode}
							className="w-auto rounded-none py-[3px] px-[8px] text-[11px] font-medium uppercase"
						>
							<IconFilter size={13} />
							Filter
						</Button>
						<Button
							variant={queryMode === "sql" ? "primary" : "ghost"}
							onClick={onSqlMode}
							disabled={sqlConnecting}
							className="w-auto rounded-none py-[3px] px-[8px] text-[11px] font-medium uppercase"
						>
							<IconDatabase size={13} />
							{sqlConnecting ? "Connecting..." : "SQL"}
						</Button>
					</div>
				)}
				{queryMode === "search" || hideSqlToggle ? (
					<SearchInput onFilter={(v) => onGlobalFilterChange(v)} />
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
				className="csv-table-wrapper overscroll-none"
			>
				<table
					className="csv-table"
					style={{
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
									className="csv-row-num"
									style={{
										display: "flex",
										width: ROW_NUM_W,
										alignItems: "center",
									}}
								/>
								{hg.headers.map((header) => (
									<th
										key={header.id}
										style={{
											display: "flex",
											width: header.getSize(),
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
					>
						{rowVirtualizer.getVirtualItems().map((virtualRow) => {
							const row = tableRows[virtualRow.index];
							return (
								<tr
									key={row.id}
									data-index={virtualRow.index}
									ref={(node) => rowVirtualizer.measureElement(node)}
									style={{
										display: "flex",
										position: "absolute",
										transform: `translateY(${virtualRow.start}px)`,
										width: "100%",
									}}
								>
									<td
										className="csv-row-num"
										style={{
											display: "flex",
											width: ROW_NUM_W,
											alignItems: "center",
										}}
									>
										{row.index + 1}
									</td>
									{row.getVisibleCells().map((cell, colIdx) => {
										const rawValue = cell.getValue();
										const displayValue =
											rawValue === null || rawValue === undefined
												? "null"
												: typeof rawValue === "object"
													? JSON.stringify(rawValue)
													: String(rawValue);
										const isSelected =
											selectedCell?.row === row.index + 1 &&
											selectedCell?.col === colIdx + 1;
										return (
											<td
												key={cell.id}
												style={{
													display: "flex",
													width: cell.column.getSize(),
													alignItems: "center",
													overflow: "hidden",
													outlineOffset: "-1px",
												}}
												className={
													isSelected
														? "cursor-default outline-2 bg-accent outline-primary"
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
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</td>
										);
									})}
								</tr>
							);
						})}
					</tbody>
				</table>
				{filteredRowCount === 0 && !sqlLoading && (
					<div className="csv-no-results">No matching rows</div>
				)}
			</div>

			{/* ── Status bar ── */}
			<div className="csv-statusbar">
				<span className="csv-statusbar-left">
					{sqlLoading
						? "Running…"
						: filteredRowCount === totalRows
							? `${totalRows} rows × ${colCount} cols`
							: `${filteredRowCount} / ${totalRows} rows × ${colCount} cols`}
				</span>
				<span className="csv-statusbar-center">
					{selectedCell
						? `${selectedCell.row}:${selectedCell.col} (${selectedCell.value.length} chars)`
						: ""}
				</span>
				<span className="csv-statusbar-right">{statusRight}</span>
			</div>

			{bottomSlot}
			{overlay}
		</div>
	);
}
