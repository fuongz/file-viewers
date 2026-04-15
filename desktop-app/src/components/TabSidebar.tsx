import { IconPlus, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { FORMAT_ICONS } from "../constants";
import type { FileTab } from "../types";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

interface TabSidebarProps {
	tabs: FileTab[];
	activeTabId: string;
	onSelectTab: (id: string) => void;
	onCloseTab: (id: string) => void;
	onAddTab: () => void;
	onReorderTabs: (fromIndex: number, toIndex: number) => void;
	onRenameTab: (id: string, newName: string) => void;
}

export function TabSidebar({
	tabs,
	activeTabId,
	onSelectTab,
	onCloseTab,
	onAddTab,
	onReorderTabs,
	onRenameTab,
}: TabSidebarProps) {
	const [editingTabId, setEditingTabId] = useState<string | null>(null);
	const [editValue, setEditValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	function startRename(tab: FileTab) {
		setEditingTabId(tab.id);
		setEditValue(tab.name);
		setTimeout(() => inputRef.current?.select(), 0);
	}

	function finishRename() {
		if (editingTabId && editValue.trim()) {
			onRenameTab(editingTabId, editValue.trim());
		}
		setEditingTabId(null);
	}

	function handleKeyDown(e: React.KeyboardEvent) {
		if (e.shiftKey) {
			const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
			if (e.key === "ArrowUp" && currentIndex > 0) {
				e.preventDefault();
				onReorderTabs(currentIndex, currentIndex - 1);
			} else if (e.key === "ArrowDown" && currentIndex < tabs.length - 1) {
				e.preventDefault();
				onReorderTabs(currentIndex, currentIndex + 1);
			}
		}
	}

	return (
		<nav
			className="flex flex-col h-full w-full bg-sidebar border-r border-[var(--border)] overflow-hidden"
			onKeyDown={handleKeyDown}
		>
			<div className="flex items-center justify-between px-3 py-2 shrink-0">
				<span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
					Open Files
				</span>
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onAddTab}
					title="New tab (⌘T)"
					className="w-5 h-5"
				>
					<IconPlus size={12} />
				</Button>
			</div>

			<div className="flex-1 overflow-y-auto overflow-x-hidden px-1 pb-1">
				<ul className="flex flex-col gap-0.5">
					{tabs.map((tab) => {
						const isActive = tab.id === activeTabId;
						const isEditing = editingTabId === tab.id;
						return (
							<li key={tab.id} className="group relative">
								{isEditing ? (
									<div className="flex items-center gap-2 px-2 py-1.5">
										<span className="shrink-0 flex items-center text-[var(--text-muted)]">
											{FORMAT_ICONS[tab.format]}
										</span>
										<Input
											ref={inputRef}
											type="text"
											className="flex-1 min-w-0 h-6 px-1 py-0 text-xs border-[var(--accent)] focus:ring-0"
											value={editValue}
											onChange={(e) => setEditValue(e.target.value)}
											onBlur={finishRename}
											onKeyDown={(e) => {
												if (e.key === "Enter") finishRename();
												else if (e.key === "Escape") setEditingTabId(null);
											}}
											onClick={(e) => e.stopPropagation()}
										/>
									</div>
								) : (
									<button
										type="button"
										onClick={() => onSelectTab(tab.id)}
										onDoubleClick={() => startRename(tab)}
										onMouseDown={(e) => {
											if (e.button === 1) {
												e.preventDefault();
												onCloseTab(tab.id);
											}
										}}
										title={tab.path ?? tab.name}
										className={cn(
											"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-left pr-8 transition-colors",
											isActive
												? "bg-accent text-[var(--text-primary)] font-semibold"
												: "text-[var(--text-muted)] hover:bg-[var(--tabs-bg)] hover:text-[var(--text-primary)]",
										)}
									>
										<span
											className={cn(
												"shrink-0 flex items-center [&_svg]:size-[18px]",
												isActive ? "opacity-100" : "opacity-60",
											)}
										>
											{FORMAT_ICONS[tab.format]}
										</span>
										<span
											className={cn(
												"truncate",
												tab.isDirty ? "text-blue-600" : "",
											)}
										>
											{tab.name}
										</span>
										{tab.isDirty && (
											<span className="shrink-0 text-blue-600 font-medium">
												U
											</span>
										)}
									</button>
								)}
								{!isEditing && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											onCloseTab(tab.id);
										}}
										aria-label={`Close ${tab.name}`}
										className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center w-5 h-5 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--tabs-bg)] text-[var(--text-muted)] transition-opacity"
									>
										<IconX size={12} />
									</button>
								)}
							</li>
						);
					})}
				</ul>
			</div>
		</nav>
	);
}
