import { IconPlus, IconX } from "@tabler/icons-react";
import { FORMAT_ICONS } from "../constants";
import type { FileTab } from "../types";

interface FileTabsBarProps {
	tabs: FileTab[];
	activeTabId: string;
	onSelectTab: (id: string) => void;
	onCloseTab: (id: string) => void;
	onAddTab: () => void;
}

export function FileTabsBar({
	tabs,
	activeTabId,
	onSelectTab,
	onCloseTab,
	onAddTab,
}: FileTabsBarProps) {
	return (
		<div className="file-tabs-bar">
			{tabs.map((tab) => (
				<div
					key={tab.id}
					role="tab"
					tabIndex={0}
					aria-selected={tab.id === activeTabId}
					className={`file-tab${tab.id === activeTabId ? " active" : ""}`}
					onClick={() => onSelectTab(tab.id)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") onSelectTab(tab.id);
					}}
					title={tab.path ?? tab.name}
				>
					<span className="file-tab-icon">{FORMAT_ICONS[tab.format]}</span>
					<span className="file-tab-name">{tab.name}</span>
					{tab.isDirty && (
						<span className="file-tab-dirty" title="Unsaved changes" />
					)}
					<button
						type="button"
						className="file-tab-close"
						tabIndex={-1}
						onClick={(e) => {
							e.stopPropagation();
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
