import { Tabs } from "@base-ui/react/tabs";
import {
	IconBraces,
	IconDeviceDesktop,
	IconMarkdown,
	IconMinimize,
	IconMoon,
	IconSun,
	IconTable,
	IconTrash,
	IconWand,
} from "@tabler/icons-react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { EditorPanel } from "./components/EditorPanel";
import { type Format, PreviewPanel } from "./components/PreviewPanel";
import "./App.css";
import { Button } from "./components/ui/Button";

type ThemePreference = "system" | "dark" | "light";

const EXT_TO_FORMAT: Record<string, Format> = {
	md: "markdown",
	markdown: "markdown",
	json: "json",
	csv: "csv",
};

const DEFAULT_CONTENT: Record<Format, string> = {
	markdown: "",
	json: "",
	csv: "",
};

const FORMAT_LANGUAGE: Record<Format, string> = {
	markdown: "markdown",
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

const FORMAT_ICONS: Record<Format, React.ReactNode> = {
	markdown: <IconMarkdown size={13} stroke={1.5} />,
	json: <IconBraces size={13} stroke={1.5} />,
	csv: <IconTable size={13} stroke={1.5} />,
};

function App() {
	const [format, setFormat] = useState<Format>("markdown");
	const [content, setContent] =
		useState<Record<Format, string>>(DEFAULT_CONTENT);
	const [themePref, setThemePref] = useState<ThemePreference>("system");
	const [systemDark, setSystemDark] = useState(
		() => window.matchMedia("(prefers-color-scheme: dark)").matches,
	);
	const [themeMenuOpen, setThemeMenuOpen] = useState(false);
	const [isDragOver, setIsDragOver] = useState(false);
	const themeMenuRef = useRef<HTMLDivElement>(null);

	// ── Theme ────────────────────────────────────────────────────
	const isDark = themePref === "dark" || (themePref === "system" && systemDark);

	useEffect(() => {
		document.documentElement.setAttribute(
			"data-theme",
			isDark ? "dark" : "light",
		);
	}, [isDark]);

	useEffect(() => {
		if (themePref !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [themePref]);

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

	// ── File loading ─────────────────────────────────────────────

	/** Load a file by path: detect format from extension, read, update state. */
	const loadFile = useCallback(async (path: string) => {
		const ext = path.split(".").pop()?.toLowerCase() ?? "";
		const fmt: Format = EXT_TO_FORMAT[ext] ?? "markdown";
		const fileContent = await readTextFile(path);
		setContent((prev) => ({ ...prev, [fmt]: fileContent }));
		setFormat(fmt);
	}, []);

	/** Open native file picker dialog. */
	const openFile = useCallback(async () => {
		const selected = await openDialog({
			multiple: false,
			filters: [
				{
					name: "Developer Files",
					extensions: ["md", "markdown", "json", "csv"],
				},
			],
		});
		if (!selected) return;
		await loadFile(selected as string);
	}, [loadFile]);

	/** Pretty-print the JSON editor content. No-op if content is invalid JSON. */
	const formatJson = useCallback(() => {
		try {
			const formatted = JSON.stringify(JSON.parse(content.json), null, 2);
			setContent((prev) => ({ ...prev, json: formatted }));
		} catch {
			// invalid JSON — leave as-is
		}
	}, [content.json]);

	/** Minify the JSON editor content. No-op if content is invalid JSON. */
	const minifyJson = useCallback(() => {
		try {
			const minified = JSON.stringify(JSON.parse(content.json));
			setContent((prev) => ({ ...prev, json: minified }));
		} catch {
			// invalid JSON — leave as-is
		}
	}, [content.json]);

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
					// Load the first file whose extension we recognise
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
					onValueChange={(val) => setFormat(val as Format)}
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
					{format === "json" && content.json && (
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
					{format === "csv" && content.csv && (
						<Button
							variant="primary"
							onClick={() => setContent((prev) => ({ ...prev, csv: "" }))}
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

			<main className="workspace">
				{format === "csv" ? (
					<PreviewPanel
						content={content[format]}
						format={format}
						isDark={isDark}
						onOpenFile={openFile}
						onContentChange={(val) =>
							setContent((prev) => ({ ...prev, csv: val }))
						}
					/>
				) : (
					<Group orientation="horizontal" className="panel-group">
						<Panel defaultSize={50} minSize={20}>
							<EditorPanel
								value={content[format]}
								onChange={(val) =>
									setContent((prev) => ({ ...prev, [format]: val }))
								}
								language={FORMAT_LANGUAGE[format]}
								isDark={isDark}
							/>
						</Panel>
						<Separator className="resize-handle">
							<div className="resize-handle-bar" />
						</Separator>
						<Panel defaultSize={50} minSize={20}>
							<PreviewPanel
								content={content[format]}
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
