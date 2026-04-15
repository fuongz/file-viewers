import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import "./App.css";
import { EditorPanel } from "./components/EditorPanel";
import { EditorStatusBar } from "./components/EditorStatusBar";
import { PreviewPanel } from "./components/PreviewPanel";
import { TabSidebar } from "./components/TabSidebar";
import { Toolbar } from "./components/toolbar/Toolbar";
import { CommandPalette, ConfirmDialog, SettingsDialog } from "./components/ui";
import {
	FORMAT_LANGUAGE,
	STORAGE_SESSION_KEY,
	STORAGE_THEME_KEY,
} from "./constants";
import { useDragDrop } from "./hooks/useDragDrop";
import { useFileManager, useRestoreSession } from "./hooks/useFileManager";
import { useKeyboard } from "./hooks/useKeyboard";
import { useNativeMenu } from "./hooks/useNativeMenu";
import { persistSession } from "./hooks/useSession";
import { useTabs } from "./hooks/useTabs";
import { useTheme } from "./hooks/useTheme";

function detectFormat(content: string): "markdown" | "json" | "csv" {
	const trimmed = content.trimStart();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
	const lines = content.split("\n").filter((l) => l.trim());
	if (lines.length >= 2) {
		const counts = lines.map((l) => (l.match(/,/g) ?? []).length);
		if (counts[0] >= 1 && counts.every((c) => c === counts[0])) return "csv";
	}
	return "markdown";
}

function App() {
	const {
		tabs,
		setTabs,
		activeTabId,
		setActiveTabId,
		activeTab,
		updateActiveTab,
		addTab,
		closeTab,
		closeTabForce,
		closeConfirmTabId,
		setCloseConfirmTabId,
		reorderTabs,
		renameTab,
		initialPathTabs,
		initialContentTooLarge,
	} = useTabs();

	const { themePref, setThemePref, isDark } = useTheme();

	const [settingsOpen, setSettingsOpen] = useState(false);
	const [commandOpen, setCommandOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [notification, setNotification] = useState<string | null>(null);

	useEffect(() => {
		if (initialContentTooLarge) {
			setNotification(
				"Some unsaved tabs were too large and not restored. Open the files to continue editing.",
			);
			setTimeout(() => setNotification(null), 5000);
		}
	}, [initialContentTooLarge]);

	function toggleSidebar() {
		setSidebarCollapsed((v) => !v);
	}
	const { format, content, previewContent, binaryContent, showEditor } =
		activeTab;

	const activeTabIdRef = useRef(activeTabId);
	activeTabIdRef.current = activeTabId;

	const { loadFile, openFile, saveFile, renameFile, loadFileRef } =
		useFileManager({
			tabs,
			activeTabId,
			setTabs,
			setActiveTabId,
			activeTabIdRef,
		});

	const { isDragOver } = useDragDrop(loadFile);

	useRestoreSession(
		initialPathTabs,
		activeTabId,
		loadFileRef,
		setTabs,
		setActiveTabId,
	);

	const clearStorage = () => {
		localStorage.removeItem(STORAGE_SESSION_KEY);
		localStorage.removeItem(STORAGE_THEME_KEY);
		window.location.reload();
	};

	useNativeMenu(
		openFile,
		closeTab,
		activeTabIdRef,
		addTab,
		saveFile,
		() => setSettingsOpen(true),
		clearStorage,
	);
	useKeyboard(
		{
			s: saveFile,
			w: closeTab,
			t: addTab,
			",": () => setSettingsOpen(true),
			k: () => setCommandOpen(true),
			b: toggleSidebar,
			...Object.fromEntries(
				Array.from({ length: 9 }, (_, i) => [
					String(i + 1),
					() => {
						const tab = tabs[i];
						if (tab) setActiveTabId(tab.id);
					},
				]),
			),
		},
		activeTabId,
	);

	// Persist session on any relevant state change
	useEffect(() => {
		const { skippedLargeContent } = persistSession(
			tabs,
			activeTabId,
			themePref,
		);
		if (skippedLargeContent) {
			setNotification(
				"Large content not saved to session. Save to file to preserve.",
			);
			setTimeout(() => setNotification(null), 4000);
		}
	}, [tabs, activeTabId, themePref]);

	// Debounced preview update on editor change
	const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const handleEditorChange = useCallback(
		(val: string) => {
			setTabs((prev) =>
				prev.map((t) => {
					if (t.id !== activeTabId) return t;
					const format = t.path ? t.format : detectFormat(val);
					return { ...t, content: val, isDirty: true, format };
				}),
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
		[activeTabId, setTabs],
	);

	const formatMarkdown = useCallback(() => {
		const converted = activeTab.content
			.replace(/\\n/g, "\n")
			.replace(/\\t/g, "\t")
			.replace(/\\r/g, "\r")
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, "\\");
		updateActiveTab({ content: converted, previewContent: converted });
	}, [activeTab.content, updateActiveTab]);

	const formatJson = useCallback(() => {
		const tryParse = (src: string) => JSON.stringify(JSON.parse(src), null, 2);
		try {
			let formatted: string;
			try {
				formatted = tryParse(activeTab.content);
			} catch {
				// Fallback: unescape literal escape sequences then retry
				const unescaped = activeTab.content
					.replace(/\\n/g, "\n")
					.replace(/\\t/g, "\t")
					.replace(/\\r/g, "\r")
					.replace(/\\"/g, '"')
					.replace(/\\\\/g, "\\");
				formatted = tryParse(unescaped);
			}
			updateActiveTab({ content: formatted, previewContent: formatted });
		} catch {}
	}, [activeTab.content, updateActiveTab]);

	const minifyJson = useCallback(() => {
		try {
			const minified = JSON.stringify(JSON.parse(activeTab.content));
			updateActiveTab({ content: minified, previewContent: minified });
		} catch {}
	}, [activeTab.content, updateActiveTab]);

	const closeConfirmTab = tabs.find((t) => t.id === closeConfirmTabId);

	return (
		<div className="app">
			{notification && (
				<div className="notification-banner">
					<span>{notification}</span>
					<button
						type="button"
						onClick={() => setNotification(null)}
						className="notification-close"
					>
						×
					</button>
				</div>
			)}
			<ConfirmDialog
				open={closeConfirmTabId !== null}
				title="Close unsaved file?"
				description={`"${closeConfirmTab?.name}" has unsaved changes. Close without saving?`}
				confirmLabel="Close without saving"
				cancelLabel="Cancel"
				onConfirm={() => {
					if (closeConfirmTabId) closeTabForce(closeConfirmTabId);
					setCloseConfirmTabId(null);
				}}
				onCancel={() => setCloseConfirmTabId(null)}
			/>
			{isDragOver && <div className="drag-overlay" />}

			<Toolbar
				format={format}
				showEditor={showEditor}
				sidebarCollapsed={sidebarCollapsed}
				tabName={activeTab.name}
				onToggleEditor={() => updateActiveTab({ showEditor: !showEditor })}
				onToggleSidebar={toggleSidebar}
				onOpenSettings={() => setSettingsOpen(true)}
			/>

			<main className="workspace">
				<div className="workspace-inner">
					{!sidebarCollapsed && (
						<div className="sidebar-fixed">
							<TabSidebar
								tabs={tabs}
								activeTabId={activeTabId}
								onSelectTab={setActiveTabId}
								onCloseTab={closeTab}
								onAddTab={addTab}
								onReorderTabs={reorderTabs}
								onRenameTab={(id: string, newName: string) => {
									const tab = tabs.find((t) => t.id === id);
									if (tab?.path) {
										renameFile(id, newName);
									} else {
										renameTab(id, newName);
									}
								}}
							/>
						</div>
					)}
					<div className="content-area">
						{!showEditor ? (
							<PreviewPanel
								content={previewContent}
								format={format}
								isDark={isDark}
								onOpenFile={openFile}
								binaryContent={binaryContent}
								onContentChange={
									format === "csv"
										? (val) =>
												updateActiveTab({ content: val, previewContent: val })
										: undefined
								}
								onClearCsv={
									format === "csv"
										? () => updateActiveTab({ content: "", previewContent: "" })
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
										statusBar={
											<EditorStatusBar
												format={format}
												content={content}
												onFormatMarkdown={formatMarkdown}
												onFormatJson={formatJson}
												onMinifyJson={minifyJson}
											/>
										}
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
										binaryContent={binaryContent}
										onContentChange={
											format === "csv"
												? (val) =>
														updateActiveTab({
															content: val,
															previewContent: val,
														})
												: undefined
										}
										onClearCsv={
											format === "csv"
												? () =>
														updateActiveTab({ content: "", previewContent: "" })
												: undefined
										}
									/>
								</Panel>
							</Group>
						)}
					</div>
				</div>
			</main>
			<SettingsDialog
				open={settingsOpen}
				onOpenChange={setSettingsOpen}
				themePref={themePref}
				onThemeSelect={setThemePref}
			/>
			<CommandPalette
				open={commandOpen}
				onOpenChange={setCommandOpen}
				items={[
					{ id: "new-tab", label: "New Tab", shortcut: "⌘ T", action: addTab },
					{
						id: "close-tab",
						label: "Close Tab",
						shortcut: "⌘ W",
						action: () => closeTab(activeTabId),
					},
					{ id: "save", label: "Save", shortcut: "⌘ S", action: saveFile },
					{ id: "open", label: "Open File", shortcut: "⌘ O", action: openFile },
					{
						id: "toggle-sidebar",
						label: "Toggle Sidebar",
						shortcut: "⌘ B",
						action: toggleSidebar,
					},
					{
						id: "settings",
						label: "Settings",
						shortcut: "⌘ ,",
						action: () => setSettingsOpen(true),
					},
					{
						id: "toggle-editor",
						label: "Toggle Editor",
						action: () => updateActiveTab({ showEditor: !showEditor }),
					},
					{
						id: "format-markdown",
						label: "Format Markdown",
						action: formatMarkdown,
					},
					{ id: "format-json", label: "Format JSON", action: formatJson },
					{ id: "minify-json", label: "Minify JSON", action: minifyJson },
					{
						id: "clear-csv",
						label: "Clear CSV",
						action: () => updateActiveTab({ content: "", previewContent: "" }),
					},
				]}
			/>
		</div>
	);
}

export default App;
