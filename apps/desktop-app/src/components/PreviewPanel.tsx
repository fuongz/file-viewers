import { memo } from "react";
import { CsvPreview } from "./CsvPreview";
import { EmptyState } from "./EmptyState";
import { ExcelPreview } from "./ExcelPreview";
import { JsonPreview } from "./JsonPreview";
import { MarkdownPreview } from "./MarkdownPreview";
import { ParquetPreview } from "./ParquetPreview";
import { SqlitePreview } from "./SqlitePreview";

export type Format =
	| "markdown"
	| "json"
	| "jsonl"
	| "csv"
	| "mdx"
	| "xlsx"
	| "parquet"
	| "sqlite";

interface PreviewPanelProps {
	content: string;
	format: Format;
	isDark: boolean;
	onOpenFile: () => void;
	onContentChange?: (content: string) => void;
	onClearCsv?: () => void;
	onSplitCsv?: () => void;
	onMergeCsv?: () => void;
	binaryContent?: Uint8Array;
	path?: string;
	externalRevision?: number;
	onProcessingChange?: (loading: boolean) => void;
}

export const PreviewPanel = memo(function PreviewPanel({
	content,
	format,
	isDark,
	onOpenFile,
	onContentChange,
	onClearCsv,
	onSplitCsv,
	onMergeCsv,
	binaryContent,
	path,
	externalRevision,
	onProcessingChange,
}: PreviewPanelProps) {
	if (format === "sqlite") {
		return (
			<div className="preview-panel">
				<SqlitePreview
					key={path}
					path={path}
					externalRevision={externalRevision}
				/>
			</div>
		);
	}

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
			) : format === "json" || format === "jsonl" ? (
				<JsonPreview content={content} format={format} />
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
					onSplitCsv={onSplitCsv}
					onMergeCsv={onMergeCsv}
				/>
			)}
		</div>
	);
});
