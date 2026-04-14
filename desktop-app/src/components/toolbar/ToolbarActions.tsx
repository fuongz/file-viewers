import {
	IconLayoutSidebarLeftCollapse,
	IconLayoutSidebarLeftExpand,
	IconMinimize,
	IconTrash,
	IconWand,
} from "@tabler/icons-react";
import type { Format } from "../../types";
import { Button } from "../ui";

interface ToolbarActionsProps {
	format: Format;
	content: string;
	showEditor: boolean;
	onToggleEditor: () => void;
	onFormatMarkdown: () => void;
	onFormatJson: () => void;
	onMinifyJson: () => void;
	onClearCsv: () => void;
}

export function ToolbarActions({
	format,
	content,
	showEditor,
	onToggleEditor,
	onFormatMarkdown,
	onFormatJson,
	onMinifyJson,
	onClearCsv,
}: ToolbarActionsProps) {
	return (
		<div className="toolbar-actions gap-2">
			{format !== "xlsx" && (
				<Button
					onClick={onToggleEditor}
					title={showEditor ? "Hide editor" : "Show editor"}
				>
					{showEditor ? (
						<>
							<IconLayoutSidebarLeftCollapse size={15} stroke={1.5} />
							Hide editor
						</>
					) : (
						<>
							<IconLayoutSidebarLeftExpand size={15} stroke={1.5} />
							Show editor
						</>
					)}
				</Button>
			)}
			{(format === "markdown" || format === "mdx") && content && (
				<Button onClick={onFormatMarkdown}>
					<IconWand size={13} stroke={1.5} />
					Format
				</Button>
			)}
			{format === "json" && content && (
				<>
					<Button onClick={onFormatJson}>
						<IconWand size={13} stroke={1.5} />
						Format
					</Button>
					<Button onClick={onMinifyJson}>
						<IconMinimize size={13} stroke={1.5} />
						Minify
					</Button>
				</>
			)}
			{format === "csv" && content && (
				<Button variant="primary" onClick={onClearCsv}>
					<IconTrash size={13} />
					Clear data
				</Button>
			)}
		</div>
	);
}
