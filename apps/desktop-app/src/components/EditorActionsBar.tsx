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

export function EditorActionsBar({
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
		<div className="py-1 px-2 h-8 bg-card border-b flex items-center justify-end gap-1">
			{(format === "markdown" || format === "mdx") && content && (
				<Button variant="outline" size="xs" onClick={onFormatMarkdown}>
					<IconWand size={12} stroke={1.5} />
					Format
				</Button>
			)}
			{format === "json" && content && (
				<>
					<Button variant="outline" size="xs" onClick={onFormatJson}>
						<IconWand size={12} stroke={1.5} />
						Format
					</Button>
					<Button variant="outline" size="xs" onClick={onMinifyJson}>
						<IconMinimize size={12} stroke={1.5} />
						Minify
					</Button>
				</>
			)}
		</div>
	);
}
