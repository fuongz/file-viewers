import {
	IconKeyboard,
	IconKeyboardFilled,
	IconPlus,
	IconSearch,
	IconSettings,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { canShowEditor, PLATFORM_IS_MAC } from "@/constants";
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
	busy: boolean;
	onToggleEditor: () => void;
	onAddTab: () => void;
	onCommand: () => void;
	onSettings: () => void;
	children: ReactNode;
}

export function Toolbar({
	format,
	showEditor,
	busy,
	onToggleEditor,
	onAddTab,
	onCommand,
	onSettings,
	children,
}: ToolbarProps) {
	const editorLabel = showEditor ? "Hide editor" : "Show editor";
	const modifier = PLATFORM_IS_MAC ? "⌘" : "Ctrl";
	return (
		<header className="file-toolbar" data-tauri-drag-region>
			{PLATFORM_IS_MAC && (
				<div className="w-18 shrink-0" data-tauri-drag-region />
			)}
			{children}
			<Tooltip>
				<TooltipTrigger
					render={
						<Button
							aria-label="New tab"
							size="icon-sm"
							variant="ghost"
							disabled={busy}
							onClick={onAddTab}
						/>
					}
				>
					<IconPlus aria-hidden="true" />
				</TooltipTrigger>
				<TooltipContent>
					New tab{" "}
					<KbdGroup>
						<Kbd>{modifier}</Kbd>
						<Kbd>T</Kbd>
					</KbdGroup>
				</TooltipContent>
			</Tooltip>
			<div className="min-w-2 flex-1 self-stretch" data-tauri-drag-region />
			<div className="flex shrink-0 items-center gap-0.5">
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label="Search open files"
								size="icon-sm"
								variant="ghost"
								onClick={onCommand}
							/>
						}
					>
						<IconSearch aria-hidden="true" />
					</TooltipTrigger>
					<TooltipContent>
						Search open files{" "}
						<KbdGroup>
							<Kbd>{modifier}</Kbd>
							<Kbd>K</Kbd>
						</KbdGroup>
					</TooltipContent>
				</Tooltip>
				{canShowEditor(format) && (
					<Tooltip>
						<TooltipTrigger
							render={
								<Toggle
									aria-label="Show editor"
									size="icon"
									pressed={showEditor}
									onPressedChange={onToggleEditor}
								/>
							}
						>
							{showEditor ? (
								<IconKeyboardFilled aria-hidden="true" />
							) : (
								<IconKeyboard aria-hidden="true" />
							)}
						</TooltipTrigger>
						<TooltipContent>
							{editorLabel}{" "}
							<KbdGroup>
								<Kbd>{modifier}</Kbd>
								<Kbd>E</Kbd>
							</KbdGroup>
						</TooltipContent>
					</Tooltip>
				)}
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								aria-label="Settings"
								size="icon-sm"
								variant="ghost"
								onClick={onSettings}
							/>
						}
					>
						<IconSettings aria-hidden="true" />
					</TooltipTrigger>
					<TooltipContent>
						Settings{" "}
						<KbdGroup>
							<Kbd>{modifier}</Kbd>
							<Kbd>,</Kbd>
						</KbdGroup>
					</TooltipContent>
				</Tooltip>
			</div>
		</header>
	);
}
