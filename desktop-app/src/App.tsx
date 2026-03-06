import { useCallback, useEffect, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import "./App.css";
import { EditorPanel } from "./components/EditorPanel";
import { FileTabsBar } from "./components/FileTabsBar";
import { PreviewPanel } from "./components/PreviewPanel";
import { Toolbar } from "./components/toolbar/Toolbar";
import { ConfirmDialog } from "./components/ui/Dialog";
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
		initialPathTabs,
	} = useTabs();

	const {
		themePref,
		setThemePref,
		isDark,
		themeMenuOpen,
		setThemeMenuOpen,
		themeMenuRef,
	} = useTheme();

	const [showEditor, setShowEditor] = useState(true);
	const { format, content, previewContent } = activeTab;

	const activeTabIdRef = useRef(activeTabId);
	activeTabIdRef.current = activeTabId;

	const { loadFile, openFile, saveFile, loadFileRef } = useFileManager({
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

	useNativeMenu(openFile, closeTab, activeTabIdRef, addTab);
	useKeyboard(
		{
			s: saveFile,
			w: closeTab,
			t: addTab,
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
				themePref={themePref}
				themeMenuOpen={themeMenuOpen}
				themeMenuRef={themeMenuRef}
				onFormatChange={(f) => updateActiveTab({ format: f })}
				onToggleEditor={() => setShowEditor((s) => !s)}
				onFormatMarkdown={formatMarkdown}
				onFormatJson={formatJson}
				onMinifyJson={minifyJson}
				onClearCsv={() => updateActiveTab({ content: "", previewContent: "" })}
				onThemeToggle={() => setThemeMenuOpen((o) => !o)}
				onThemeSelect={(pref) => {
					setThemePref(pref);
					setThemeMenuOpen(false);
				}}
			/>

			<FileTabsBar
				tabs={tabs}
				activeTabId={activeTabId}
				onSelectTab={setActiveTabId}
				onCloseTab={closeTab}
				onAddTab={addTab}
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
		</div>
	);
}

export default App;
