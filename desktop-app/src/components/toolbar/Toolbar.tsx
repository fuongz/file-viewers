import { IconSettings } from "@tabler/icons-react";
import type { Format } from "../../types";
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
			<button
				type="button"
				className="toolbar-btn"
				onClick={onOpenSettings}
				title="Settings (Cmd+,)"
			>
				<IconSettings size={16} stroke={1.5} />
				<span>Settings</span>
			</button>
		</header>
	);
}
