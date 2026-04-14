import { IconMinimize, IconWand } from "@tabler/icons-react";
import type { Format } from "../types";
import { Button } from "./ui";

interface EditorStatusBarProps {
	format: Format;
	content: string;
	onFormatMarkdown: () => void;
	onFormatJson: () => void;
	onMinifyJson: () => void;
}

export function EditorStatusBar({
	format,
	content,
	onFormatMarkdown,
	onFormatJson,
	onMinifyJson,
}: EditorStatusBarProps) {
	const hasActions =
		((format === "markdown" || format === "mdx") && !!content) ||
		(format === "json" && !!content);

	if (!hasActions) return null;

	return (
		<div className="editor-status-bar">
			{(format === "markdown" || format === "mdx") && content && (
				<Button onClick={onFormatMarkdown}>
					<IconWand size={12} stroke={1.5} />
					Format
				</Button>
			)}
			{format === "json" && content && (
				<>
					<Button onClick={onFormatJson}>
						<IconWand size={12} stroke={1.5} />
						Format
					</Button>
					<Button onClick={onMinifyJson}>
						<IconMinimize size={12} stroke={1.5} />
						Minify
					</Button>
				</>
			)}
		</div>
	);
}
