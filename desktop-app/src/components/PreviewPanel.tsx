import { memo } from "react";
import { CsvPreview } from "./CsvPreview";
import { EmptyState } from "./EmptyState";
import { ExcelPreview } from "./ExcelPreview";
import { JsonPreview } from "./JsonPreview";
import { MarkdownPreview } from "./MarkdownPreview";

export type Format = "markdown" | "json" | "csv" | "mdx" | "xlsx";

interface PreviewPanelProps {
	content: string;
	format: Format;
	isDark: boolean;
	onOpenFile: () => void;
	onContentChange?: (content: string) => void;
	binaryContent?: Uint8Array;
}

export const PreviewPanel = memo(function PreviewPanel({
	content,
	format,
	isDark,
	onOpenFile,
	onContentChange,
	binaryContent,
}: PreviewPanelProps) {
	if (format !== "xlsx" && !content.trim()) {
		return (
			<div className="preview-panel">
				<EmptyState onOpenFile={onOpenFile} />
			</div>
		);
	}

	return (
		<div className="preview-panel">
			{format === "markdown" ? (
				<MarkdownPreview content={content} isDark={isDark} />
			) : format === "json" ? (
				<JsonPreview content={content} isDark={isDark} />
			) : format === "xlsx" ? (
				<ExcelPreview binaryContent={binaryContent} />
			) : (
				<CsvPreview content={content} onContentChange={onContentChange} />
			)}
		</div>
	);
});
