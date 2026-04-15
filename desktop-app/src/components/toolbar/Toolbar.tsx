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
	sidebarCollapsed: boolean;
	tabName: string;
	onToggleEditor: () => void;
	onToggleSidebar: () => void;
	onOpenSettings: () => void;
}

export function Toolbar({
	format,
	showEditor,
	sidebarCollapsed,
	tabName,
	onToggleEditor,
	onToggleSidebar,
	onOpenSettings,
}: ToolbarProps) {
	return (
		<header className="toolbar" data-tauri-drag-region>
			<div className="toolbar-spacer" />
			<Button
				variant="toolbar"
				onClick={onToggleSidebar}
				title={sidebarCollapsed ? "Show sidebar (⌘B)" : "Hide sidebar (⌘B)"}
			>
				{sidebarCollapsed ? (
					<>
						<IconLayoutSidebarLeftExpand size={15} stroke={1.5} />
						Show sidebar
					</>
				) : (
					<>
						<IconLayoutSidebarLeftCollapse size={15} stroke={1.5} />
						Hide sidebar
					</>
				)}
			</Button>
			<div className="toolbar-drag-fill" />
			<span className="toolbar-tab-name">{tabName}</span>
			<div className="toolbar-drag-fill" />
			{format !== "xlsx" && (
				<Button
					onClick={onToggleEditor}
					title={showEditor ? "Hide editor" : "Show editor"}
					variant="toolbar"
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
