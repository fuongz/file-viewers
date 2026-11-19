import {
	IconChevronLeft,
	IconChevronRight,
	IconCopy,
} from "@tabler/icons-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { formatBytes } from "@/lib/utils";
import { parseJsonLines } from "../utils/parseJsonLines";
import {
	Button,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

// ── Stat helpers ─────────────────────────────────────────────────────────────

function countNodes(data: unknown): number {
	if (data === null || typeof data !== "object") return 1;
	const vals = Array.isArray(data)
		? (data as unknown[])
		: Object.values(data as Record<string, unknown>);
	return 1 + vals.reduce((s: number, v) => s + countNodes(v), 0);
}

function getMaxDepth(data: unknown, d = 0): number {
	if (data === null || typeof data !== "object") return d;
	const vals = Array.isArray(data)
		? (data as unknown[])
		: Object.values(data as Record<string, unknown>);
	return vals.reduce<number>(
		(max, value) => Math.max(max, getMaxDepth(value, d + 1)),
		d,
	);
}

function buildPath(parent: string, key: string | number): string {
	if (typeof key === "number") return `${parent}[${key}]`;
	if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key))
		return parent ? `${parent}.${key}` : key;
	return parent ? `${parent}["${key}"]` : `["${key}"]`;
}

// ── Expand state ─────────────────────────────────────────────────────────────

type ExpandDepth = number | "all";

function nodeIsExpanded(
	path: string,
	depth: number,
	expandDepth: ExpandDepth,
	toggled: Set<string>,
): boolean {
	const def = expandDepth === "all" || depth < (expandDepth as number);
	return toggled.has(path) ? !def : def;
}

// ── Row context menu wrapper ──────────────────────────────────────────────────

async function copyText(text: string) {
	try {
		await navigator.clipboard.writeText(text);
	} catch {}
}

function RowContextMenu({
	data,
	path,
	children,
}: {
	data: unknown;
	path: string;
	children: React.ReactNode;
}) {
	const isObj = data !== null && typeof data === "object";

	return (
		<ContextMenu>
			<ContextMenuTrigger render={<span style={{ display: "contents" }} />}>
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent>
				{isObj && (
					<ContextMenuItem
						onClick={() => copyText(JSON.stringify(data, null, 2))}
					>
						<IconCopy size={13} />
						Copy value (pretty)
					</ContextMenuItem>
				)}
				<ContextMenuItem
					onClick={() => copyText(isObj ? JSON.stringify(data) : String(data))}
				>
					<IconCopy size={13} />
					{isObj ? "Copy value (compact)" : "Copy value"}
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={() => copyText(path)}>
					<IconCopy size={13} />
					Copy path
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}

// ── JsonValue ─────────────────────────────────────────────────────────────────

function JsonValue({ value }: { value: unknown }) {
	if (value === null) return <span className="json-null">null</span>;
	if (typeof value === "boolean")
		return <span className="json-boolean">{String(value)}</span>;
	if (typeof value === "number")
		return <span className="json-number">{value}</span>;
	if (typeof value === "string")
		return <span className="json-string">"{value}"</span>;
	return <span>{String(value)}</span>;
}

// ── JsonNodeView ──────────────────────────────────────────────────────────────

interface NodeProps {
	data: unknown;
	keyName: string | number | null;
	path: string;
	depth: number;
	expandDepth: ExpandDepth;
	toggled: Set<string>;
	onToggle: (path: string) => void;
	onSelect: (path: string) => void;
	selectedPath: string | null;
	isLast: boolean;
}

function JsonNodeView({
	data,
	keyName,
	path,
	depth,
	expandDepth,
	toggled,
	onToggle,
	onSelect,
	selectedPath,
	isLast,
}: NodeProps) {
	const isSelected = selectedPath === path;
	const isObj = data !== null && typeof data === "object";

	const handleSelect = (e: React.MouseEvent) => {
		e.stopPropagation();
		onSelect(path);
	};

	const handleToggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		onToggle(path);
	};

	const keyLabel =
		keyName !== null ? (
			<>
				<span className="json-key">
					{typeof keyName === "number" ? keyName : `"${keyName}"`}
				</span>
				<span className="json-colon">: </span>
			</>
		) : null;

	// ── Leaf value ──
	if (!isObj) {
		return (
			<RowContextMenu data={data} path={path}>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: tree row selection */}
				<div
					className={`json-row${isSelected ? " json-row-selected" : ""}`}
					onClick={handleSelect}
				>
					{keyLabel}
					<JsonValue value={data} />
					{!isLast && <span className="json-comma">,</span>}
				</div>
			</RowContextMenu>
		);
	}

	const isArray = Array.isArray(data);
	const entries: [string | number, unknown][] = isArray
		? (data as unknown[]).map((v, i) => [i, v])
		: Object.entries(data as Record<string, unknown>);
	const count = entries.length;
	const open = isArray ? "[" : "{";
	const close = isArray ? "]" : "}";

	// ── Empty object / array ──
	if (count === 0) {
		return (
			<RowContextMenu data={data} path={path}>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: tree row selection */}
				<div
					className={`json-row${isSelected ? " json-row-selected" : ""}`}
					onClick={handleSelect}
				>
					{keyLabel}
					<span className="json-brace">
						{open}
						{close}
					</span>
					{!isLast && <span className="json-comma">,</span>}
				</div>
			</RowContextMenu>
		);
	}

	const expanded = nodeIsExpanded(path, depth, expandDepth, toggled);
	const typeLabel = isArray ? `${count} items` : `${count} keys`;

	// ── Collapsed ──
	if (!expanded) {
		return (
			<RowContextMenu data={data} path={path}>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: tree row selection */}
				<div
					className={`json-row json-row-collapsible${isSelected ? " json-row-selected" : ""}`}
					onClick={handleSelect}
				>
					<button type="button" className="json-toggle" onClick={handleToggle}>
						▶
					</button>
					{keyLabel}
					<span className="json-brace">{open}</span>
					<span className="json-count"> {typeLabel} </span>
					<button
						type="button"
						className="json-children-badge"
						aria-expanded={expanded}
						onClick={handleToggle}
					>
						§ children
					</button>
					<span className="json-brace">{close}</span>
					{!isLast && <span className="json-comma">,</span>}
				</div>
			</RowContextMenu>
		);
	}

	// ── Expanded ──
	return (
		<>
			<RowContextMenu data={data} path={path}>
				{/** biome-ignore lint/a11y/noStaticElementInteractions: tree row selection */}
				<div
					className={`json-row json-row-collapsible${isSelected ? " json-row-selected" : ""}`}
					onClick={handleSelect}
				>
					<button type="button" className="json-toggle" onClick={handleToggle}>
						▼
					</button>
					{keyLabel}
					<span className="json-brace">{open}</span>
					<span className="json-count"> {typeLabel} </span>
					<button
						type="button"
						className="json-children-badge"
						aria-expanded={expanded}
						onClick={handleToggle}
					>
						§ children
					</button>
				</div>
			</RowContextMenu>

			<div className="json-children-wrap">
				{entries.map(([k, v], idx) => (
					<JsonNodeView
						key={String(k)}
						data={v}
						keyName={k}
						path={buildPath(path, k)}
						depth={depth + 1}
						expandDepth={expandDepth}
						toggled={toggled}
						onToggle={onToggle}
						onSelect={onSelect}
						selectedPath={selectedPath}
						isLast={idx === entries.length - 1}
					/>
				))}
			</div>

			<div className="json-row">
				<span className="json-brace">{close}</span>
				{!isLast && <span className="json-comma">,</span>}
			</div>
		</>
	);
}

// ── JsonPreview ───────────────────────────────────────────────────────────────

const LARGE_JSON_THRESHOLD = 3 * 1024 * 1024;
const RECORDS_PER_PAGE = 100;

interface JsonPreviewProps {
	content: string;
	format: "json" | "jsonl";
}

export function JsonPreview({ content, format }: JsonPreviewProps) {
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [expandDepth, setExpandDepth] = useState<ExpandDepth>(2);
	const [toggled, setToggled] = useState<Set<string>>(new Set());
	const [viewMode, setViewMode] = useState<"auto" | "raw">("auto");
	const [page, setPage] = useState(0);

	const contentSize = content.length;
	const isLargeFile = contentSize > LARGE_JSON_THRESHOLD;
	const isJsonLines = format === "jsonl";
	const formatLabel = isJsonLines ? "JSONL" : "JSON";

	const { parsed, parseError } = useMemo<{
		parsed: unknown;
		parseError: string | null;
	}>(() => {
		if (!content.trim()) return { parsed: null, parseError: null };
		if (isLargeFile) return { parsed: null, parseError: null };
		try {
			return {
				parsed: isJsonLines ? parseJsonLines(content) : JSON.parse(content),
				parseError: null,
			};
		} catch (e) {
			return { parsed: null, parseError: (e as Error).message };
		}
	}, [content, isJsonLines, isLargeFile]);

	const { nodeCount, maxDepth } = useMemo(() => {
		if (parsed == null) return { nodeCount: 0, maxDepth: 0 };
		return {
			nodeCount: isJsonLines ? 0 : countNodes(parsed),
			maxDepth: getMaxDepth(parsed) - Number(isJsonLines),
		};
	}, [parsed, isJsonLines]);

	const records = isJsonLines && Array.isArray(parsed) ? parsed : null;
	const pageCount = Math.ceil((records?.length ?? 0) / RECORDS_PER_PAGE);
	const currentPage = Math.min(page, Math.max(pageCount - 1, 0));
	const pageStart = currentPage * RECORDS_PER_PAGE;

	const handleToggle = useCallback((path: string) => {
		setToggled((prev) => {
			const next = new Set(prev);
			next.has(path) ? next.delete(path) : next.add(path);
			return next;
		});
	}, []);

	function changeDepth(d: ExpandDepth) {
		setExpandDepth(d);
		setToggled(new Set());
	}

	function changePage(nextPage: number) {
		setPage(nextPage);
		setSelectedPath(null);
	}

	if (!content.trim()) {
		return (
			<div className="preview-empty">
				<p>Start typing {formatLabel} in the editor...</p>
			</div>
		);
	}

	if (isLargeFile) {
		return (
			<div className="json-error">
				<div className="json-error-badge">Large File</div>
				<div className="json-error-message">
					<p>
						This {formatLabel} file is{" "}
						<strong>{formatBytes(contentSize)}</strong> and cannot be previewed.
						Use the Monaco editor to view and edit.
					</p>
				</div>
			</div>
		);
	}

	if (parseError) {
		return (
			<div className="json-error">
				<div className="json-error-badge">Invalid {formatLabel}</div>
				<pre className="json-error-message">{parseError}</pre>
			</div>
		);
	}

	const treeProps = {
		depth: 0,
		expandDepth,
		toggled,
		onToggle: handleToggle,
		onSelect: setSelectedPath,
		selectedPath,
		isLast: true,
	};
	const deepestLevel = Math.max(maxDepth, 1);
	const depthItems = [
		...Array.from({ length: deepestLevel }, (_, index) => ({
			label: `Depth ${index + 1}`,
			value: String(index + 1),
		})),
		{ label: "All", value: "all" },
	];
	const selectedDepth =
		expandDepth === "all"
			? expandDepth
			: String(Math.min(expandDepth, deepestLevel));

	return (
		<Tabs
			className="json-preview gap-0"
			value={viewMode}
			onValueChange={(mode) => {
				if (mode === "auto" || mode === "raw") setViewMode(mode);
			}}
		>
			{/* ── Status bar ── */}
			<div className="flex shrink-0 items-center justify-between gap-2 px-2 py-1 text-xs">
				<span className="json-statusbar-left">
					{records
						? `${records.length} ${records.length === 1 ? "record" : "records"}`
						: `${nodeCount} nodes`}
				</span>
				<span className="min-w-0">
					{selectedPath && (
						<span className="json-path-chip">{selectedPath}</span>
					)}
				</span>
				<div className="flex shrink-0 items-center gap-1">
					{/* Depth select */}
					<Select
						items={depthItems}
						value={selectedDepth}
						onValueChange={(v) => changeDepth(v === "all" ? "all" : Number(v))}
					>
						<SelectTrigger
							size="xs"
							className="border-0 bg-secondary text-xs"
							aria-label="Expansion depth"
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent side="bottom" align="end">
							{depthItems.map(({ label, value }) => (
								<SelectItem className="text-xs" key={value} value={value}>
									{label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					<TabsList
						aria-label="JSON view"
						className="group-data-horizontal/tabs:h-6"
					>
						<TabsTrigger value="auto">Auto</TabsTrigger>
						<TabsTrigger value="raw">Raw</TabsTrigger>
					</TabsList>
				</div>
			</div>

			{/* ── Tree / Raw area ── */}
			<TabsContent value="raw" className="json-tree-area">
				<pre className="json-raw">
					{isJsonLines ? content : JSON.stringify(parsed, null, 2)}
				</pre>
			</TabsContent>
			<TabsContent value="auto" className="json-tree-area" key={currentPage}>
				<div className="json-tree">
					{records ? (
						records
							.slice(pageStart, pageStart + RECORDS_PER_PAGE)
							.map((record, offset) => {
								const index = pageStart + offset;
								return (
									<JsonNodeView
										{...treeProps}
										key={index}
										data={record}
										keyName={index}
										path={buildPath("data", index)}
									/>
								);
							})
					) : (
						<JsonNodeView
							{...treeProps}
							data={parsed}
							keyName={null}
							path="data"
						/>
					)}
				</div>
			</TabsContent>
			{viewMode === "auto" && pageCount > 1 && (
				<div className="flex items-center justify-end gap-2 px-2 py-1 text-xs">
					<Button
						variant="ghost"
						size="xs"
						aria-label="Previous page"
						disabled={currentPage === 0}
						onClick={() => changePage(currentPage - 1)}
					>
						<IconChevronLeft />
					</Button>
					<span>
						Page {currentPage + 1} of {pageCount}
					</span>
					<Button
						variant="ghost"
						size="xs"
						aria-label="Next page"
						disabled={currentPage + 1 === pageCount}
						onClick={() => changePage(currentPage + 1)}
					>
						<IconChevronRight />
					</Button>
				</div>
			)}
		</Tabs>
	);
}
