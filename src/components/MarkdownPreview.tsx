import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
	content: string;
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
	if (!content.trim()) {
		return (
			<div className="preview-empty">
				<p>Start typing Markdown in the editor...</p>
			</div>
		);
	}

	return (
		<div className="markdown-body">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeHighlight]}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
