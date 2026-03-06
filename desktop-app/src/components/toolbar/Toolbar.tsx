import type { Format, ThemePreference } from "../../types";
import { FormatTabs } from "./FormatTabs";
import { ThemeMenu } from "./ThemeMenu";
import { ToolbarActions } from "./ToolbarActions";

interface ToolbarProps {
	format: Format;
	content: string;
	showEditor: boolean;
	themePref: ThemePreference;
	themeMenuOpen: boolean;
	themeMenuRef: React.RefObject<HTMLDivElement | null>;
	onFormatChange: (format: Format) => void;
	onToggleEditor: () => void;
	onFormatMarkdown: () => void;
	onFormatJson: () => void;
	onMinifyJson: () => void;
	onClearCsv: () => void;
	onThemeToggle: () => void;
	onThemeSelect: (pref: ThemePreference) => void;
}

export function Toolbar({
	format,
	content,
	showEditor,
	themePref,
	themeMenuOpen,
	themeMenuRef,
	onFormatChange,
	onToggleEditor,
	onFormatMarkdown,
	onFormatJson,
	onMinifyJson,
	onClearCsv,
	onThemeToggle,
	onThemeSelect,
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
			<ThemeMenu
				themePref={themePref}
				themeMenuOpen={themeMenuOpen}
				themeMenuRef={themeMenuRef}
				onToggle={onThemeToggle}
				onSelect={onThemeSelect}
			/>
		</header>
	);
}
