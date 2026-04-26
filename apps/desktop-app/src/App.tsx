import { useEffect, useState } from "react";
import "./App.css";
import { toast } from "sonner";
import { CloseTabDialog } from "./components/CloseTabDialog";
import { CsvMergeDialog } from "./components/CsvMergeDialog";
import { CsvSplitDialog } from "./components/CsvSplitDialog";
import { DragOverlay } from "./components/DragOverlay";
import { Toolbar } from "./components/toolbar/Toolbar";
import {
	CommandPalette,
	SettingsDialog,
	SidebarInset,
	SidebarProvider,
	TooltipProvider,
} from "./components/ui";
import { Toaster } from "./components/ui/sonner";
import { Workspace } from "./components/Workspace";
import { FileTree } from "./components/workspace/FileTree";
import { STORAGE_SESSION_KEY, STORAGE_THEME_KEY } from "./constants";
import { useDragDrop } from "./hooks/useDragDrop";
import { useEditorActions } from "./hooks/useEditorActions";
import { useFileManager, useRestoreSession } from "./hooks/useFileManager";
import { useKeyboard } from "./hooks/useKeyboard";
import { useNativeMenu } from "./hooks/useNativeMenu";
import { useOpenWith } from "./hooks/useOpenWith";
import { persistSession } from "./hooks/useSession";
import { useTheme } from "./hooks/useTheme";
import { useUpdater } from "./hooks/useUpdater";
import { selectActiveTab, selectIsDark, useAppStore } from "./store";

function App() {
	const {
		tabs,
		setActiveTabId,
		activeTabId,
		themePref,
		setThemePref,
		closeTab,
		addTab,
		updateActiveTab,
		setTabs,
		initialContentTooLarge,
		settingsOpen,
		setSettingsOpen,
		commandOpen,
		setCommandOpen,
		toggleSidebar,
		sidebarCollapsed,
		isDragOver,
	} = useAppStore();

	const [splitDialogOpen, setSplitDialogOpen] = useState(false);
	const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

	const activeTab = useAppStore(selectActiveTab);
	const isDark = useAppStore(selectIsDark);

	const { format, content, previewContent, binaryContent, showEditor } =
		activeTab;

	const isAnyTabLoading = tabs.some((t) => t.isLoading);
	const isAnyTabBusy = tabs.some((t) => t.isLoading || t.isProcessing);

	const { loadFile, openFile, saveFile, loadFileRef, loadUrl } =
		useFileManager();

	const { handleEditorChange, formatMarkdown, formatJson, minifyJson } =
		useEditorActions();

	useDragDrop(loadFile);
	useTheme();
	const { checkNow } = useUpdater();
	useRestoreSession(loadFileRef);
	useOpenWith(loadFile);

	const clearStorage = () => {
		localStorage.removeItem(STORAGE_SESSION_KEY);
		localStorage.removeItem(STORAGE_THEME_KEY);
		window.location.reload();
	};

	useNativeMenu(
		openFile,
		saveFile,
		() => setSettingsOpen(true),
		clearStorage,
		checkNow,
		isDragOver,
	);

	useKeyboard(
		{
			s: saveFile,
			w: closeTab,
			t: () => {
				if (!isAnyTabBusy) addTab();
			},
			",": () => setSettingsOpen(true),
			k: () => setCommandOpen(true),
			b: toggleSidebar,
			e: () => updateActiveTab({ showEditor: !showEditor }),
			...Object.fromEntries(
				Array.from({ length: 9 }, (_, i) => [
					String(i + 1),
					() => {
						if (isAnyTabBusy) return;
						const tab = tabs[i];
						if (tab) setActiveTabId(tab.id);
					},
				]),
			),
		},
		activeTabId,
		isDragOver,
	);

	useEffect(() => {
		if (initialContentTooLarge) {
			toast.error(
				"Some unsaved tabs were too large and not restored. Open the files to continue editing.",
			);
		}
	}, [initialContentTooLarge]);

	useEffect(() => {
		const { skippedLargeContent } = persistSession(
			tabs,
			activeTabId,
			themePref,
		);
		if (skippedLargeContent) {
			toast.error(
				"Large content not saved to session. Save to file to preserve.",
			);
		}
	}, [tabs, activeTabId, themePref]);

	const csvTabs = tabs.filter((t) => t.format === "csv");

	const countCsvRows = (csvContent: string): number => {
		if (!csvContent.trim()) return 0;
		return csvContent.split("\n").length - 1;
	};

	const handleSplitCsv = (rowsPerFile: number) => {
		const lines = content.split("\n");
		const header = lines[0] ?? "";
		const dataLines = lines.slice(1);
		const parts: string[] = [];

		for (let i = 0; i < dataLines.length; i += rowsPerFile) {
			const chunk = dataLines.slice(i, i + rowsPerFile);
			parts.push([header, ...chunk].join("\n"));
		}

		const baseName = activeTab.name.replace(/\.csv$/i, "");
		const newTabs = parts.map((part, idx) => ({
			id: crypto.randomUUID(),
			name: `${baseName}_part_${idx + 1}.csv`,
			format: "csv" as const,
			content: part,
			previewContent: part,
			showEditor: true,
		}));

		setTabs((prev) => [...prev, ...newTabs]);
		setActiveTabId(newTabs[0].id);
		setSplitDialogOpen(false);
		toast.success(`Split into ${parts.length} files`);
	};

	const handleMergeCsv = (selectedIds: string[], includeHeaders: boolean) => {
		const selectedTabs = tabs.filter((t) => selectedIds.includes(t.id));
		const mergedLines: string[] = [];

		selectedTabs.forEach((tab, idx) => {
			const lines = tab.content.split("\n");
			if (includeHeaders && idx === 0) {
				mergedLines.push(lines[0] ?? "");
				mergedLines.push(...lines.slice(1));
			} else if (includeHeaders) {
				mergedLines.push(...lines.slice(1));
			} else {
				mergedLines.push(...lines);
			}
		});

		const mergedContent = mergedLines.join("\n");
		const newTab = {
			id: crypto.randomUUID(),
			name: `merged_${Date.now()}.csv`,
			format: "csv" as const,
			content: mergedContent,
			previewContent: mergedContent,
			showEditor: true,
		};

		setTabs((prev) => [...prev, newTab]);
		setActiveTabId(newTab.id);
		setMergeDialogOpen(false);
		toast.success(`Merged ${selectedTabs.length} files`);
	};

	return (
		<TooltipProvider delay={0}>
			<div>
				<SidebarProvider
					className="flex flex-col"
					open={!sidebarCollapsed}
					onOpenChange={(open) => {
						if (open === sidebarCollapsed) toggleSidebar();
					}}
				>
					<Toolbar
						format={format}
						showEditor={showEditor}
						sidebarCollapsed={sidebarCollapsed}
						tabName={activeTab.name}
						onToggleEditor={() => updateActiveTab({ showEditor: !showEditor })}
						onToggleSidebar={toggleSidebar}
						onAddTab={() => {
							if (!isAnyTabBusy) addTab();
						}}
					/>
					<div className="flex flex-1 overflow-hidden">
						<FileTree />
						<SidebarInset className="app relative top-10 h-[calc(100svh-40px)]!">
							<CloseTabDialog />
							{isDragOver && <DragOverlay />}
							<Workspace
								showEditor={showEditor}
								content={content}
								previewContent={previewContent}
								format={format}
								isDark={isDark}
								isLoading={isAnyTabLoading}
								binaryContent={binaryContent}
								onProcessingChange={(loading) =>
									updateActiveTab({ isProcessing: loading })
								}
								onOpenFile={openFile}
								onEditorChange={handleEditorChange}
								onFormatMarkdown={formatMarkdown}
								onFormatJson={formatJson}
								onMinifyJson={minifyJson}
								onContentChange={
									format === "csv"
										? (val) =>
												updateActiveTab({
													content: val,
													previewContent: val,
													isDirty: true,
												})
										: undefined
								}
								onClearCsv={
									format === "csv"
										? () => updateActiveTab({ content: "", previewContent: "" })
										: undefined
								}
								onSplitCsv={() => setSplitDialogOpen(true)}
								onMergeCsv={() => setMergeDialogOpen(true)}
							/>

							<SettingsDialog
								open={settingsOpen}
								onOpenChange={setSettingsOpen}
								themePref={themePref}
								onThemeSelect={setThemePref}
							/>

							<CsvSplitDialog
								open={splitDialogOpen}
								onOpenChange={setSplitDialogOpen}
								onConfirm={handleSplitCsv}
								totalRows={countCsvRows(content)}
							/>

							<CsvMergeDialog
								open={mergeDialogOpen}
								onOpenChange={setMergeDialogOpen}
								onConfirm={handleMergeCsv}
								csvTabs={csvTabs}
							/>

							<CommandPalette
								open={commandOpen}
								onOpenChange={setCommandOpen}
								onLoadUrl={loadUrl}
								items={[
									{
										id: "new-tab",
										label: "New Tab",
										shortcut: "⌘T",
										action: addTab,
									},
									{
										id: "open",
										label: "Open File",
										shortcut: "⌘O",
										action: openFile,
									},
									{
										id: "toggle-sidebar",
										label: "Toggle Sidebar",
										shortcut: "⌘B",
										action: toggleSidebar,
									},
									{
										id: "settings",
										label: "Settings",
										shortcut: "⌘,",
										action: () => setSettingsOpen(true),
									},
									{
										id: "toggle-editor",
										label: "Toggle Editor",
										shortcut: "⌘E",
										action: () => updateActiveTab({ showEditor: !showEditor }),
									},
									{
										id: "toggle-theme",
										label: isDark
											? "Switch to Light Theme"
											: "Switch to Dark Theme",
										action: () => setThemePref(isDark ? "light" : "dark"),
									},
								]}
							/>

							<Toaster position="top-center" />
						</SidebarInset>
					</div>
				</SidebarProvider>
			</div>
		</TooltipProvider>
	);
}

export default App;
