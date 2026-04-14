import { IconSettings } from "@tabler/icons-react";
import type { Format } from "../../types";
import { Button } from "../ui";
import { FormatTabs } from "./FormatTabs";
import { ToolbarActions } from "./ToolbarActions";

interface ToolbarProps {
	format: Format;
	content: string;
	showEditor: boolean;
	onFormatChange: (format: Format) => void;
	onToggleEditor: () => void;
	onFormatMarkdown: () => void;
	onFormatJson: () => void;
	onMinifyJson: () => void;
	onClearCsv: () => void;
	onOpenSettings: () => void;
}

export function Toolbar({
	format,
	content,
	showEditor,
	onFormatChange,
	onToggleEditor,
	onFormatMarkdown,
	onFormatJson,
	onMinifyJson,
	onClearCsv,
	onOpenSettings,
}: ToolbarProps) {
	return (
		<header className="toolbar" data-tauri-drag-region>
			<div className="toolbar-spacer" />
			<FormatTabs value={format} onChange={onFormatChange} />
			<ToolbarActions
				format={format}
				content={content}
				showEditor={showEditor}
				onToggleEditor={onToggleEditor}
				onFormatMarkdown={onFormatMarkdown}
				onFormatJson={onFormatJson}
				onMinifyJson={onMinifyJson}
				onClearCsv={onClearCsv}
			/>
			<Button onClick={onOpenSettings} title="Settings (Cmd+,)">
				<IconSettings size={13} stroke={1.5} />
				Settings
			</Button>
		</header>
	);
}
