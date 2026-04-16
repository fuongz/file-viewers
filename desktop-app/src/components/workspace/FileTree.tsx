import {
	IconLoader2,
	IconPencil,
	IconPlus,
	IconTrash,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { FORMAT_ICONS } from "@/constants";
import { useAppStore } from "../../store";
import type { FileTab } from "../../types";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
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
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../ui";
import { Kbd, KbdGroup } from "../ui/Kbd";

export function FileTree(props: React.ComponentProps<typeof Sidebar>) {
	const {
		tabs,
		activeTabId,
		setActiveTabId,
		closeTabForce,
		addTab,
		renameTab,
	} = useAppStore();

	const isAnyTabBusy = tabs.some((t) => t.isLoading || t.isProcessing);

	const [editingTabId, setEditingTabId] = useState<string | null>(null);
	const [editValue, setEditValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const [deleteConfirmTab, setDeleteConfirmTab] = useState<FileTab | null>(
		null,
	);

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

	function handleDeleteRequest(tab: FileTab) {
		if (tab.isDirty) {
			setDeleteConfirmTab(tab);
		} else {
			closeTabForce(tab.id);
		}
	}

	return (
		<>
			<Sidebar
				collapsible="icon"
				className="top-10 h-[calc(100svh-40px)]!"
				{...props}
			>
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
																<span>{tab.name}</span>
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
														onClick={() => handleDeleteRequest(tab)}
													>
														<IconTrash />
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

			<AlertDialog
				open={deleteConfirmTab !== null}
				onOpenChange={(open) => {
					if (!open) setDeleteConfirmTab(null);
				}}
			>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Close unsaved tab?</AlertDialogTitle>
						<AlertDialogDescription>
							<strong>{deleteConfirmTab?.name}</strong> has unsaved changes.
							Closing it will discard them.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setDeleteConfirmTab(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								if (deleteConfirmTab) closeTabForce(deleteConfirmTab.id);
								setDeleteConfirmTab(null);
							}}
						>
							Close anyway
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
