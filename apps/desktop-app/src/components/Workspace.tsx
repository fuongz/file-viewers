import { IconAlertTriangle, IconLoader } from "@tabler/icons-react";
import { canShowEditor, FORMAT_LANGUAGE } from "@/constants";
import type { Format } from "@/types";
import { EditorActionsBar } from "./EditorActionsBar";
import { EditorPanel } from "./EditorPanel";
import { PreviewPanel } from "./PreviewPanel";
import {
	Button,
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "./ui";

interface WorkspaceProps {
	tabId: string;
	showEditor: boolean;
	content: string;
	previewContent: string;
	format: Format;
	isDark: boolean;
	isLoading: boolean;
	binaryContent?: Uint8Array;
	path?: string;
	externalRevision?: number;
	hasExternalChange?: boolean;
	onReloadExternal?: () => void;
	onKeepLocal?: () => void;
	onOpenFile: () => void;
	onEditorChange: (value: string) => void;
	onFormatMarkdown: () => void;
	onFormatJson: () => void;
	onMinifyJson: () => void;
	onContentChange?: (value: string) => void;
	onClearCsv?: () => void;
	onSplitCsv?: () => void;
	onMergeCsv?: () => void;
	onProcessingChange?: (loading: boolean) => void;
}

export function Workspace({
	tabId,
	showEditor,
	content,
	previewContent,
	format,
	isDark,
	isLoading,
	binaryContent,
	path,
	externalRevision,
	hasExternalChange,
	onReloadExternal,
	onKeepLocal,
	onOpenFile,
	onEditorChange,
	onFormatMarkdown,
	onFormatJson,
	onMinifyJson,
	onContentChange,
	onClearCsv,
	onSplitCsv,
	onMergeCsv,
	onProcessingChange,
}: WorkspaceProps) {
	if (isLoading) {
		return (
			<div className="workspace-card flex items-center justify-center">
				<IconLoader className="animate-spin text-muted-foreground" size={32} />
			</div>
		);
	}

	const banner = hasExternalChange && (
		<div
			role="alert"
			className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-xs"
		>
			<IconAlertTriangle
				className="size-4 shrink-0 text-amber-500"
				aria-hidden="true"
			/>
			<span className="min-w-0 flex-1">
				This file changed on disk. Reload it or keep your version.
			</span>
			<Button size="sm" variant="outline" onClick={onReloadExternal}>
				Reload
			</Button>
			<Button size="sm" variant="ghost" onClick={onKeepLocal}>
				Keep mine
			</Button>
		</div>
	);

	const preview = (
		<PreviewPanel
			key={format === "jsonl" ? tabId : undefined}
			content={previewContent}
			format={format}
			isDark={isDark}
			onOpenFile={onOpenFile}
			binaryContent={binaryContent}
			path={path}
			externalRevision={externalRevision}
			onContentChange={onContentChange}
			onClearCsv={onClearCsv}
			onSplitCsv={onSplitCsv}
			onMergeCsv={onMergeCsv}
			onProcessingChange={onProcessingChange}
		/>
	);

	if (!showEditor || !canShowEditor(format))
		return (
			<div className="flex h-full min-h-0 flex-col gap-1.5">
				{banner}
				<div className="workspace-card min-h-0 flex-1">{preview}</div>
			</div>
		);

	return (
		<div className="flex h-full min-h-0 flex-col gap-1.5">
			{banner}
			<ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
				<ResizablePanel
					className="workspace-card"
					style={{ overflow: "hidden" }}
					defaultSize="50%"
					minSize="20%"
				>
					<EditorPanel
						value={content}
						onChange={onEditorChange}
						language={FORMAT_LANGUAGE[format]}
						isDark={isDark}
						actionsBar={
							<EditorActionsBar
								format={format}
								content={content}
								onFormatMarkdown={onFormatMarkdown}
								onFormatJson={onFormatJson}
								onMinifyJson={onMinifyJson}
							/>
						}
					/>
				</ResizablePanel>
				<ResizableHandle withHandle className="w-2 bg-transparent" />
				<ResizablePanel
					className="workspace-card"
					style={{ overflow: "hidden" }}
					defaultSize="50%"
					minSize="20%"
				>
					{preview}
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
