import { useRef, useState } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";
import { FORMAT_ICONS } from "../constants";
import type { FileTab } from "../types";

interface FileTabsBarProps {
	tabs: FileTab[];
	activeTabId: string;
	onSelectTab: (id: string) => void;
	onCloseTab: (id: string) => void;
	onAddTab: () => void;
	onReorderTabs: (fromIndex: number, toIndex: number) => void;
	onRenameTab: (id: string, newName: string) => void;
}

export function FileTabsBar({
	tabs,
	activeTabId,
	onSelectTab,
	onCloseTab,
	onAddTab,
	onReorderTabs,
	onRenameTab,
}: FileTabsBarProps) {
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
		if (editingTabId) {
			if (e.key === "Enter") {
				finishRename();
			} else if (e.key === "Escape") {
				setEditingTabId(null);
			}
			return;
		}

		if (e.shiftKey) {
			const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
			if (e.key === "ArrowLeft" && currentIndex > 0) {
				e.preventDefault();
				onReorderTabs(currentIndex, currentIndex - 1);
			} else if (e.key === "ArrowRight" && currentIndex < tabs.length - 1) {
				e.preventDefault();
				onReorderTabs(currentIndex, currentIndex + 1);
			}
		}
	}

	return (
		// biome-ignore lint/a11y/noNoninteractiveElementInteractions: Allow keyboard navigation for tab reordering
		// biome-ignore lint/a11y/noNoninteractiveTabindex: Allow keyboard navigation for tab reordering
		<div
			className="file-tabs-bar"
			tabIndex={0}
			onKeyDown={handleKeyDown}
		>
			{tabs.map((tab) => (
				<div
					key={tab.id}
					role="tab"
					tabIndex={0}
					aria-selected={tab.id === activeTabId}
					className={`file-tab${tab.id === activeTabId ? " active" : ""}`}
					onClick={() => onSelectTab(tab.id)}
					onKeyDown={(ev) => {
						if (ev.key === "Enter" || ev.key === " ") onSelectTab(tab.id);
					}}
					onDoubleClick={() => startRename(tab)}
					onMouseDown={(ev) => {
						if (ev.button === 1) {
							ev.preventDefault();
							onCloseTab(tab.id);
						}
					}}
					title={tab.path ?? tab.name}
				>
					<span className="file-tab-icon">{FORMAT_ICONS[tab.format]}</span>
					{editingTabId === tab.id ? (
						<input
							ref={inputRef}
							type="text"
							className="file-tab-rename-input"
							value={editValue}
							onChange={(ev) => setEditValue(ev.target.value)}
							onBlur={finishRename}
							onKeyDown={(ev) => {
								if (ev.key === "Enter") {
									finishRename();
								} else if (ev.key === "Escape") {
									setEditingTabId(null);
								}
							}}
							onClick={(ev) => ev.stopPropagation()}
						/>
					) : (
						<span className="file-tab-name">{tab.name}</span>
					)}
					{tab.isDirty && (
						<span className="file-tab-dirty" title="Unsaved changes" />
					)}
					<button
						type="button"
						className="file-tab-close"
						tabIndex={-1}
						onClick={(ev) => {
							ev.stopPropagation();
							onCloseTab(tab.id);
						}}
						aria-label={`Close ${tab.name}`}
					>
						<IconX size={11} stroke={2} />
					</button>
				</div>
			))}
			<button
				type="button"
				className="file-tab-add"
				onClick={onAddTab}
				title="New tab"
			>
				<IconPlus size={14} stroke={1.5} />
			</button>
		</div>
	);
}
