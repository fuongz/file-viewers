import { memo } from "react";
import { CsvPreview } from "./CsvPreview";
import { EmptyState } from "./EmptyState";
import { ExcelPreview } from "./ExcelPreview";
import { JsonPreview } from "./JsonPreview";
import { MarkdownPreview } from "./MarkdownPreview";
import { ParquetPreview } from "./ParquetPreview";

export type Format = "markdown" | "json" | "csv" | "mdx" | "xlsx" | "parquet";

interface PreviewPanelProps {
	content: string;
	format: Format;
	isDark: boolean;
	onOpenFile: () => void;
	onContentChange?: (content: string) => void;
	onClearCsv?: () => void;
	binaryContent?: Uint8Array;
	onProcessingChange?: (loading: boolean) => void;
}

export const PreviewPanel = memo(function PreviewPanel({
	content,
	format,
	isDark,
	onOpenFile,
	onContentChange,
	onClearCsv,
	binaryContent,
	onProcessingChange,
}: PreviewPanelProps) {
	if (format !== "xlsx" && format !== "parquet" && !content.trim()) {
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
			) : format === "parquet" ? (
				<ParquetPreview
					binaryContent={binaryContent}
					onProcessingChange={onProcessingChange}
				/>
			) : (
				<CsvPreview
					content={content}
					onContentChange={onContentChange}
					onClearCsv={onClearCsv}
				/>
			)}
		</div>
	);
});
