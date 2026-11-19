import {
	IconCode,
	IconDatabase,
	IconEye,
	IconPlus,
	IconRefresh,
	IconSchema,
	IconSearch,
	IconTable,
	IconX,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { SqliteQuery, SqliteRows } from "./SqliteData";
import { SqliteSchemaDiagram } from "./SqliteSchemaDiagram";
import { Button } from "./ui/button";
import { ButtonGroup } from "./ui/button-group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "./ui/resizeable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

interface Relation {
	name: string;
	kind: "table" | "view";
}

type LoadResult<T> =
	| { status: "loading" }
	| { status: "ready"; data: T }
	| { status: "error"; message: string };

const QUERY_TAB = "query";
const SCHEMA_TAB = "schema";
function tableTab(name: string) {
	return `table:${name}`;
}
function queryTab(id: number) {
	return id === 0 ? QUERY_TAB : `query:${id}`;
}

const tabTriggerClass =
	"h-full flex-none justify-start gap-2 rounded-none border-0 px-3 text-xs font-medium text-muted-foreground after:hidden hover:text-foreground data-active:bg-transparent data-active:text-foreground dark:data-active:bg-transparent dark:data-active:text-foreground";

function tabShellClass(active: boolean) {
	return cn(
		"flex items-stretch border-r border-border last:border-r-0",
		active
			? "-mb-px border-b border-b-background bg-background"
			: "hover:bg-muted/40",
	);
}

function TabCloseButton({
	label,
	onClick,
}: {
	label: string;
	onClick: () => void;
}) {
	return (
		<Button
			type="button"
			tabIndex={-1}
			size="icon-xs"
			variant="ghost"
			aria-label={label}
			onClick={onClick}
			className="my-auto -ml-1 me-1 shrink-0 text-muted-foreground hover:text-foreground focus-visible:ring-0"
		>
			<IconX aria-hidden="true" />
		</Button>
	);
}

export function SqlitePreview({
	path,
	externalRevision = 0,
}: {
	path?: string;
	externalRevision?: number;
}) {
	const [filter, setFilter] = useState("");
	const [selected, setSelected] = useState<string>();
	const [schemaOpen, setSchemaOpen] = useState(false);
	const [queries, setQueries] = useState<number[]>([0]);
	const nextQueryId = useRef(1);
	const [tabs, setTabs] = useState<Relation[] | null>(null);
	const tabsList = useRef<HTMLDivElement>(null);
	const [revision, setRevision] = useState(0);
	const [result, setResult] = useState<LoadResult<Relation[]>>({
		status: "loading",
	});

	useEffect(() => {
		if (!path) return;
		let canceled = false;
		invoke<Relation[]>("sqlite_relations", { path }).then(
			(data) => {
				if (!canceled) {
					setTabs((current) => current ?? data.slice(0, 1));
					setResult({ status: "ready", data });
				}
			},
			(error) => {
				if (!canceled) setResult({ status: "error", message: String(error) });
			},
		);
		return () => {
			canceled = true;
		};
	}, [path, revision, externalRevision]);

	const relations = result.status === "ready" ? result.data : [];
	const openTabs = tabs ?? [];
	const active =
		selected ??
		(openTabs[0] ? tableTab(openTabs[0].name) : queryTab(queries[0] ?? 0));

	function openQuery() {
		const id = nextQueryId.current++;
		setQueries((current) => [...current, id]);
		setSelected(queryTab(id));
	}

	function toggleSchema() {
		if (schemaOpen) {
			closeSchema();
		} else {
			setSchemaOpen(true);
			setSelected(SCHEMA_TAB);
		}
	}

	function closeSchema() {
		setSchemaOpen(false);
		if (active === SCHEMA_TAB) {
			setSelected(
				openTabs[0] ? tableTab(openTabs[0].name) : queryTab(queries[0] ?? 0),
			);
		}
	}

	function closeQuery(id: number) {
		const index = queries.indexOf(id);
		if (index === -1 || queries.length <= 1) return;
		const remaining = queries.filter((query) => query !== id);
		setQueries(remaining);
		if (active === queryTab(id)) {
			const next = remaining[Math.min(index, remaining.length - 1)];
			setSelected(
				next !== undefined
					? queryTab(next)
					: openTabs[0]
						? tableTab(openTabs[0].name)
						: QUERY_TAB,
			);
		}
	}

	function openTable(relation: Relation) {
		setTabs((current) =>
			current?.some(({ name }) => name === relation.name)
				? current
				: [...(current ?? []), relation],
		);
		setSelected(tableTab(relation.name));
	}

	function closeTable(name: string) {
		const index = openTabs.findIndex((tab) => tab.name === name);
		const remaining = openTabs.filter((tab) => tab.name !== name);
		setTabs(remaining);
		if (active === tableTab(name)) {
			const next = remaining[index] ?? remaining[index - 1];
			setSelected(next ? tableTab(next.name) : queryTab(queries[0] ?? 0));
			requestAnimationFrame(() =>
				tabsList.current
					?.querySelector<HTMLElement>('[aria-selected="true"]')
					?.focus(),
			);
		}
	}
	const query = filter.trim().toLowerCase();
	const matches = relations.filter(({ name }) =>
		name.toLowerCase().includes(query),
	);

	return (
		<ResizablePanelGroup
			orientation="horizontal"
			className="h-full min-h-0 gap-0 overflow-hidden bg-background"
		>
			<ResizablePanel defaultSize="24%" minSize="180px" maxSize="45%">
				<aside
					aria-label="SQLite tables and views"
					className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-muted/20"
				>
					<div className="flex shrink-0 flex-col gap-2 border-b border-border p-2">
						<InputGroup className="h-8 bg-background/60">
							<InputGroupInput
								type="search"
								aria-label="Search tables and views"
								placeholder="Search…"
								value={filter}
								onChange={(event) => setFilter(event.currentTarget.value)}
								className="text-xs"
							/>
							<InputGroupAddon aria-hidden="true">
								<IconSearch />
							</InputGroupAddon>
						</InputGroup>
						<div className="flex flex-wrap items-center gap-1.5">
							<ButtonGroup>
								<Button
									type="button"
									variant="outline"
									size="sm"
									aria-label="Schema diagram"
									aria-pressed={schemaOpen}
									onClick={toggleSchema}
									className="h-6 gap-1 px-1.5 text-xs aria-pressed:bg-primary/12 [&_svg]:size-3"
								>
									<IconSchema
										aria-hidden="true"
										className="dark:text-foreground"
									/>
									Schema
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									aria-label="Refresh database"
									disabled={result.status === "loading"}
									onClick={() => {
										setRevision((value) => value + 1);
									}}
									className="h-6 gap-1 px-1.5 text-xs [&_svg]:size-3"
								>
									<IconRefresh aria-hidden="true" />
									Refresh
								</Button>
							</ButtonGroup>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={openQuery}
								className="ms-auto h-6 gap-1 px-1.5 text-xs [&_svg]:size-3"
							>
								<IconPlus aria-hidden="true" />
								New
							</Button>
						</div>
					</div>
					<ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-1.5">
						{matches.map(({ name, kind }) => {
							const Icon = kind === "view" ? IconEye : IconTable;
							return (
								<li key={name}>
									<Button
										type="button"
										variant="ghost"
										aria-pressed={active === tableTab(name)}
										title={name}
										onClick={() => openTable({ name, kind })}
										className="h-8 w-full justify-start gap-2 px-2 text-xs aria-pressed:bg-primary/12"
									>
										<Icon
											aria-hidden="true"
											className="text-muted-foreground"
										/>
										<span className="truncate">{name}</span>
									</Button>
								</li>
							);
						})}
						{relations.length > 0 && !matches.length && (
							<li className="px-2 py-1 text-xs text-muted-foreground">
								No matches
							</li>
						)}
					</ul>
				</aside>
			</ResizablePanel>
			<ResizableHandle
				withHandle
				aria-label="Resize tables and data panels"
				className="w-3 shrink-0 bg-transparent"
			/>
			<ResizablePanel minSize="50%">
				<div className="h-full min-h-0 overflow-hidden rounded-lg border border-border bg-background">
					<Tabs
						value={active}
						onValueChange={(value) => setSelected(String(value))}
						className="h-full min-h-0 min-w-0 flex-col gap-0 bg-background"
					>
						<div className="flex shrink-0 items-stretch border-b border-border bg-muted/30">
							<TabsList
								ref={tabsList}
								aria-label="SQLite tabs"
								className="flex h-9 flex-1 items-stretch justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0"
							>
								{queries.map((id) => {
									const isActive = active === queryTab(id);
									return (
										<div
											key={id}
											role="presentation"
											className={tabShellClass(isActive)}
										>
											<TabsTrigger
												value={queryTab(id)}
												className={tabTriggerClass}
											>
												<IconCode aria-hidden="true" />
												Query{id === 0 ? "" : ` ${id + 1}`}
											</TabsTrigger>
											{isActive && queries.length > 1 && (
												<TabCloseButton
													label="Close query tab"
													onClick={() => closeQuery(id)}
												/>
											)}
										</div>
									);
								})}
								{openTabs.map(({ name, kind }) => {
									const Icon = kind === "view" ? IconEye : IconTable;
									const isActive = active === tableTab(name);
									return (
										<div
											key={name}
											role="presentation"
											className={tabShellClass(isActive)}
										>
											<TabsTrigger
												value={tableTab(name)}
												title={name}
												className={tabTriggerClass}
												onKeyDown={(event) => {
													if (event.key === "Delete") {
														event.preventDefault();
														closeTable(name);
													}
												}}
											>
												<Icon aria-hidden="true" />
												<span className="max-w-40 truncate">{name}</span>
											</TabsTrigger>
											{isActive && (
												<TabCloseButton
													label={`Close ${name} tab`}
													onClick={() => closeTable(name)}
												/>
											)}
										</div>
									);
								})}
								{schemaOpen && (
									<div
										role="presentation"
										className={tabShellClass(active === SCHEMA_TAB)}
									>
										<TabsTrigger value={SCHEMA_TAB} className={tabTriggerClass}>
											<IconSchema
												aria-hidden="true"
												className="dark:text-foreground"
											/>
											Schema Diagram
										</TabsTrigger>
										{active === SCHEMA_TAB && (
											<TabCloseButton
												label="Close schema diagram"
												onClick={closeSchema}
											/>
										)}
									</div>
								)}
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label="New query tab"
									onClick={openQuery}
									className="my-auto ms-1 me-1 shrink-0 text-muted-foreground hover:text-foreground"
								>
									<IconPlus aria-hidden="true" />
								</Button>
							</TabsList>
						</div>
						{path && result.status === "ready" ? (
							queries.map((id) => (
								<TabsContent
									key={id}
									value={queryTab(id)}
									hidden={active !== queryTab(id)}
									keepMounted
									className="min-h-0"
								>
									<SqliteQuery path={path} />
								</TabsContent>
							))
						) : (
							<TabsContent
								value={QUERY_TAB}
								hidden={active !== QUERY_TAB}
								keepMounted
								className="min-h-0"
							>
								<div className="flex h-full flex-col items-center justify-center gap-2 p-5 text-center text-muted-foreground">
									<IconDatabase className="size-6" aria-hidden="true" />
									{!path ? (
										<p>Select a SQLite file to preview it.</p>
									) : result.status === "error" ? (
										<div role="alert">
											<p className="font-medium text-foreground">
												Could not open the SQLite database.
											</p>
											<p className="mt-1 text-xs">{result.message}</p>
										</div>
									) : (
										<p role="status">Reading database…</p>
									)}
								</div>
							</TabsContent>
						)}
						{schemaOpen && path && (
							<TabsContent
								value={SCHEMA_TAB}
								hidden={active !== SCHEMA_TAB}
								keepMounted
								className="min-h-0"
							>
								<SqliteSchemaDiagram
									path={path}
									revision={revision + externalRevision}
								/>
							</TabsContent>
						)}
						{path &&
							openTabs.map(({ name }) => (
								<TabsContent
									key={name}
									value={tableTab(name)}
									hidden={active !== tableTab(name)}
									keepMounted
									className="min-h-0"
								>
									<SqliteRows
										path={path}
										name={name}
										revision={revision + externalRevision}
										onChange={() => setRevision((value) => value + 1)}
									/>
								</TabsContent>
							))}
					</Tabs>
				</div>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
