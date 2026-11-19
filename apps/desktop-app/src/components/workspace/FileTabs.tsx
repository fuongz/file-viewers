import { Tabs } from "@base-ui/react/tabs";
import {
	IconArrowLeft,
	IconArrowMerge,
	IconArrowRight,
	IconCopy,
	IconFolder,
	IconLayoutRows,
	IconLoader2,
	IconPencil,
	IconX,
} from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { type FileInfo, stat } from "@tauri-apps/plugin-fs";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FORMAT_ICONS, REVEAL_LABEL, TAB_SHORTCUT_COUNT } from "@/constants";
import { formatBytes } from "@/lib/utils";
import { useAppStore } from "../../store";
import type { FileTab } from "../../types";
import {
	Button,
	ContextMenu,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
} from "../ui";
import { Kbd } from "../ui/kbd";
import { Label } from "../ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "../ui/popover";
import { useFileTabDrag } from "./useFileTabDrag";

interface FileTabsProps {
	busy: boolean;
	onSplitTab: (id: string) => void;
	onMerge: () => void;
}

const fileDateFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
});

function FileTabDetails({ tab }: { tab: FileTab }) {
	const { path } = tab;
	const localPath = path && !/^https?:\/\//i.test(path) ? path : undefined;
	const [fileInfo, setFileInfo] = useState<{
		path: string;
		info: FileInfo | null;
	}>();
	const info =
		fileInfo && fileInfo.path === localPath ? fileInfo.info : undefined;

	useEffect(() => {
		if (!localPath) return;
		let current = true;
		stat(localPath).then(
			(info) => {
				if (current) setFileInfo({ path: localPath, info });
			},
			() => {
				if (current) setFileInfo({ path: localPath, info: null });
			},
		);
		return () => {
			current = false;
		};
	}, [localPath]);

	const size = info
		? formatBytes(info.size)
		: tab.isLoading || (localPath && info === undefined)
			? "Loading…"
			: formatBytes(
					tab.binaryContent?.byteLength ?? new Blob([tab.content]).size,
				);

	function displayDate(date: Date | null | undefined) {
		if (date) return fileDateFormat.format(date);
		return info === undefined ? "…" : "Unavailable";
	}

	return (
		<>
			<PopoverTitle className="wrap-anywhere text-sm font-semibold">
				{tab.name}
			</PopoverTitle>
			<span className="text-muted-foreground">{size}</span>
			{localPath && (
				<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
					<dt>Last edited</dt>
					<dd>{displayDate(info?.mtime)}</dd>
					<dt>Created</dt>
					<dd>{displayDate(info?.birthtime)}</dd>
				</dl>
			)}
			<div className="flex items-start gap-2">
				<span className="min-w-0 flex-1 wrap-anywhere text-muted-foreground">
					{path ?? "Unsaved file"}
				</span>
				{path && (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="-mt-1 shrink-0"
						aria-label="Copy path"
						onClick={async () => {
							try {
								await navigator.clipboard.writeText(path);
								toast.success("Path copied");
							} catch {
								toast.error("Couldn't copy the path");
							}
						}}
					>
						<IconCopy aria-hidden="true" />
					</Button>
				)}
			</div>
		</>
	);
}

export function FileTabs({ busy, onSplitTab, onMerge }: FileTabsProps) {
	const { tabs, activeTabId, closeTab, reorderTabs, renameTab } = useAppStore();
	const [announcement, setAnnouncement] = useState("");
	const [shortcutModifier, setShortcutModifier] = useState<"⌘" | "Ctrl" | null>(
		null,
	);
	const [details, setDetails] = useState<{
		id: string;
		keyboard: boolean;
	} | null>(null);
	const [rename, setRename] = useState<{ id: string; name: string } | null>(
		null,
	);

	function moveTab(id: string, to: number) {
		const { tabs } = useAppStore.getState();
		const from = tabs.findIndex((tab) => tab.id === id);
		if (from === -1 || from === to || to < 0 || to >= tabs.length) return;
		reorderTabs(from, to);
		setAnnouncement(
			`${tabs[from].name} moved to position ${to + 1} of ${tabs.length}.`,
		);
	}

	const { stripRef, draggedId, dropBoundary, dragHandlers } =
		useFileTabDrag(moveTab);

	useEffect(() => {
		if (draggedId) setDetails(null);
	}, [draggedId]);

	useEffect(() => {
		function updateModifier(event: KeyboardEvent) {
			setShortcutModifier(event.metaKey ? "⌘" : event.ctrlKey ? "Ctrl" : null);
		}
		const clearModifier = () => setShortcutModifier(null);
		window.addEventListener("keydown", updateModifier, true);
		window.addEventListener("keyup", updateModifier, true);
		window.addEventListener("blur", clearModifier);
		return () => {
			window.removeEventListener("keydown", updateModifier, true);
			window.removeEventListener("keyup", updateModifier, true);
			window.removeEventListener("blur", clearModifier);
		};
	}, []);

	useEffect(() => {
		stripRef.current
			?.querySelector('[aria-selected="true"]')
			?.scrollIntoView({ block: "nearest", inline: "nearest" });
	}, [activeTabId, stripRef]);

	function closeFileTab(id: string) {
		closeTab(id);
		if (!useAppStore.getState().tabs.some((tab) => tab.id === id)) {
			requestAnimationFrame(() => {
				stripRef.current
					?.querySelector<HTMLElement>('[aria-selected="true"]')
					?.focus();
			});
		}
	}

	function startRename(tab: FileTab) {
		setRename({ id: tab.id, name: tab.name });
	}

	return (
		<>
			<Tabs.List
				ref={stripRef}
				aria-label="Open files"
				className="file-tab-strip"
				{...dragHandlers}
				onWheel={(event) => {
					if (!event.deltaX) event.currentTarget.scrollLeft += event.deltaY;
				}}
			>
				{tabs.map((tab, index) => {
					const tabBusy = tab.isLoading || tab.isProcessing;
					const shortcut = index < TAB_SHORTCUT_COUNT ? index + 1 : null;
					return (
						<ContextMenu key={tab.id}>
							<ContextMenuTrigger
								className="file-tab"
								data-tab-id={tab.id}
								data-selected={tab.id === activeTabId || undefined}
								data-dragged={tab.id === draggedId || undefined}
								data-drop-edge={
									dropBoundary === index
										? "start"
										: dropBoundary === tabs.length && index === tabs.length - 1
											? "end"
											: undefined
								}
							>
								<Popover
									open={!draggedId && details?.id === tab.id}
									onOpenChange={(open, event) => {
										if (
											event.reason === "trigger-press" ||
											(open && draggedId)
										) {
											event.cancel();
											return;
										}
										setDetails((current) =>
											open
												? { id: tab.id, keyboard: false }
												: current?.id === tab.id
													? null
													: current,
										);
									}}
								>
									<Tabs.Tab
										render={
											<PopoverTrigger
												openOnHover={!draggedId}
												delay={400}
												closeDelay={120}
											/>
										}
										value={tab.id}
										className="file-tab-button"
										aria-label={
											tab.isDirty ? `${tab.name}, unsaved changes` : undefined
										}
										aria-busy={tabBusy || undefined}
										aria-keyshortcuts={`Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Delete${shortcut && !busy ? ` Meta+${shortcut} Control+${shortcut}` : ""}`}
										onDoubleClick={() => {
											if (!busy) startRename(tab);
										}}
										onAuxClick={(event) => {
											if (event.button === 1 && !busy) closeFileTab(tab.id);
										}}
										onFocus={(event) => {
											event.currentTarget.scrollIntoView({
												block: "nearest",
												inline: "nearest",
											});
										}}
										onKeyDownCapture={(event) => {
											if (draggedId) return;
											if (event.altKey && event.key === "ArrowDown") {
												event.preventDefault();
												event.stopPropagation();
												setDetails({ id: tab.id, keyboard: true });
												return;
											}
											if (busy) return;
											if (event.key === "Delete") {
												event.preventDefault();
												closeFileTab(tab.id);
											}
											if (
												event.altKey &&
												(event.key === "ArrowLeft" ||
													event.key === "ArrowRight")
											) {
												event.preventDefault();
												event.stopPropagation();
												moveTab(
													tab.id,
													index + (event.key === "ArrowLeft" ? -1 : 1),
												);
											}
										}}
									>
										<span className="file-tab-icon" aria-hidden="true">
											{tabBusy ? (
												<IconLoader2 className="motion-safe:animate-spin" />
											) : (
												FORMAT_ICONS[tab.format]
											)}
										</span>
										<span className="file-tab-label truncate">{tab.name}</span>
										{shortcutModifier && shortcut && !busy && !draggedId && (
											<Kbd
												aria-hidden="true"
												className="ms-auto h-4 min-w-0 shrink-0 whitespace-nowrap bg-background/80 text-foreground"
											>
												{shortcutModifier} {shortcut}
											</Kbd>
										)}
									</Tabs.Tab>
									<PopoverContent
										side="bottom"
										align="start"
										sideOffset={8}
										initialFocus={details?.keyboard === true}
										className="w-max max-w-[min(26rem,calc(100vw-1rem))] gap-1.5 motion-reduce:animate-none!"
									>
										<FileTabDetails tab={tab} />
									</PopoverContent>
								</Popover>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									tabIndex={-1}
									className="file-tab-close focus-visible:border-transparent focus-visible:bg-muted focus-visible:ring-0"
									aria-label={`Close ${tab.name}`}
									data-dirty={tab.isDirty || undefined}
									disabled={busy}
									onClick={() => closeFileTab(tab.id)}
								>
									<IconX aria-hidden="true" />
								</Button>
							</ContextMenuTrigger>
							<ContextMenuContent>
								<ContextMenuGroup>
									<ContextMenuItem
										disabled={busy || !tab.path}
										onClick={() => {
											invoke("reveal_in_finder", { path: tab.path }).catch(
												console.error,
											);
										}}
									>
										<IconFolder />
										{REVEAL_LABEL}
									</ContextMenuItem>
									<ContextMenuItem
										disabled={busy}
										onClick={() => startRename(tab)}
									>
										<IconPencil />
										Rename tab
									</ContextMenuItem>
								</ContextMenuGroup>
								{tab.format === "csv" && (
									<>
										<ContextMenuSeparator />
										<ContextMenuGroup>
											<ContextMenuItem
												disabled={busy}
												onClick={() => onSplitTab(tab.id)}
											>
												<IconLayoutRows />
												Split CSV
											</ContextMenuItem>
											<ContextMenuItem disabled={busy} onClick={onMerge}>
												<IconArrowMerge />
												Merge CSV
											</ContextMenuItem>
										</ContextMenuGroup>
									</>
								)}
								<ContextMenuSeparator />
								<ContextMenuGroup>
									<ContextMenuItem
										disabled={index === 0}
										onClick={() => moveTab(tab.id, index - 1)}
									>
										<IconArrowLeft />
										Move tab left
									</ContextMenuItem>
									<ContextMenuItem
										disabled={index === tabs.length - 1}
										onClick={() => moveTab(tab.id, index + 1)}
									>
										<IconArrowRight />
										Move tab right
									</ContextMenuItem>
								</ContextMenuGroup>
								<ContextMenuSeparator />
								<ContextMenuGroup>
									<ContextMenuItem
										disabled={busy}
										variant="destructive"
										onClick={() => closeFileTab(tab.id)}
									>
										<IconX />
										Close tab
									</ContextMenuItem>
								</ContextMenuGroup>
							</ContextMenuContent>
						</ContextMenu>
					);
				})}
			</Tabs.List>
			<span className="sr-only" role="status">
				{announcement}
			</span>
			<Dialog
				open={rename !== null}
				onOpenChange={(open) => {
					if (!open) setRename(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Rename tab</DialogTitle>
					</DialogHeader>
					<form
						className="grid gap-4"
						onSubmit={(event) => {
							event.preventDefault();
							if (rename?.name.trim()) {
								renameTab(rename.id, rename.name.trim());
								setRename(null);
							}
						}}
					>
						<div className="grid gap-2">
							<Label htmlFor="file-tab-name">Tab name</Label>
							<Input
								id="file-tab-name"
								required
								value={rename?.name ?? ""}
								onChange={(event) => {
									if (rename)
										setRename({ ...rename, name: event.target.value });
								}}
							/>
						</div>
						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => setRename(null)}
							>
								Cancel
							</Button>
							<Button type="submit">Rename</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
