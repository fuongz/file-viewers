import { SearchIcon, Trash } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { IconLoader2, IconPencil, IconPlus } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { FORMAT_ICONS } from "@/constants";
import { useAppStore } from "../../store";
import type { FileTab } from "../../types";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
	Input,
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../ui";
import { Kbd, KbdGroup } from "../ui/kbd";

export function FileTree(props: React.ComponentProps<typeof Sidebar>) {
	const {
		tabs,
		activeTabId,
		setActiveTabId,
		closeTab,
		addTab,
		renameTab,
		setCommandOpen,
	} = useAppStore();

	const isAnyTabBusy = tabs.some((t) => t.isLoading || t.isProcessing);

	const [editingTabId, setEditingTabId] = useState<string | null>(null);
	const [editValue, setEditValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (!e.shiftKey || e.metaKey || e.ctrlKey) return;
			if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
			const { tabs, reorderTabs } = useAppStore.getState();
			const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
			if (e.key === "ArrowUp" && currentIndex > 0) {
				e.preventDefault();
				reorderTabs(currentIndex, currentIndex - 1);
			} else if (e.key === "ArrowDown" && currentIndex < tabs.length - 1) {
				e.preventDefault();
				reorderTabs(currentIndex, currentIndex + 1);
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [activeTabId]);

	function startRename(tab: FileTab) {
		setEditingTabId(tab.id);
		setEditValue(tab.name);
		setTimeout(() => inputRef.current?.select(), 0);
	}

	function finishRename() {
		if (editingTabId && editValue.trim()) {
			renameTab(editingTabId, editValue.trim());
		}
		setEditingTabId(null);
	}

	return (
		<Sidebar
			collapsible="icon"
			className="top-10 h-[calc(100svh-40px)]!"
			{...props}
		>
			<SidebarHeader className="p-2 group-data-[collapsible=icon]:hidden">
				<button
					type="button"
					onClick={() => setCommandOpen(true)}
					className="flex h-7 w-full items-center gap-1.5 rounded-md border border-input bg-input/20 px-2 text-left transition-colors hover:bg-input/40"
				>
					<HugeiconsIcon
						icon={SearchIcon}
						strokeWidth={2}
						className="size-3.5 shrink-0 text-muted-foreground opacity-50"
					/>
					<span className="flex-1 text-xs text-muted-foreground">
						Search files...
					</span>
					<KbdGroup>
						<Kbd>⌘</Kbd>
						<Kbd>K</Kbd>
					</KbdGroup>
				</button>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="uppercase tracking-wider text-[10px] text-muted-foreground">
						Open Files
					</SidebarGroupLabel>
					<Tooltip>
						<TooltipTrigger
							render={
								<SidebarGroupAction
									onClick={() => {
										if (!isAnyTabBusy) addTab();
									}}
									aria-label="New tab"
								/>
							}
						>
							<IconPlus className="size-3.5" />
						</TooltipTrigger>
						<TooltipContent side="right">
							New tab{" "}
							<KbdGroup>
								<Kbd>⌘</Kbd>
								<Kbd>T</Kbd>
							</KbdGroup>
						</TooltipContent>
					</Tooltip>
					<SidebarGroupContent>
						<SidebarMenu className="space-y-1">
							{tabs.map((tab) => {
								const isEditing = editingTabId === tab.id;
								return (
									<SidebarMenuItem key={tab.id}>
										<ContextMenu>
											<ContextMenuTrigger
												render={
													<div className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center" />
												}
											>
												{isEditing ? (
													<div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:hidden">
														<span className="shrink-0 flex items-center text-muted-foreground [&_svg]:size-[18px]">
															{FORMAT_ICONS[tab.format]}
														</span>
														<Input
															ref={inputRef}
															type="text"
															className="flex-1 min-w-0 h-6 px-1 py-0 text-xs focus:ring-0"
															value={editValue}
															onChange={(e) => setEditValue(e.target.value)}
															onBlur={finishRename}
															onKeyDown={(e) => {
																if (e.key === "Enter") finishRename();
																else if (e.key === "Escape")
																	setEditingTabId(null);
															}}
															onClick={(e) => e.stopPropagation()}
														/>
													</div>
												) : (
													<Tooltip>
														<TooltipTrigger
															render={
																<SidebarMenuButton
																	onClick={() => {
																		if (isAnyTabBusy) return;
																		setActiveTabId(tab.id);
																	}}
																	onDoubleClick={() => {
																		if (isAnyTabBusy) return;
																		startRename(tab);
																	}}
																	isActive={tab.id === activeTabId}
																/>
															}
														>
															{tab.isLoading || tab.isProcessing ? (
																<IconLoader2 className="animate-spin" />
															) : (
																FORMAT_ICONS[tab.format]
															)}
															<span
																className={`flex-1 min-w-0 truncate${tab.isDirty ? " text-amber-700 dark:text-amber-400" : ""}`}
															>
																{tab.name}
															</span>
															{tab.isDirty && (
																<span className="shrink-0 size-2 rounded-full bg-amber-700 dark:bg-amber-500" />
															)}
														</TooltipTrigger>
														<TooltipContent side="right">
															{tab.name}
														</TooltipContent>
													</Tooltip>
												)}
											</ContextMenuTrigger>
											<ContextMenuContent>
												<ContextMenuItem
													disabled={isAnyTabBusy}
													onClick={() => startRename(tab)}
												>
													<IconPencil />
													Rename
												</ContextMenuItem>
												<ContextMenuSeparator />
												<ContextMenuItem
													variant="destructive"
													disabled={isAnyTabBusy}
													onClick={() => closeTab(tab.id)}
												>
													<HugeiconsIcon icon={Trash} />
													Delete
												</ContextMenuItem>
											</ContextMenuContent>
										</ContextMenu>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}
