import { IconCheck, IconCopy } from "@tabler/icons-react";
import type React from "react";
import { useCallback, useMemo, useState } from "react";

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
	if (vals.length === 0) return d;
	return Math.max(...vals.map((v) => getMaxDepth(v, d + 1)));
}

function buildPath(parent: string, key: string | number): string {
	if (typeof key === "number") return `${parent}[${key}]`;
	if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key))
		return parent ? `${parent}.${key}` : key;
	return parent ? `${parent}["${key}"]` : `["${key}"]`;
}

// ── Expand state ─────────────────────────────────────────────────────────────

type ExpandDepth = 1 | 2 | 3 | 4 | "all";

function nodeIsExpanded(
	path: string,
	depth: number,
	expandDepth: ExpandDepth,
	toggled: Set<string>,
): boolean {
	const def = expandDepth === "all" || depth < (expandDepth as number);
	return toggled.has(path) ? !def : def;
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

	// ── Leaf value ──
	if (!isObj) {
		return (
			// biome-ignore lint/a11y/useKeyWithClickEvents: tree row selection
			// biome-ignore lint/a11y/noStaticElementInteractions: tree row selection
			<div
				className={`json-row${isSelected ? " json-row-selected" : ""}`}
				onClick={handleSelect}
			>
				{keyName !== null && (
					<>
						<span className="json-key">
							{typeof keyName === "number" ? keyName : `"${keyName}"`}
						</span>
						<span className="json-colon">: </span>
					</>
				)}
				<JsonValue value={data} />
				{!isLast && <span className="json-comma">,</span>}
			</div>
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
			// biome-ignore lint/a11y/useKeyWithClickEvents: tree row selection
			// biome-ignore lint/a11y/noStaticElementInteractions: tree row selection
			<div
				className={`json-row${isSelected ? " json-row-selected" : ""}`}
				onClick={handleSelect}
			>
				{keyName !== null && (
					<>
						<span className="json-key">
							{typeof keyName === "number" ? keyName : `"${keyName}"`}
						</span>
						<span className="json-colon">: </span>
					</>
				)}
				<span className="json-brace">
					{open}
					{close}
				</span>
				{!isLast && <span className="json-comma">,</span>}
			</div>
		);
	}

	const expanded = nodeIsExpanded(path, depth, expandDepth, toggled);
	const typeLabel = isArray ? `${count} items` : `${count} keys`;

	// ── Collapsed ──
	if (!expanded) {
		return (
			// biome-ignore lint/a11y/useKeyWithClickEvents: tree row selection
			// biome-ignore lint/a11y/noStaticElementInteractions: tree row selection
			<div
				className={`json-row json-row-collapsible${isSelected ? " json-row-selected" : ""}`}
				onClick={handleSelect}
			>
				<button type="button" className="json-toggle" onClick={handleToggle}>
					▶
				</button>
				{keyName !== null && (
					<>
						<span className="json-key">
							{typeof keyName === "number" ? keyName : `"${keyName}"`}
						</span>
						<span className="json-colon">: </span>
					</>
				)}
				<span className="json-brace">{open}</span>
				<span className="json-count"> {typeLabel} </span>
				<button
					type="button"
					className="json-children-badge"
					onClick={handleToggle}
				>
					§ children
				</button>
				<span className="json-brace">{close}</span>
				{!isLast && <span className="json-comma">,</span>}
			</div>
		);
	}

	// ── Expanded ──
	return (
		<>
			{/** biome-ignore lint/a11y/useKeyWithClickEvents: tree row selection */}
			{/** biome-ignore lint/a11y/noStaticElementInteractions: tree row selection */}
			<div
				className={`json-row json-row-collapsible${isSelected ? " json-row-selected" : ""}`}
				onClick={handleSelect}
			>
				<button type="button" className="json-toggle" onClick={handleToggle}>
					▼
				</button>
				{keyName !== null && (
					<>
						<span className="json-key">
							{typeof keyName === "number" ? keyName : `"${keyName}"`}
						</span>
						<span className="json-colon">: </span>
					</>
				)}
				<span className="json-brace">{open}</span>
				<span className="json-count"> {typeLabel} </span>
				<button
					type="button"
					className="json-children-badge"
					onClick={handleToggle}
				>
					§ children
				</button>
			</div>

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

interface JsonPreviewProps {
	content: string;
	isDark: boolean;
}

const DEPTH_OPTIONS: ExpandDepth[] = [1, 2, 3, 4, "all"];

export function JsonPreview({ content }: JsonPreviewProps) {
	const [selectedPath, setSelectedPath] = useState<string | null>(null);
	const [expandDepth, setExpandDepth] = useState<ExpandDepth>("all");
	const [toggled, setToggled] = useState<Set<string>>(new Set());
	const [viewMode, setViewMode] = useState<"auto" | "raw">("auto");
	const [copied, setCopied] = useState<"path" | "json" | null>(null);

	const { parsed, parseError } = useMemo(() => {
		if (!content.trim()) return { parsed: null, parseError: null };
		try {
			return { parsed: JSON.parse(content), parseError: null };
		} catch (e) {
			return { parsed: null, parseError: (e as Error).message };
		}
	}, [content]);

	const { nodeCount, maxDepth } = useMemo(() => {
		if (parsed == null) return { nodeCount: 0, maxDepth: 0 };
		return { nodeCount: countNodes(parsed), maxDepth: getMaxDepth(parsed) };
	}, [parsed]);

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

	async function copyToClipboard(text: string, type: "path" | "json") {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(type);
			setTimeout(() => setCopied(null), 1500);
		} catch {}
	}

	if (!content.trim()) {
		return (
			<div className="preview-empty">
				<p>Start typing JSON in the editor...</p>
			</div>
		);
	}

	if (parseError) {
		return (
			<div className="json-error">
				<div className="json-error-badge">Invalid JSON</div>
				<pre className="json-error-message">{parseError}</pre>
			</div>
		);
	}

	return (
		<div className="json-preview">
			{/* ── Tree / Raw area ── */}
			<div className="json-tree-area">
				{viewMode === "raw" ? (
					<pre className="json-raw">{JSON.stringify(parsed, null, 2)}</pre>
				) : (
					<div className="json-tree">
						<JsonNodeView
							data={parsed}
							keyName={null}
							path="data"
							depth={0}
							expandDepth={expandDepth}
							toggled={toggled}
							onToggle={handleToggle}
							onSelect={setSelectedPath}
							selectedPath={selectedPath}
							isLast={true}
						/>
					</div>
				)}
			</div>

			{/* ── Status bar ── */}
			<div className="json-statusbar">
				<span className="json-statusbar-left">
					{nodeCount} nodes · {maxDepth} levels deep
				</span>

				<span className="json-statusbar-center">
					{selectedPath && (
						<>
							<span className="json-path-chip">{selectedPath}</span>
							<button
								type="button"
								className="json-statusbar-btn"
								onClick={() => copyToClipboard(selectedPath, "path")}
							>
								{copied === "path" ? (
									<IconCheck size={11} />
								) : (
									<IconCopy size={11} />
								)}
								Copy
							</button>
						</>
					)}
				</span>

				<span className="json-statusbar-right">
					{/* Depth buttons */}
					<div className="json-depth-group">
						{DEPTH_OPTIONS.map((d) => (
							<button
								key={d}
								type="button"
								className={`json-depth-btn${expandDepth === d ? " active" : ""}`}
								onClick={() => changeDepth(d)}
							>
								{d === "all" ? "All" : d}
							</button>
						))}
					</div>

					{/* View mode */}
					<div className="json-mode-group">
						<button
							type="button"
							className={`json-mode-btn${viewMode === "auto" ? " active" : ""}`}
							onClick={() => setViewMode("auto")}
						>
							{viewMode === "auto" ? "• Auto" : "Auto"}
						</button>
						<button
							type="button"
							className={`json-mode-btn${viewMode === "raw" ? " active" : ""}`}
							onClick={() => setViewMode("raw")}
						>
							Raw
						</button>
					</div>

					{/* Copy JSON */}
					<button
						type="button"
						className="json-statusbar-btn"
						onClick={() =>
							copyToClipboard(JSON.stringify(parsed, null, 2), "json")
						}
					>
						{copied === "json" ? (
							<IconCheck size={11} />
						) : (
							<IconCopy size={11} />
						)}
						Copy JSON
					</button>
				</span>
			</div>
		</div>
	);
}
