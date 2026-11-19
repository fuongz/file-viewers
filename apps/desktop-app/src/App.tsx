import { Tabs } from "@base-ui/react/tabs";
import {
	IconFilePlus,
	IconFolderOpen,
	IconKeyboard,
	IconPalette,
	IconSettings,
} from "@tabler/icons-react";
import { useEffect, useLayoutEffect, useState } from "react";
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
	TooltipProvider,
} from "./components/ui";
import { Toaster } from "./components/ui/sonner";
import { Workspace } from "./components/Workspace";
import { FileTabs } from "./components/workspace/FileTabs";
import {
	canShowEditor,
	STORAGE_SESSION_KEY,
	STORAGE_THEME_KEY,
	TAB_SHORTCUT_COUNT,
} from "./constants";
import { useDragDrop } from "./hooks/useDragDrop";
import { useEditorActions } from "./hooks/useEditorActions";
import { useFileManager, useRestoreSession } from "./hooks/useFileManager";
import { useFileWatcher } from "./hooks/useFileWatcher";
import { useKeyboard } from "./hooks/useKeyboard";
import { useNativeMenu } from "./hooks/useNativeMenu";
import { useOpenWith } from "./hooks/useOpenWith";
import { persistSession } from "./hooks/useSession";
import { useTheme } from "./hooks/useTheme";
import { useUpdater } from "./hooks/useUpdater";
import { fontStack, interfaceFonts, monoFonts } from "./lib/typography";
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
		isDragOver,
	} = useAppStore();

	const [splitDialogOpen, setSplitDialogOpen] = useState(false);
	const [mergeDialogOpen, setMergeDialogOpen] = useState(false);

	const activeTab = useAppStore(selectActiveTab);
	const isDark = useAppStore(selectIsDark);
	const { interfaceFont, interfaceSize, monoFont, monoSize } = useAppStore(
		(s) => s.typography,
	);

	useLayoutEffect(() => {
		const { style } = document.documentElement;
		style.setProperty(
			"--interface-font",
			fontStack(interfaceFonts, interfaceFont),
		);
		style.setProperty("--interface-size", `${interfaceSize / 16}rem`);
		style.setProperty("--code-font", fontStack(monoFonts, monoFont));
		style.setProperty("--code-size", `${monoSize / 16}rem`);
	}, [interfaceFont, interfaceSize, monoFont, monoSize]);

	const { format, content, previewContent, binaryContent, showEditor } =
		activeTab;

	const isAnyTabLoading = tabs.some((t) => t.isLoading);
	const isAnyTabBusy = tabs.some((t) => t.isLoading || t.isProcessing);

	const {
		loadFile,
		openFile,
		saveFile,
		reloadFromDisk,
		keepLocalFile,
		loadFileRef,
		loadUrl,
	} = useFileManager();

	useFileWatcher(reloadFromDisk);

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
		useAppStore.persist.clearStorage();
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
			e: () => {
				if (canShowEditor(format)) updateActiveTab({ showEditor: !showEditor });
			},
			...Object.fromEntries(
				Array.from({ length: TAB_SHORTCUT_COUNT }, (_, i) => [
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
			<Tabs.Root
				className="flex h-dvh flex-col overflow-hidden bg-[var(--bg-app)] dark:bg-background"
				value={activeTabId}
				onValueChange={(id) => {
					if (!isAnyTabBusy && typeof id === "string") setActiveTabId(id);
				}}
			>
				<Toolbar
					format={format}
					showEditor={showEditor}
					busy={isAnyTabBusy}
					onToggleEditor={() => updateActiveTab({ showEditor: !showEditor })}
					onAddTab={addTab}
					onCommand={() => setCommandOpen(true)}
					onSettings={() => setSettingsOpen(true)}
				>
					<FileTabs
						busy={isAnyTabBusy}
						onSplitTab={(id) => {
							setActiveTabId(id);
							setSplitDialogOpen(true);
						}}
						onMerge={() => setMergeDialogOpen(true)}
					/>
				</Toolbar>
				<Tabs.Panel
					value={activeTabId}
					render={<main />}
					className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pt-1 pb-2 outline-none focus-visible:bg-muted/50"
				>
					<CloseTabDialog />
					{isDragOver && <DragOverlay />}
					<Workspace
						tabId={activeTabId}
						showEditor={showEditor}
						content={content}
						previewContent={previewContent}
						format={format}
						isDark={isDark}
						isLoading={isAnyTabLoading}
						binaryContent={binaryContent}
						path={activeTab.path}
						externalRevision={activeTab.reloadToken}
						hasExternalChange={!!activeTab.hasExternalChange}
						onReloadExternal={() => void reloadFromDisk(activeTabId)}
						onKeepLocal={() => void keepLocalFile(activeTabId)}
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
								icon: <IconFilePlus />,
								shortcut: "T",
								action: addTab,
							},
							{
								id: "open",
								label: "Open File",
								icon: <IconFolderOpen />,
								shortcut: "O",
								action: openFile,
							},
							{
								id: "settings",
								label: "Settings",
								icon: <IconSettings />,
								shortcut: ",",
								action: () => setSettingsOpen(true),
							},
							...(canShowEditor(format)
								? [
										{
											id: "toggle-editor",
											label: "Toggle Editor",
											icon: <IconKeyboard />,
											shortcut: "E",
											action: () =>
												updateActiveTab({ showEditor: !showEditor }),
										},
									]
								: []),
							{
								id: "toggle-theme",
								icon: <IconPalette />,
								label: isDark
									? "Switch to Light Theme"
									: "Switch to Dark Theme",
								action: () => setThemePref(isDark ? "light" : "dark"),
							},
						]}
					/>

					<Toaster position="top-center" />
				</Tabs.Panel>
			</Tabs.Root>
		</TooltipProvider>
	);
}

export default App;
