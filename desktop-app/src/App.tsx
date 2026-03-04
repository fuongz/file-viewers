import { Tabs } from "@base-ui/react/tabs";
import {
	IconBraces,
	IconDeviceDesktop,
	IconLayoutSidebarLeftCollapse,
	IconLayoutSidebarLeftExpand,
	IconMarkdown,
	IconMinimize,
	IconMoon,
	IconPlus,
	IconSun,
	IconTable,
	IconTrash,
	IconWand,
	IconX,
} from "@tabler/icons-react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { EditorPanel } from "./components/EditorPanel";
import { type Format, PreviewPanel } from "./components/PreviewPanel";
import "./App.css";
import { Button } from "./components/ui/Button";

type ThemePreference = "system" | "dark" | "light";

interface FileTab {
	id: string;
	name: string;
	format: Format;
	content: string;
	previewContent: string;
	path?: string;
	isDirty?: boolean;
}

const EXT_TO_FORMAT: Record<string, Format> = {
	md: "markdown",
	markdown: "markdown",
	mdx: "mdx",
	json: "json",
	csv: "csv",
};

const FORMAT_LANGUAGE: Record<Format, string> = {
	markdown: "markdown",
	mdx: "markdown",
	json: "json",
	csv: "plaintext",
};

const THEME_LABELS: Record<ThemePreference, string> = {
	system: "System",
	dark: "Dark",
	light: "Light",
};

const THEME_ICONS: Record<ThemePreference, React.ReactNode> = {
	system: <IconDeviceDesktop size={13} stroke={1.5} />,
	dark: <IconMoon size={13} stroke={1.5} />,
	light: <IconSun size={13} stroke={1.5} />,
};

const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];

const STORAGE_SESSION_KEY = "fileviewers.session";
const STORAGE_THEME_KEY = "fileviewers.theme";

interface PersistedTab {
	id: string;
	name: string;
	format: Format;
	path: string;
	content: string;
}

interface PersistedSession {
	version: 1;
	activeTabId: string;
	tabs: PersistedTab[];
}

const FORMAT_ICONS: Record<Format, React.ReactNode> = {
	markdown: <IconMarkdown size={13} stroke={1.5} />,
	mdx: <IconMarkdown size={13} stroke={1.5} />,
	json: <IconBraces size={13} stroke={1.5} />,
	csv: <IconTable size={13} stroke={1.5} />,
};

let _tabCounter = 0;
function createTab(overrides?: Partial<Omit<FileTab, "id">>): FileTab {
	_tabCounter++;
	return {
		id: `tab-${_tabCounter}`,
		name: "New File",
		format: "markdown",
		content: "",
		previewContent: "",
		...overrides,
	};
}

function readStoredTheme(): ThemePreference {
	try {
		const raw = localStorage.getItem(STORAGE_THEME_KEY);
		if (raw === "system" || raw === "dark" || raw === "light") {
			// Apply immediately to avoid flash-of-wrong-theme before first React paint
			const isDark =
				raw === "dark" ||
				(raw === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			document.documentElement.setAttribute(
				"data-theme",
				isDark ? "dark" : "light",
			);
			document.documentElement.classList.toggle("dark", isDark);
			return raw;
		}
	} catch {}
	return "system";
}

function readStoredSession(): {
	tabs: FileTab[];
	activeTabId: string;
} | null {
	try {
		const raw = localStorage.getItem(STORAGE_SESSION_KEY);
		if (!raw) return null;
		const parsed: PersistedSession = JSON.parse(raw);
		if (
			parsed.version !== 1 ||
			!Array.isArray(parsed.tabs) ||
			!parsed.tabs.length
		)
			return null;
		const tabs: FileTab[] = parsed.tabs.map((pt) => ({
			id: pt.id,
			name: pt.name,
			format: pt.format,
			content: pt.path ? "" : pt.content,
			previewContent: pt.path ? "" : pt.content,
			path: pt.path || undefined,
		}));
		return { tabs, activeTabId: parsed.activeTabId ?? tabs[0].id };
	} catch {
		return null;
	}
}

function advanceTabCounter(
	session: ReturnType<typeof readStoredSession>,
): void {
	if (!session) return;
	for (const t of session.tabs) {
		const n = parseInt(t.id.replace("tab-", ""), 10);
		if (!Number.isNaN(n) && n > _tabCounter) _tabCounter = n;
	}
}

function App() {
	const storedSession = readStoredSession();
	advanceTabCounter(storedSession);
	const _initialTabs = storedSession?.tabs ?? [createTab()];

	const [tabs, setTabs] = useState<FileTab[]>(_initialTabs);
	const [activeTabId, setActiveTabId] = useState<string>(
		storedSession?.activeTabId ?? _initialTabs[0].id,
	);
	const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const activeTabIdRef = useRef(activeTabId);
	activeTabIdRef.current = activeTabId;
	const [themePref, setThemePref] = useState<ThemePreference>(readStoredTheme);
	const [systemDark, setSystemDark] = useState(
		() => window.matchMedia("(prefers-color-scheme: dark)").matches,
	);
	const [themeMenuOpen, setThemeMenuOpen] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const [showEditor, setShowEditor] = useState(true);
	const themeMenuRef = useRef<HTMLDivElement>(null);

	// ── Derived active tab ───────────────────────────────────────
	const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
	const { format, content, previewContent } = activeTab;

	const updateActiveTab = useCallback(
		(updates: Partial<Omit<FileTab, "id">>) => {
			setTabs((prev) =>
				prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t)),
			);
		},
		[activeTabId],
	);

	// ── Theme ────────────────────────────────────────────────────
	const isDark = themePref === "dark" || (themePref === "system" && systemDark);

	useEffect(() => {
		document.documentElement.setAttribute(
			"data-theme",
			isDark ? "dark" : "light",
		);
		document.documentElement.classList.toggle("dark", isDark);
	}, [isDark]);

	useEffect(() => {
		if (themePref !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [themePref]);

	// ── Persist session to localStorage ─────────────────────────
	// File-backed tab content is excluded (re-read from disk on restore),
	// so serialization is cheap and doesn't need debouncing.
	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_THEME_KEY, themePref);
		} catch {}
		try {
			const session: PersistedSession = {
				version: 1,
				activeTabId,
				tabs: tabs.map((t) => ({
					id: t.id,
					name: t.name,
					format: t.format,
					path: t.path ?? "",
					content: t.path ? "" : t.content,
				})),
			};
			localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
		} catch {}
	}, [tabs, activeTabId, themePref]);

	// Close theme menu on outside click
	useEffect(() => {
		if (!themeMenuOpen) return;
		function handleClick(e: MouseEvent) {
			if (
				themeMenuRef.current &&
				!themeMenuRef.current.contains(e.target as Node)
			) {
				setThemeMenuOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [themeMenuOpen]);

	// ── Tab management ───────────────────────────────────────────
	const addTab = useCallback(() => {
		const t = createTab();
		setTabs((prev) => [...prev, t]);
		setActiveTabId(t.id);
	}, []);

	const closeTab = useCallback(
		(id: string) => {
			setTabs((prev) => {
				if (prev.length === 1) return prev; // never close the last tab
				const idx = prev.findIndex((t) => t.id === id);
				const next = prev.filter((t) => t.id !== id);
				if (id === activeTabId) {
					setActiveTabId(next[Math.min(idx, next.length - 1)].id);
				}
				return next;
			});
		},
		[activeTabId],
	);

	// ── File loading ─────────────────────────────────────────────
	const loadFile = useCallback(async (path: string) => {
		const ext = path.split(".").pop()?.toLowerCase() ?? "";
		const fmt: Format = EXT_TO_FORMAT[ext] ?? "markdown";
		const fileContent = await readTextFile(path);
		const fileName = path.split("/").pop() ?? path;

		setTabs((prev) => {
			// Switch to tab if already open
			const existing = prev.find((t) => t.path === path);
			if (existing) {
				setActiveTabId(existing.id);
				return prev.map((t) =>
					t.path === path
						? {
								...t,
								content: fileContent,
								previewContent: fileContent,
								format: fmt,
								isDirty: false,
							}
						: t,
				);
			}
			// Reuse the current tab if it's empty and unsaved
			const currentId = activeTabIdRef.current;
			const currentTab = prev.find((t) => t.id === currentId);
			if (currentTab && !currentTab.path && !currentTab.content) {
				return prev.map((t) =>
					t.id === currentId
						? {
								...t,
								name: fileName,
								format: fmt,
								content: fileContent,
								previewContent: fileContent,
								path,
								isDirty: false,
							}
						: t,
				);
			}
			const newTab = createTab({
				name: fileName,
				format: fmt,
				content: fileContent,
				previewContent: fileContent,
				path,
				isDirty: false,
			});
			setActiveTabId(newTab.id);
			return [...prev, newTab];
		});
	}, []);

	// ── Restore file-backed tabs on startup ──────────────────────
	// Capture initial values in refs so the mount-only effect needs no deps
	const initialPathTabsRef = useRef(tabs.filter((t) => t.path));
	const initialActiveTabIdRef = useRef(activeTabId);
	const loadFileRef = useRef(loadFile);
	loadFileRef.current = loadFile;

	useEffect(() => {
		const pathTabs = initialPathTabsRef.current;
		if (!pathTabs.length) return;

		const savedActiveTabId = initialActiveTabIdRef.current;

		(async () => {
			const toRemove: string[] = [];
			for (const tab of pathTabs) {
				try {
					await loadFileRef.current(tab.path as string);
				} catch {
					toRemove.push(tab.id);
				}
			}
			if (toRemove.length) {
				setTabs((prev) => {
					const remaining = prev.filter((t) => !toRemove.includes(t.id));
					return remaining.length ? remaining : [createTab()];
				});
			}
			setActiveTabId((cur) =>
				toRemove.includes(cur)
					? (pathTabs.find((t) => !toRemove.includes(t.id))?.id ??
						createTab().id)
					: savedActiveTabId,
			);
		})();
	}, []);

	const openFile = useCallback(async () => {
		const selected = await openDialog({
			multiple: false,
			filters: [
				{
					name: "Developer Files",
					extensions: ["md", "markdown", "mdx", "json", "csv"],
				},
			],
		});
		if (!selected) return;
		await loadFile(selected as string);
	}, [loadFile]);

	const saveFile = useCallback(async () => {
		const tab = tabs.find((t) => t.id === activeTabId);
		if (!tab || !tab.isDirty) return;
		if (tab.path) {
			await writeTextFile(tab.path, tab.content);
		}
		setTabs((prev) =>
			prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t)),
		);
	}, [tabs, activeTabId]);

	// Cmd+S / Ctrl+S
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				saveFile();
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [saveFile]);

	const formatJson = useCallback(() => {
		try {
			const formatted = JSON.stringify(JSON.parse(activeTab.content), null, 2);
			updateActiveTab({ content: formatted, previewContent: formatted });
		} catch {
			// invalid JSON — leave as-is
		}
	}, [activeTab.content, updateActiveTab]);

	const minifyJson = useCallback(() => {
		try {
			const minified = JSON.stringify(JSON.parse(activeTab.content));
			updateActiveTab({ content: minified, previewContent: minified });
		} catch {
			// invalid JSON — leave as-is
		}
	}, [activeTab.content, updateActiveTab]);

	const convertRawToMarkdown = useCallback(() => {
		const converted = activeTab.content
			.replace(/\\n/g, "\n")
			.replace(/\\t/g, "\t")
			.replace(/\\r/g, "\r")
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, "\\");
		updateActiveTab({ content: converted, previewContent: converted });
	}, [activeTab.content, updateActiveTab]);

	const handleEditorChange = useCallback(
		(val: string) => {
			setTabs((prev) =>
				prev.map((t) =>
					t.id === activeTabId ? { ...t, content: val, isDirty: true } : t,
				),
			);
			if (previewTimer.current) clearTimeout(previewTimer.current);
			previewTimer.current = setTimeout(() => {
				setTabs((prev) =>
					prev.map((t) =>
						t.id === activeTabId ? { ...t, previewContent: val } : t,
					),
				);
			}, 300);
		},
		[activeTabId],
	);

	// Listen for native menu "File > Open…"
	useEffect(() => {
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-open-file", () => openFile()).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [openFile]);

	// ── Drag and drop ────────────────────────────────────────────
	useEffect(() => {
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		getCurrentWebview()
			.onDragDropEvent(async (event) => {
				const { type } = event.payload;
				if (type === "enter" || type === "over") {
					setIsDragOver(true);
				} else if (type === "drop") {
					setIsDragOver(false);
					for (const path of event.payload.paths) {
						const ext = path.split(".").pop()?.toLowerCase() ?? "";
						if (EXT_TO_FORMAT[ext]) {
							await loadFile(path);
							break;
						}
					}
				} else {
					// leave
					setIsDragOver(false);
				}
			})
			.then((fn) => {
				if (cancelled) fn();
				else unlisten = fn;
			});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [loadFile]);

	// ── Render ───────────────────────────────────────────────────
	return (
		<div className="app">
			{/* Drag-and-drop overlay */}
			{isDragOver && <div className="drag-overlay"></div>}

			<header className="toolbar" data-tauri-drag-region>
				<div className="toolbar-spacer" />
				<Tabs.Root
					value={format}
					onValueChange={(val) => updateActiveTab({ format: val as Format })}
					className="format-tabs-root"
				>
					<Tabs.List className="format-tabs">
						{(["markdown", "json", "csv"] as Format[]).map((f) => (
							<Tabs.Tab key={f} value={f} className="tab-btn">
								{FORMAT_ICONS[f]}
								{f}
							</Tabs.Tab>
						))}
						<Tabs.Indicator className="tab-indicator" />
					</Tabs.List>
				</Tabs.Root>
				<div className="toolbar-actions gap-2">
					{format !== "csv" && (
						<Button
							onClick={() => setShowEditor((s) => !s)}
							title={showEditor ? "Hide editor" : "Show editor"}
						>
							{showEditor ? (
								<>
									<IconLayoutSidebarLeftCollapse size={15} stroke={1.5} />
									Hide editor
								</>
							) : (
								<>
									<IconLayoutSidebarLeftExpand size={15} stroke={1.5} />
									Show editor
								</>
							)}
						</Button>
					)}
					{(format === "markdown" || format === "mdx") && content && (
						<Button onClick={convertRawToMarkdown}>
							<IconWand size={13} stroke={1.5} />
							Format
						</Button>
					)}
					{format === "json" && content && (
						<>
							<Button onClick={formatJson}>
								<IconWand size={13} stroke={1.5} />
								Format
							</Button>
							<Button onClick={minifyJson}>
								<IconMinimize size={13} stroke={1.5} />
								Minify
							</Button>
						</>
					)}
					{format === "csv" && content && (
						<Button
							variant="primary"
							onClick={() =>
								updateActiveTab({ content: "", previewContent: "" })
							}
						>
							<IconTrash size={13} />
							Clear data
						</Button>
					)}
					<div className="theme-menu-wrap" ref={themeMenuRef}>
						<Button onClick={() => setThemeMenuOpen((o) => !o)}>
							{THEME_ICONS[themePref]}
							{THEME_LABELS[themePref]}
						</Button>
						{themeMenuOpen && (
							<div className="theme-dropdown">
								{THEME_OPTIONS.map((opt) => (
									<Button
										variant="ghost"
										key={opt}
										active={themePref === opt}
										onClick={() => {
											setThemePref(opt);
											setThemeMenuOpen(false);
										}}
									>
										{THEME_ICONS[opt]}
										{THEME_LABELS[opt]}
									</Button>
								))}
							</div>
						)}
					</div>
				</div>
			</header>

			{/* ── File tabs bar ── */}
			<div className="file-tabs-bar">
				{tabs.map((tab) => (
					<div
						key={tab.id}
						role="tab"
						tabIndex={0}
						aria-selected={tab.id === activeTabId}
						className={`file-tab${tab.id === activeTabId ? " active" : ""}`}
						onClick={() => setActiveTabId(tab.id)}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") setActiveTabId(tab.id);
						}}
						title={tab.path ?? tab.name}
					>
						<span className="file-tab-icon">{FORMAT_ICONS[tab.format]}</span>
						<span className="file-tab-name">{tab.name}</span>
						{tab.isDirty && (
							<span className="file-tab-dirty" title="Unsaved changes" />
						)}
						<button
							type="button"
							className="file-tab-close"
							tabIndex={-1}
							onClick={(e) => {
								e.stopPropagation();
								closeTab(tab.id);
							}}
							aria-label={`Close ${tab.name}`}
						>
							<IconX size={11} stroke={2} />
						</button>
					</div>
				))}
				<button
					type="button"
					className="file-tab-add"
					onClick={addTab}
					title="New tab"
				>
					<IconPlus size={14} stroke={1.5} />
				</button>
			</div>

			<main className="workspace">
				{format === "csv" || !showEditor ? (
					<PreviewPanel
						content={previewContent}
						format={format}
						isDark={isDark}
						onOpenFile={openFile}
						onContentChange={
							format === "csv"
								? (val) =>
										updateActiveTab({ content: val, previewContent: val })
								: undefined
						}
					/>
				) : (
					<Group orientation="horizontal" className="panel-group">
						<Panel defaultSize={50} minSize={20}>
							<EditorPanel
								value={content}
								onChange={handleEditorChange}
								language={FORMAT_LANGUAGE[format]}
								isDark={isDark}
							/>
						</Panel>
						<Separator className="resize-handle">
							<div className="resize-handle-bar" />
						</Separator>
						<Panel defaultSize={50} minSize={20}>
							<PreviewPanel
								content={previewContent}
								format={format}
								isDark={isDark}
								onOpenFile={openFile}
							/>
						</Panel>
					</Group>
				)}
			</main>
		</div>
	);
}

export default App;
