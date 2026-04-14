import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import "./App.css";
import { EditorPanel } from "./components/EditorPanel";
import { FileTabsBar } from "./components/FileTabsBar";
import { PreviewPanel } from "./components/PreviewPanel";
import { Toolbar } from "./components/toolbar/Toolbar";
import { CommandPalette, ConfirmDialog, SettingsDialog } from "./components/ui";
import { FORMAT_LANGUAGE } from "./constants";
import { useDragDrop } from "./hooks/useDragDrop";
import { useFileManager, useRestoreSession } from "./hooks/useFileManager";
import { useKeyboard } from "./hooks/useKeyboard";
import { useNativeMenu } from "./hooks/useNativeMenu";
import { persistSession } from "./hooks/useSession";
import { useTabs } from "./hooks/useTabs";
import { useTheme } from "./hooks/useTheme";

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
	} = useTabs();

	const { themePref, setThemePref, isDark } = useTheme();

	const [showEditor, setShowEditor] = useState(true);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [commandOpen, setCommandOpen] = useState(false);
	const { format, content, previewContent } = activeTab;

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

	useNativeMenu(openFile, closeTab, activeTabIdRef, addTab, saveFile, () =>
		setSettingsOpen(true),
	);
	useKeyboard(
		{
			s: saveFile,
			w: closeTab,
			t: addTab,
			",": () => setSettingsOpen(true),
			k: () => setCommandOpen(true),
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
		persistSession(tabs, activeTabId, themePref);
	}, [tabs, activeTabId, themePref]);

	// Debounced preview update on editor change
	const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
		try {
			const formatted = JSON.stringify(JSON.parse(activeTab.content), null, 2);
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
				content={content}
				showEditor={showEditor}
				onFormatChange={(f) => updateActiveTab({ format: f })}
				onToggleEditor={() => setShowEditor((s) => !s)}
				onFormatMarkdown={formatMarkdown}
				onFormatJson={formatJson}
				onMinifyJson={minifyJson}
				onClearCsv={() => updateActiveTab({ content: "", previewContent: "" })}
				onOpenSettings={() => setSettingsOpen(true)}
			/>

			<FileTabsBar
				tabs={tabs}
				activeTabId={activeTabId}
				onSelectTab={setActiveTabId}
				onCloseTab={closeTab}
				onAddTab={addTab}
				onReorderTabs={reorderTabs}
				onRenameTab={(id, newName) => {
					const tab = tabs.find((t) => t.id === id);
					if (tab?.path) {
						renameFile(id, newName);
					} else {
						renameTab(id, newName);
					}
				}}
			/>

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
						id: "settings",
						label: "Settings",
						shortcut: "⌘ ,",
						action: () => setSettingsOpen(true),
					},
					{
						id: "toggle-editor",
						label: "Toggle Editor",
						action: () => setShowEditor((s) => !s),
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
