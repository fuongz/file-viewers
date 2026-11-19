import Editor from "@monaco-editor/react";
import {
	IconChevronDown,
	IconChevronLeft,
	IconChevronRight,
	IconInfoCircle,
	IconKey,
	IconLink,
	IconListDetails,
	IconListNumbers,
	IconPlayerPlay,
	IconPlus,
	IconRefresh,
	IconSearch,
	IconTrash,
	IconX,
} from "@tabler/icons-react";
import type { SortingState } from "@tanstack/react-table";
import { invoke } from "@tauri-apps/api/core";
import {
	type SetStateAction,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { useTableState } from "@/hooks/useTableState";
import { formatBytes } from "@/lib/utils";
import { selectIsDark, useAppStore } from "@/store";
import { splitSqlStatements, statementAtCursor } from "@/utils/sqlStatements";
import { DataTable } from "./table/DataTable";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { ButtonGroup } from "./ui/button-group";
import {
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
} from "./ui/context-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "./ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "./ui/input-group";

type Cell =
	| { kind: "null" }
	| { kind: "text" | "number"; value: string }
	| { kind: "blob"; value: number };

interface ColumnDetails {
	name: string;
	primaryKey: boolean;
	notNull: boolean;
	defaultValue: string | null;
	references: string[];
	indexes: { name: string; unique: boolean; partial: boolean }[];
	hidden: boolean;
}

interface Page {
	columns: string[];
	rows: Cell[][];
	hasMore: boolean;
	editable: boolean;
	rowKeys: unknown[][];
	columnDetails: ColumnDetails[];
	queryTimeMs: number;
}

export interface SchemaColumn {
	name: string;
	typeName: string;
	primaryKey: boolean;
	references: { table: string; column: string } | null;
}

export interface SchemaTable {
	name: string;
	columns: SchemaColumn[];
}

const PAGE_SIZE = 50;

function formatQueryTime(page?: Page) {
	if (!page) return "—";
	if (page.queryTimeMs >= 1000) {
		return `${(page.queryTimeMs / 1000).toFixed(2)}s`;
	}
	return `${page.queryTimeMs.toFixed(1)}ms`;
}

interface Filter {
	column: string;
	operator: string;
	value: string | null;
}

interface EditingCell {
	rowIndex: number;
	colIndex: number;
	draftValue: string;
}

const filterOperators = new Map([
	["=", "eq"],
	["!=", "ne"],
	[">", "gt"],
	[">=", "ge"],
	["<", "lt"],
	["<=", "le"],
	["like", "like"],
	["not like", "not_like"],
	["is null", "is_null"],
	["is not null", "is_not_null"],
]);

function parseFilterExpression(
	expression: string,
	columns: string[],
): { filter?: Filter; error?: string } {
	const match = expression.match(
		/^\s*(?:"((?:[^"]|"")*)"|([^\s]+))\s+(IS\s+NOT\s+NULL|IS\s+NULL|NOT\s+LIKE|LIKE|>=|<=|!=|=|>|<)(?:\s+(.*))?\s*$/i,
	);
	if (!match) {
		return { error: "Use [column] [operator] [value], e.g. id = 10." };
	}

	const typedColumn = (match[1] ?? match[2] ?? "").replace(/""/g, '"');
	const column = columns.find(
		(name) =>
			name === typedColumn || name.toLowerCase() === typedColumn.toLowerCase(),
	);
	if (!column) return { error: `Unknown column: ${typedColumn}` };

	const operatorToken = match[3].replace(/\s+/g, " ").toLowerCase();
	const operator = filterOperators.get(operatorToken);
	if (!operator) return { error: "Unsupported operator." };

	const rawValue = match[4];
	const needsValue = operator !== "is_null" && operator !== "is_not_null";
	if (!needsValue) {
		if (rawValue?.trim()) {
			return { error: `${match[3].toUpperCase()} does not take a value.` };
		}
		return { filter: { column, operator, value: null } };
	}
	if (rawValue === undefined) {
		return { error: "Enter a value after the operator." };
	}

	const trimmedValue = rawValue.trim();
	let value = trimmedValue;
	if (trimmedValue.startsWith("'") || trimmedValue.startsWith('"')) {
		const quote = trimmedValue[0];
		if (trimmedValue.length < 2 || !trimmedValue.endsWith(quote)) {
			return { error: "Close the quoted value with a matching quote." };
		}
		value = trimmedValue.slice(1, -1).split(`${quote}${quote}`).join(quote);
	}
	return { filter: { column, operator, value } };
}

function cellValue(cell: Cell) {
	switch (cell.kind) {
		case "null":
			return null;
		case "blob":
			return `BLOB · ${formatBytes(cell.value)}`;
		case "number": {
			const value = Number(cell.value);
			return Number.isFinite(value) &&
				(!Number.isInteger(value) || Number.isSafeInteger(value))
				? value
				: cell.value;
		}
		default:
			return cell.value;
	}
}

function ColumnIndicators({ details }: { details: ColumnDetails }) {
	const indexes = details.indexes.map(
		({ name, unique, partial }) =>
			`${unique ? "Unique index" : "Index"} ${name}${partial ? " (partial)" : ""}`,
	);
	const other = [
		details.notNull ? "NOT NULL" : null,
		details.defaultValue !== null ? `DEFAULT ${details.defaultValue}` : null,
	].filter(Boolean);
	const detailsList = [
		{
			label: details.primaryKey ? "Primary key" : "",
			Icon: IconKey,
			className: "text-emerald-500",
		},
		{
			label: details.references
				.map((target) => `References ${target}`)
				.join("\n"),
			Icon: IconLink,
			className: "text-sky-500",
		},
		{
			label: indexes.join("\n"),
			Icon: IconListNumbers,
			className: "text-muted-foreground",
		},
		{
			label: other.join("\n"),
			Icon: IconListDetails,
			className: "text-muted-foreground",
		},
	];

	return (
		<span className="inline-flex shrink-0 gap-1">
			{detailsList
				.filter(({ label }) => label)
				.map(({ label, Icon, className }) => (
					<span key={label} title={label} className={className}>
						<span className="sr-only">{label}</span>
						<Icon className="size-3.5" aria-hidden="true" />
					</span>
				))}
		</span>
	);
}

type TableState = ReturnType<typeof useTableState>;

function SqliteGrid({
	page,
	state,
	offset = 0,
	onSort = state.setSorting,
	selectedRows,
	onSelectRows,
	onCellDoubleClick,
	editingCell,
	onCellEditChange,
	onCellEditCommit,
	onCellEditCancel,
}: {
	page: Page;
	state: TableState;
	offset?: number;
	onSort?: TableState["setSorting"];
	selectedRows?: Set<number>;
	onSelectRows?: (rows: Set<number>) => void;
	onCellDoubleClick?: (
		rowIndex: number,
		colIndex: number,
		value: string,
		anchorEl: Element,
	) => void;
	editingCell?: { rowIndex: number; colIndex: number; value: string } | null;
	onCellEditChange?: (value: string) => void;
	onCellEditCommit?: () => void;
	onCellEditCancel?: () => void;
}) {
	const headers = useMemo(
		() => page.columns.map((_, index) => `c${index}`),
		[page.columns],
	);
	const rows = useMemo(
		() =>
			page.rows.map((row) =>
				Object.fromEntries(
					row.map((cell, index) => [headers[index], cellValue(cell)]),
				),
			),
		[headers, page.rows],
	);

	const columnMeta = (index: number) => {
		const details = page.columnDetails.find(
			({ name }) => name === page.columns[index],
		);
		if (!details) return [];
		return [
			...(details.primaryKey
				? [
						{
							label: "Primary Key",
							detail: details.name,
							icon: <IconKey aria-hidden="true" className="text-emerald-500" />,
						},
					]
				: []),
			...details.references.map((reference) => ({
				label: "Reference To",
				detail: reference,
				icon: <IconLink aria-hidden="true" className="text-sky-500" />,
			})),
			...details.indexes.map((index) => ({
				label: `${index.unique ? "Unique index" : "Index"}${index.partial ? " · partial" : ""}`,
				detail: index.name,
				icon: <IconListNumbers aria-hidden="true" />,
			})),
			...(details.notNull
				? [
						{
							label: "NOT NULL",
							detail: details.name,
							icon: <IconListDetails aria-hidden="true" />,
						},
					]
				: []),
			...(details.defaultValue !== null
				? [
						{
							label: "Default",
							detail: details.defaultValue,
							icon: <IconListDetails aria-hidden="true" />,
						},
					]
				: []),
		];
	};

	return (
		<DataTable
			hideToolbar
			hideStatusBar
			hideColumnIndexRow
			databaseStyle
			readOnly
			queryMode="search"
			rowNumberWidth={56}
			displayHeaders={headers}
			columnLabels={page.columns}
			renderColumnDetails={(index) => {
				const details = page.columnDetails.find(
					({ name }) => name === page.columns[index],
				);
				return details && <ColumnIndicators details={details} />;
			}}
			columnMeta={columnMeta}
			renderColumnContextInfo={(index) => {
				const metadata = columnMeta(index);
				return (
					<>
						<ContextMenuSeparator />
						<ContextMenuGroup>
							<ContextMenuLabel>Constraints and Indexes</ContextMenuLabel>
							{metadata.length ? (
								metadata.map(({ label, detail, icon }) => (
									<ContextMenuItem
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
									</ContextMenuItem>
								))
							) : (
								<ContextMenuItem disabled>
									No constraints or indexes
								</ContextMenuItem>
							)}
						</ContextMenuGroup>
					</>
				);
			}}
			displayData={rows}
			rowNumberOffset={offset}
			manualSorting={onSort !== state.setSorting}
			sorting={state.sorting}
			onSortingChange={onSort}
			columnSizing={state.columnSizing}
			onColumnSizingChange={state.setColumnSizing}
			selectedCell={state.selectedCell}
			onCellSelect={state.setSelectedCell}
			onCellDoubleClick={onCellDoubleClick}
			editingCell={editingCell}
			onCellEditChange={onCellEditChange}
			onCellEditCommit={onCellEditCommit}
			onCellEditCancel={onCellEditCancel}
			selectedRows={selectedRows}
			onSelectedRowsChange={onSelectRows}
		/>
	);
}

function TableFilter({
	columns,
	onApply,
}: {
	columns: string[];
	onApply: (filter: Filter | null) => void;
}) {
	const [expression, setExpression] = useState("");
	const [error, setError] = useState<string>();

	return (
		<form
			className="flex min-w-0 flex-1 flex-wrap items-center gap-1"
			onSubmit={(event) => {
				event.preventDefault();
				if (!expression.trim()) {
					setError(undefined);
					onApply(null);
					return;
				}
				const parsed = parseFilterExpression(expression, columns);
				if (parsed.error) {
					setError(parsed.error);
					return;
				}
				setError(undefined);
				onApply(parsed.filter ?? null);
			}}
		>
			<InputGroup className="h-7 min-w-0 flex-1">
				<InputGroupInput
					type="search"
					aria-label="Filter rows"
					className="text-sm"
					placeholder="eg: id = 10"
					value={expression}
					aria-invalid={!!error}
					aria-describedby={error ? "sqlite-filter-error" : undefined}
					onChange={(event) => {
						setExpression(event.target.value);
						if (error) setError(undefined);
					}}
				/>
				<InputGroupAddon aria-hidden="true">
					<IconSearch />
				</InputGroupAddon>
				{expression && (
					<InputGroupAddon align="inline-end">
						<InputGroupButton
							size="icon-xs"
							aria-label="Clear filter"
							onClick={() => {
								setExpression("");
								setError(undefined);
								onApply(null);
							}}
						>
							<IconX aria-hidden="true" />
						</InputGroupButton>
					</InputGroupAddon>
				)}
			</InputGroup>
			{error && (
				<p
					id="sqlite-filter-error"
					role="alert"
					className="basis-full px-1 pb-1 text-xs text-destructive"
				>
					{error}
				</p>
			)}
		</form>
	);
}

function InsertRowDialog({
	name,
	columns,
	busy,
	onClose,
	onInsert,
}: {
	name: string;
	columns: ColumnDetails[];
	busy: boolean;
	onClose: () => void;
	onInsert: (values: { column: string; value: string }[]) => Promise<void>;
}) {
	const [values, setValues] = useState(() => new Map<string, string>());
	const fieldsId = useId();
	const [error, setError] = useState<string>();
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !busy) onClose();
			}}
		>
			<DialogContent showCloseButton={!busy}>
				<DialogTitle>Insert row</DialogTitle>
				<DialogDescription>
					Leave fields blank to use the defaults in {name}.
				</DialogDescription>
				<form
					className="flex min-h-0 flex-col gap-3"
					onSubmit={(event) => {
						event.preventDefault();
						setError(undefined);
						void onInsert(
							[...values]
								.filter(([, value]) => value !== "")
								.map(([column, value]) => ({ column, value })),
						).catch((error) => setError(String(error)));
					}}
				>
					<div className="flex max-h-[50dvh] flex-col gap-2 overflow-y-auto">
						{columns
							.filter((column) => !column.hidden)
							.map((column, index) => {
								const id = `${fieldsId}-${index}`;
								return (
									<div key={column.name} className="flex flex-col gap-1">
										<label htmlFor={id} className="font-medium">
											{column.name}
										</label>
										<Input
											id={id}
											value={values.get(column.name) ?? ""}
											placeholder={column.defaultValue ?? undefined}
											disabled={busy}
											onChange={(event) =>
												setValues(
													new Map(values).set(column.name, event.target.value),
												)
											}
										/>
									</div>
								);
							})}
					</div>
					{error && (
						<p role="alert" className="text-destructive">
							{error}
						</p>
					)}
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="ghost"
							disabled={busy}
							onClick={onClose}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={busy}>
							Insert row
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function SqliteRows({
	path,
	name,
	revision,
	onChange,
}: {
	path: string;
	name: string;
	revision: number;
	onChange: () => void;
}) {
	const table = useTableState();
	const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
	const [offset, setOffset] = useState(0);
	const [limit, setLimit] = useState(PAGE_SIZE);
	const [limitDraft, setLimitDraft] = useState(String(PAGE_SIZE));
	const [offsetDraft, setOffsetDraft] = useState("0");
	const [filter, setFilter] = useState<Filter | null>(null);
	const [reload, setReload] = useState(0);
	const [result, setResult] = useState<{ page: Page; offset: number }>();
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string>();
	const [actionError, setActionError] = useState<string>();
	const [inserting, setInserting] = useState(false);
	const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
	const editSaveInProgressRef = useRef(false);
	const editCancelRef = useRef(false);
	const [pendingDelete, setPendingDelete] = useState<{
		key: unknown[];
		row: number;
	}>();
	const [busy, setBusy] = useState(false);
	const { sorting, setSorting, setSelectedCell } = table;

	useEffect(() => {
		let canceled = false;
		setLoading(true);
		setLoadError(undefined);
		setSelectedRows(new Set());
		setSelectedCell(null);
		const sort = sorting[0];
		invoke<Page>("sqlite_page", {
			path,
			name,
			offset,
			limit,
			filter,
			sort: sort
				? { column: Number(sort.id.slice(4)), descending: sort.desc }
				: null,
		})
			.then(
				(page) => {
					if (!canceled) setResult({ page, offset });
				},
				(error) => {
					if (!canceled) setLoadError(String(error));
				},
			)
			.finally(() => {
				if (!canceled) setLoading(false);
			});
		return () => {
			canceled = true;
		};
	}, [
		path,
		name,
		offset,
		limit,
		filter,
		reload,
		revision,
		sorting,
		setSelectedCell,
	]);

	useEffect(() => {
		setOffsetDraft(String(offset));
	}, [offset]);

	function commitLimit() {
		const parsed = Number.parseInt(limitDraft, 10);
		const next = Number.isFinite(parsed)
			? Math.min(1000, Math.max(1, parsed))
			: limit;
		setLimit(next);
		setLimitDraft(String(next));
		setOffset(0);
	}

	function commitOffset() {
		const parsed = Number.parseInt(offsetDraft, 10);
		const next = Number.isFinite(parsed) ? Math.max(0, parsed) : offset;
		setOffset(next);
		setOffsetDraft(String(next));
	}

	const page = result?.page;
	const selectedRow =
		selectedRows.size === 1
			? [...selectedRows][0]
			: selectedRows.size === 0 && table.selectedCell
				? table.selectedCell.row - 1
				: undefined;
	const key =
		selectedRow === undefined ? undefined : page?.rowKeys[selectedRow];

	function changeSort(next: SetStateAction<SortingState>) {
		setOffset(0);
		setSorting(next);
	}

	async function removeRow() {
		if (!pendingDelete || busy) return;
		setBusy(true);
		setActionError(undefined);
		try {
			await invoke("sqlite_delete", { path, name, key: pendingDelete.key });
			setPendingDelete(undefined);
			setOffset(0);
			onChange();
		} catch (error) {
			setActionError(String(error));
		} finally {
			setBusy(false);
		}
	}

	function startCellEdit(
		rowIndex: number,
		colIndex: number,
		_value: string,
		_anchorEl: Element,
	) {
		const cell = page?.rows[rowIndex]?.[colIndex];
		if (
			busy ||
			editSaveInProgressRef.current ||
			!page?.editable ||
			!page.rowKeys[rowIndex] ||
			!cell ||
			cell.kind === "blob"
		)
			return;
		editCancelRef.current = false;
		setActionError(undefined);
		setEditingCell({
			rowIndex,
			colIndex,
			draftValue: cell.kind === "null" ? "" : String(cellValue(cell)),
		});
	}

	async function saveCellEdit() {
		if (!editingCell || !page || busy || editSaveInProgressRef.current) return;
		const editing = editingCell;
		const column = page.columns[editing.colIndex];
		const key = page.rowKeys[editing.rowIndex];
		if (!column || !key) {
			setActionError(
				"This row cannot be updated because it has no stable key.",
			);
			return;
		}

		editSaveInProgressRef.current = true;
		setBusy(true);
		setActionError(undefined);
		try {
			await invoke("sqlite_update", {
				path,
				name,
				key,
				column,
				value: editing.draftValue,
			});
			setEditingCell(null);
			setOffset(0);
			onChange();
		} catch (error) {
			setActionError(String(error));
		} finally {
			editSaveInProgressRef.current = false;
			setBusy(false);
		}
	}

	function commitCellEdit() {
		if (editCancelRef.current) {
			editCancelRef.current = false;
			return;
		}
		void saveCellEdit();
	}

	function cancelCellEdit() {
		editCancelRef.current = true;
		setEditingCell(null);
		setActionError(undefined);
	}

	return (
		<section
			className="flex h-full min-h-0 min-w-0 flex-col"
			aria-label={`Rows in ${name}`}
			aria-busy={loading}
		>
			<div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/60 px-2 py-1">
				<ButtonGroup aria-label="Table actions" className="shrink-0">
					<Button
						variant="outline"
						size="icon-md"
						aria-label="Refresh table"
						disabled={loading || busy}
						onClick={() => setReload((value) => value + 1)}
					>
						<IconRefresh />
					</Button>
					<Button
						variant="outline"
						size="icon-md"
						aria-label="Insert row"
						disabled={!page?.editable || loading || busy}
						onClick={() => setInserting(true)}
					>
						<IconPlus />
					</Button>
					<Button
						variant="outline"
						size="icon-md"
						aria-label="Delete selected row"
						disabled={!key || loading || busy}
						onClick={() => {
							if (key && selectedRow !== undefined) {
								setActionError(undefined);
								setPendingDelete({ key, row: offset + selectedRow + 1 });
							}
						}}
					>
						<IconTrash />
					</Button>
				</ButtonGroup>
				{page && (
					<TableFilter
						columns={page.columns}
						onApply={(next) => {
							setOffset(0);
							setFilter(next);
						}}
					/>
				)}
			</div>
			{loadError && (
				<p role="alert" className="px-3 py-2 text-destructive">
					Could not read rows. {loadError}
				</p>
			)}
			{!pendingDelete && actionError && (
				<p role="alert" className="px-3 py-2 text-destructive">
					{actionError}
				</p>
			)}
			<div className="min-h-0 flex-1">
				{result && !loadError ? (
					<SqliteGrid
						page={result.page}
						offset={result.offset}
						state={table}
						onSort={changeSort}
						selectedRows={selectedRows}
						onSelectRows={setSelectedRows}
						onCellDoubleClick={startCellEdit}
						editingCell={
							editingCell
								? {
										rowIndex: editingCell.rowIndex,
										colIndex: editingCell.colIndex,
										value: editingCell.draftValue,
									}
								: null
						}
						onCellEditChange={(value) =>
							setEditingCell((current) =>
								current ? { ...current, draftValue: value } : null,
							)
						}
						onCellEditCommit={commitCellEdit}
						onCellEditCancel={cancelCellEdit}
					/>
				) : loading ? (
					<p role="status" className="p-3 text-muted-foreground">
						Loading rows…
					</p>
				) : null}
			</div>
			<footer className="flex shrink-0 flex-wrap items-center gap-3 border-t border-border/60 px-2 py-1 text-xs text-muted-foreground">
				<span role="status" className="flex items-center gap-1 tabular-nums">
					Query Time
					<IconInfoCircle
						className="size-3.5"
						aria-label="Elapsed time of the query that produced this page"
					/>
					: {loading ? "…" : formatQueryTime(page)}
				</span>
				<span className="tabular-nums">
					Rows Read: {loading ? "…" : (page?.rows.length ?? 0)}
				</span>
				<div className="ms-auto flex items-center gap-1.5">
					<label
						htmlFor="sqlite-page-limit"
						className="flex items-center gap-1"
					>
						Limit
						<Input
							id="sqlite-page-limit"
							type="number"
							inputMode="numeric"
							min={1}
							max={1000}
							aria-label="Rows per page"
							value={limitDraft}
							disabled={loading || busy}
							onChange={(event) => setLimitDraft(event.currentTarget.value)}
							onBlur={commitLimit}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									commitLimit();
								}
							}}
							className="h-6 w-16 px-1.5 text-xs tabular-nums"
						/>
					</label>
					<label
						htmlFor="sqlite-page-offset"
						className="flex items-center gap-1"
					>
						Offset
						<Input
							id="sqlite-page-offset"
							type="number"
							inputMode="numeric"
							min={0}
							aria-label="Row offset"
							value={offsetDraft}
							disabled={loading || busy}
							onChange={(event) => setOffsetDraft(event.currentTarget.value)}
							onBlur={commitOffset}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									commitOffset();
								}
							}}
							className="h-6 w-16 px-1.5 text-xs tabular-nums"
						/>
					</label>
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="Previous page"
						disabled={!offset || loading || busy}
						onClick={() => setOffset(Math.max(0, offset - limit))}
					>
						<IconChevronLeft />
					</Button>
					<Button
						size="icon-sm"
						variant="ghost"
						aria-label="Next page"
						disabled={!page?.hasMore || loading || busy || !!loadError}
						onClick={() => setOffset(offset + limit)}
					>
						<IconChevronRight />
					</Button>
				</div>
			</footer>
			<AlertDialog
				open={!!pendingDelete}
				onOpenChange={(open) => {
					if (!open && !busy) {
						setPendingDelete(undefined);
						setActionError(undefined);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete row?</AlertDialogTitle>
						<AlertDialogDescription>
							Row {pendingDelete?.row} will be deleted from {name}. This change
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					{actionError && (
						<p role="alert" className="text-destructive">
							{actionError}
						</p>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={busy}
							onClick={() => void removeRow()}
						>
							Delete row
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			{inserting && page && (
				<InsertRowDialog
					name={name}
					columns={page.columnDetails}
					busy={busy}
					onClose={() => setInserting(false)}
					onInsert={async (values) => {
						setBusy(true);
						try {
							await invoke("sqlite_insert", { path, name, values });
							setInserting(false);
							setOffset(0);
							onChange();
						} finally {
							setBusy(false);
						}
					}}
				/>
			)}
		</section>
	);
}

const SQL_KEYWORDS = [
	"select",
	"from",
	"where",
	"group by",
	"order by",
	"limit",
	"offset",
	"join",
	"left join",
	"inner join",
	"outer join",
	"cross join",
	"on",
	"as",
	"distinct",
	"having",
	"union",
	"union all",
	"insert into",
	"update",
	"delete from",
	"values",
	"set",
	"and",
	"or",
	"not",
	"null",
	"is null",
	"is not null",
	"in",
	"between",
	"like",
	"exists",
	"case",
	"when",
	"then",
	"else",
	"end",
	"with",
	"recursive",
	"pragma",
	"explain query plan",
];

const SQL_FUNCTIONS = [
	"count",
	"sum",
	"avg",
	"min",
	"max",
	"total",
	"group_concat",
	"length",
	"lower",
	"upper",
	"trim",
	"ltrim",
	"rtrim",
	"substr",
	"replace",
	"instr",
	"printf",
	"round",
	"abs",
	"random",
	"coalesce",
	"ifnull",
	"nullif",
	"typeof",
	"date",
	"time",
	"datetime",
	"julianday",
	"strftime",
	"unixepoch",
	"json",
	"json_array",
	"json_extract",
	"json_object",
	"json_replace",
	"json_type",
	"json_valid",
	"sqlite_compileoption_get",
	"sqlite_compileoption_used",
	"sqlite_version",
];

const completionRegistryKey = "__viewerSqlCompletionRegistered";
let completionSchema: SchemaTable[] = [];

function clauseBeforeCursor(text: string) {
	const matches = [
		...text.matchAll(
			/\b(group\s+by|order\s+by|union\s+all|insert\s+into|select|from|where|join|on|having|limit|offset)\b/gi,
		),
	];
	return (matches.at(-1)?.[1] ?? "").toLowerCase().replace(/\s+/g, " ");
}

function tablesInText(text: string) {
	const names: string[] = [];
	for (const match of text.matchAll(
		/\b(?:from|join)\s+([`"[]?[\w.]+[`"\]]?)/gi,
	)) {
		const name =
			match[1]
				.replace(/[`"[\]]/g, "")
				.split(".")
				.pop() ?? "";
		if (
			name &&
			!names.some((item) => item.toLowerCase() === name.toLowerCase())
		) {
			names.push(name);
		}
	}
	return names;
}

function registerSqlCompletion(monaco: typeof import("monaco-editor")) {
	const scope = globalThis as Record<string, unknown>;
	if (scope[completionRegistryKey]) return;
	scope[completionRegistryKey] = true;
	monaco.languages.registerCompletionItemProvider("sql", {
		provideCompletionItems(model, position) {
			const word = model.getWordUntilPosition(position);
			const range = {
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: word.startColumn,
				endColumn: word.endColumn,
			};
			const textBefore = model.getValueInRange({
				startLineNumber: 1,
				startColumn: 1,
				endLineNumber: position.lineNumber,
				endColumn: position.column,
			});
			const clause = clauseBeforeCursor(textBefore);
			const statementTables = tablesInText(textBefore).map((name) =>
				name.toLowerCase(),
			);
			const tablesFirst =
				clause === "from" || clause === "join" || clause === "insert into";
			const columnsFirst =
				clause === "where" ||
				clause === "on" ||
				clause === "having" ||
				clause === "select" ||
				clause === "group by" ||
				clause === "order by";

			const keywordPriority = tablesFirst ? 1 : columnsFirst ? 2 : 0;
			const functionPriority = tablesFirst ? 3 : columnsFirst ? 1 : 1;
			const tablePriority = tablesFirst ? 0 : columnsFirst ? 4 : 2;

			const byLabel = new Map<
				string,
				import("monaco-editor").languages.CompletionItem
			>();
			const add = (item: import("monaco-editor").languages.CompletionItem) => {
				const key = String(item.label).toLowerCase();
				if (!byLabel.has(key)) byLabel.set(key, item);
			};

			for (const keyword of SQL_KEYWORDS) {
				add({
					label: keyword,
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: keyword,
					sortText: `${keywordPriority}${keyword}`,
					range,
				});
			}
			for (const fn of SQL_FUNCTIONS) {
				add({
					label: fn,
					kind: monaco.languages.CompletionItemKind.Function,
					insertText: `${fn}($0)`,
					insertTextRules:
						monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					sortText: `${functionPriority}${fn}`,
					range,
				});
			}
			for (const table of completionSchema) {
				add({
					label: table.name,
					kind: monaco.languages.CompletionItemKind.Struct,
					insertText: table.name,
					sortText: `${tablePriority}${table.name}`,
					range,
				});
				const fromStatementTable = statementTables.includes(
					table.name.toLowerCase(),
				);
				const columnPriority = columnsFirst
					? fromStatementTable
						? 0
						: 3
					: tablesFirst
						? 5
						: 3;
				for (const column of table.columns) {
					add({
						label: column.name,
						detail: `${table.name} · ${column.typeName}`,
						kind: monaco.languages.CompletionItemKind.Field,
						insertText: column.name,
						sortText: `${columnPriority}${column.name}`,
						range,
					});
				}
			}

			return { suggestions: [...byLabel.values()] };
		},
	});
}

type RunMode = "current" | "sequence" | "transaction" | "explain";

export function SqliteQuery({ path }: { path: string }) {
	const table = useTableState();
	const isDark = useAppStore(selectIsDark);
	const [sql, setSql] = useState("");
	const [page, setPage] = useState<Page>();
	const [error, setError] = useState<string>();
	const [running, setRunning] = useState(false);
	const [cursor, setCursor] = useState({ line: 1, column: 1, offset: 0 });
	const cursorRef = useRef(cursor);
	cursorRef.current = cursor;
	const runRef = useRef<(mode: RunMode) => void>(() => {});

	useEffect(() => {
		let canceled = false;
		invoke<SchemaTable[]>("sqlite_schema", { path }).then(
			(schema) => {
				if (!canceled) completionSchema = schema;
			},
			() => {},
		);
		return () => {
			canceled = true;
		};
	}, [path]);

	async function run(mode: RunMode) {
		if (running) return;
		const statements = splitSqlStatements(sql);
		if (!statements.length) {
			setError("Write a SQL statement first.");
			return;
		}
		const selected =
			mode === "current" || mode === "explain"
				? [
						statementAtCursor(statements, cursorRef.current.offset) ??
							statements[0],
					]
				: statements;
		setPage(undefined);
		setError(undefined);
		setRunning(true);
		table.setSorting([]);
		table.setColumnSizing({});
		table.setSelectedCell(null);
		try {
			setPage(
				await invoke<Page>("sqlite_exec", {
					path,
					statements: selected.map((statement) => statement.text),
					transaction: mode === "transaction",
					explain: mode === "explain",
				}),
			);
		} catch (error) {
			setError(String(error));
		} finally {
			setRunning(false);
		}
	}
	runRef.current = (mode) => void run(mode);

	return (
		<section className="flex h-full min-h-0 flex-col" aria-label="SQLite query">
			<div className="h-[45%] min-h-36 shrink-0 border-b border-border/60">
				<Editor
					height="100%"
					language="sql"
					theme={isDark ? "viewer-dark" : "viewer-light"}
					value={sql}
					onChange={(value) => setSql(value ?? "")}
					onMount={(editor, monaco) => {
						registerSqlCompletion(monaco);
						editor.addCommand(
							monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
							() => runRef.current("current"),
						);
						editor.addCommand(
							monaco.KeyMod.Shift |
								monaco.KeyMod.CtrlCmd |
								monaco.KeyCode.Enter,
							() => runRef.current("sequence"),
						);
						editor.onDidChangeCursorPosition((event) => {
							const offset =
								editor.getModel()?.getOffsetAt(event.position) ?? 0;
							setCursor({
								line: event.position.lineNumber,
								column: event.position.column,
								offset,
							});
						});
					}}
					options={{
						minimap: { enabled: false },
						lineNumbers: "on",
						wordWrap: "on",
						scrollBeyondLastLine: false,
						fontSize: 12,
						padding: { top: 8, bottom: 8 },
						renderLineHighlight: "line",
						quickSuggestions: { other: true, comments: false, strings: false },
						suggestOnTriggerCharacters: true,
						tabSize: 2,
					}}
				/>
			</div>
			<div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-2 py-1 text-xs text-muted-foreground">
				<span className="tabular-nums">
					Ln {cursor.line} Col {cursor.column}
				</span>
				<div className="ms-auto flex items-center">
					<Button
						size="sm"
						disabled={running || !sql.trim()}
						onClick={() => void run("current")}
						className="rounded-e-none"
					>
						<IconPlayerPlay />
						{running ? "Running…" : "Run"}
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									size="sm"
									disabled={running || !sql.trim()}
									aria-label="Run options"
									className="rounded-s-none border-l border-primary-foreground/25 px-1.5"
								/>
							}
						>
							<IconChevronDown />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-80">
							{[
								{
									mode: "current" as const,
									label: "Run current statement",
									description: "Execute the statement at cursor",
									keys: ["⌘", "↵"],
								},
								{
									mode: "sequence" as const,
									label: "Run all in sequence",
									description: "Run in order, stop on first failure",
									keys: ["⇧", "⌘", "↵"],
								},
								{
									mode: "transaction" as const,
									label: "Run all in transaction",
									description: "If one fails, all fail",
									keys: [],
								},
								{
									mode: "explain" as const,
									label: "Explain current statement",
									description: "Show the query plan",
									keys: [],
								},
							].map(({ mode, label, description, keys }) => (
								<DropdownMenuItem
									key={mode}
									onClick={() => void run(mode)}
									className="items-start"
								>
									<span className="flex min-w-0 flex-col">
										<span>{label}</span>
										<span className="text-muted-foreground">{description}</span>
									</span>
									{keys.length > 0 && (
										<DropdownMenuShortcut>
											{keys.join(" + ")}
										</DropdownMenuShortcut>
									)}
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			{error && (
				<p role="alert" className="m-2 break-words text-destructive">
					{error}
				</p>
			)}
			<div className="sql-result-surface min-h-0 flex-1 overflow-hidden">
				{page ? (
					<div className="flex h-full min-h-0 flex-col">
						<div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-2 py-1 text-xs text-muted-foreground">
							<span>Query Time: {formatQueryTime(page)}</span>
							<span>Rows Read: {page.rows.length}</span>
							{page.hasMore && (
								<span>Showing the first {page.rows.length} rows</span>
							)}
						</div>
						<div className="min-h-0 flex-1">
							<SqliteGrid page={page} state={table} />
						</div>
					</div>
				) : (
					!error && (
						<p className="p-3 text-xs text-muted-foreground">
							Run a statement to see results.
						</p>
					)
				)}
			</div>
		</section>
	);
}
