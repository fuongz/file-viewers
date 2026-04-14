import {
	IconLayoutSidebarLeftCollapse,
	IconLayoutSidebarLeftExpand,
	IconSettings,
} from "@tabler/icons-react";
import type { Format } from "../../types";
import { Button } from "../ui";

interface ToolbarProps {
	format: Format;
	showEditor: boolean;
	onToggleEditor: () => void;
	onOpenSettings: () => void;
}

export function Toolbar({
	format,
	showEditor,
	onToggleEditor,
	onOpenSettings,
}: ToolbarProps) {
	return (
		<header className="toolbar" data-tauri-drag-region>
			<div className="toolbar-spacer" />
			{format !== "xlsx" && (
				<Button
					onClick={onToggleEditor}
					title={showEditor ? "Hide editor" : "Show editor"}
					className="toolbar-icon-btn"
				>
					{showEditor ? (
						<IconLayoutSidebarLeftCollapse size={15} stroke={1.5} />
					) : (
						<IconLayoutSidebarLeftExpand size={15} stroke={1.5} />
					)}
				</Button>
			)}
			<div className="toolbar-drag-fill" />
			<Button
				onClick={onOpenSettings}
				title="Settings (Cmd+,)"
				className="toolbar-icon-btn"
			>
				<IconSettings size={15} stroke={1.5} />
			</Button>
		</header>
	);
}
