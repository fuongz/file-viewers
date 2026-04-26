import {
	IconKeyboard,
	IconKeyboardFilled,
	IconLayoutSidebarLeftCollapse,
	IconLayoutSidebarLeftExpandFilled,
	IconPlus,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { Format } from "../../types";
import {
	Button,
	Kbd,
	KbdGroup,
	Toggle,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../ui";

interface ToolbarProps {
	format: Format;
	showEditor: boolean;
	sidebarCollapsed: boolean;
	tabName: string;
	onToggleEditor: () => void;
	onToggleSidebar: () => void;
	onAddTab: () => void;
}

export function Toolbar({
	format,
	showEditor,
	sidebarCollapsed,
	tabName,
	onToggleEditor,
	onToggleSidebar,
	onAddTab,
}: ToolbarProps) {
	return (
		<header
			className="flex items-center h-[40px] flex-shrink-0 border-b px-2 fixed top-0 w-full z-10 bg-background"
			data-tauri-drag-region
		>
			<div className={cn("flex-shrink-0 w-20")} />
			<Tooltip>
				<TooltipTrigger
					render={
						<Toggle
							aria-label="Toggle sidebar"
							variant="default"
							size="icon-md"
							onPressedChange={onToggleSidebar}
							pressed={!sidebarCollapsed}
						/>
					}
				>
					{!sidebarCollapsed ? (
						<IconLayoutSidebarLeftExpandFilled stroke={1} />
					) : (
						<IconLayoutSidebarLeftCollapse stroke={1} />
					)}
				</TooltipTrigger>
				<TooltipContent>
					{!sidebarCollapsed ? "Collapse sidebar" : "Expand sidebar"}
					<KbdGroup>
						<Kbd>⌘</Kbd>
						<Kbd>B</Kbd>
					</KbdGroup>
				</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger
					render={<Button size="icon-lg" onClick={onAddTab} variant="ghost" />}
				>
					<IconPlus stroke={1} />
				</TooltipTrigger>
				<TooltipContent>
					New tab
					<KbdGroup>
						<Kbd>⌘</Kbd>
						<Kbd>T</Kbd>
					</KbdGroup>
				</TooltipContent>
			</Tooltip>
			<div className="flex-1" />
			<span className="font-semibold text-sm">{tabName}</span>
			<div className="flex-1" />
			<div className="flex gap-0.5 items-center">
				{format !== "xlsx" && (
					<Tooltip>
						<TooltipTrigger
							render={
								<Toggle
									aria-label="Toggle sidebar"
									variant="default"
									size="icon-md"
									onPressedChange={onToggleEditor}
									pressed={showEditor}
								/>
							}
						>
							{showEditor ? (
								<IconKeyboardFilled stroke={1} />
							) : (
								<IconKeyboard stroke={1} />
							)}
						</TooltipTrigger>
						<TooltipContent>
							{!showEditor ? "Hide editor" : "Show editor"}
							<KbdGroup>
								<Kbd>⌘</Kbd>
								<Kbd>E</Kbd>
							</KbdGroup>
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</header>
	);
}
