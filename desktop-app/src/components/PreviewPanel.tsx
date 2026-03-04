import { CsvPreview } from "./CsvPreview";
import { EmptyState } from "./EmptyState";
import { JsonPreview } from "./JsonPreview";
import { MarkdownPreview } from "./MarkdownPreview";

export type Format = "markdown" | "json" | "csv";

interface PreviewPanelProps {
	content: string;
	format: Format;
	isDark: boolean;
	onOpenFile: () => void;
	onContentChange?: (content: string) => void;
}

export function PreviewPanel({
	content,
	format,
	isDark,
	onOpenFile,
	onContentChange,
}: PreviewPanelProps) {
	if (!content.trim()) {
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
			) : (
				<CsvPreview content={content} onContentChange={onContentChange} />
			)}
		</div>
	);
}
