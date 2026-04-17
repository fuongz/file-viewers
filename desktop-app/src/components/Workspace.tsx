import { IconLoader } from "@tabler/icons-react";
import { FORMAT_LANGUAGE } from "@/constants";
import type { Format } from "@/types";
import { EditorActionsBar } from "./EditorActionsBar";
import { EditorPanel } from "./EditorPanel";
import { PreviewPanel } from "./PreviewPanel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "./ui";

interface WorkspaceProps {
	showEditor: boolean;
	content: string;
	previewContent: string;
	format: Format;
	isDark: boolean;
	isLoading: boolean;
	binaryContent?: Uint8Array;
	onOpenFile: () => void;
	onEditorChange: (value: string) => void;
	onFormatMarkdown: () => void;
	onFormatJson: () => void;
	onMinifyJson: () => void;
	onContentChange?: (value: string) => void;
	onClearCsv?: () => void;
	onProcessingChange?: (loading: boolean) => void;
}

export function Workspace({
	showEditor,
	content,
	previewContent,
	format,
	isDark,
	isLoading,
	binaryContent,
	onOpenFile,
	onEditorChange,
	onFormatMarkdown,
	onFormatJson,
	onMinifyJson,
	onContentChange,
	onClearCsv,
	onProcessingChange,
}: WorkspaceProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<IconLoader className="animate-spin text-muted-foreground" size={32} />
			</div>
		);
	}

	if (!showEditor) {
		return (
			<PreviewPanel
				content={previewContent}
				format={format}
				isDark={isDark}
				onOpenFile={onOpenFile}
				binaryContent={binaryContent}
				onContentChange={onContentChange}
				onClearCsv={onClearCsv}
				onProcessingChange={onProcessingChange}
			/>
		);
	}

	return (
		<ResizablePanelGroup orientation="horizontal">
			<ResizablePanel defaultSize={50} minSize={20}>
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
			<ResizableHandle withHandle />
			<ResizablePanel defaultSize={50} minSize={20}>
				<PreviewPanel
					content={previewContent}
					format={format}
					isDark={isDark}
					onOpenFile={onOpenFile}
					binaryContent={binaryContent}
					onContentChange={onContentChange}
					onClearCsv={onClearCsv}
					onProcessingChange={onProcessingChange}
				/>
			</ResizablePanel>
		</ResizablePanelGroup>
	);
}
