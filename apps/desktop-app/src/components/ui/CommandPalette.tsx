import { IconWorld } from "@tabler/icons-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FORMAT_ICONS, PLATFORM_IS_MAC, TAB_SHORTCUT_COUNT } from "@/constants";
import { useAppStore } from "@/store";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "./command";
import { Kbd } from "./kbd";

interface CommandItemData {
	id: string;
	label: string;
	icon?: ReactNode;
	shortcut?: string;
	action: () => void;
}

interface CommandPaletteProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: CommandItemData[];
	onLoadUrl?: (url: string) => Promise<void>;
}

function isUrl(str: string) {
	return str.startsWith("http://") || str.startsWith("https://");
}

function Shortcut({ keyName }: { keyName: string }) {
	return (
		<CommandShortcut className="shrink-0 tracking-normal">
			<Kbd>
				{PLATFORM_IS_MAC ? "⌘" : "Ctrl+"}
				{keyName}
			</Kbd>
		</CommandShortcut>
	);
}

const resultStyle = "min-h-9 gap-3 text-sm data-selected:bg-primary/12";

export function CommandPalette({
	open,
	onOpenChange,
	items,
	onLoadUrl,
}: CommandPaletteProps) {
	const [search, setSearch] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const { tabs, activeTabId, setActiveTabId } = useAppStore();
	const query = search.trim();
	const needle = query.toLowerCase();
	const filteredItems = items.filter((item) =>
		item.label.toLowerCase().includes(needle),
	);
	const filteredTabs = tabs
		.map((tab, index) => ({ tab, index }))
		.filter(
			({ tab }) =>
				tab.name.toLowerCase().includes(needle) ||
				tab.path?.toLowerCase().includes(needle),
		);
	const showUrl = !!onLoadUrl && isUrl(query);
	const hasResults =
		filteredTabs.length > 0 || filteredItems.length > 0 || showUrl;

	useEffect(() => {
		if (!open) setSearch("");
	}, [open]);

	async function openUrl() {
		if (!onLoadUrl) return;
		onOpenChange(false);
		try {
			await onLoadUrl(query);
		} catch (err) {
			toast.error(
				`Failed to load URL: ${err instanceof Error ? err.message : "Unknown error"}`,
			);
		}
	}

	return (
		<CommandDialog
			open={open}
			onOpenChange={onOpenChange}
			initialFocus={inputRef}
			description="Find open files, run a command, or open a URL."
		>
			<Command
				shouldFilter={false}
				className="max-h-[75dvh] bg-transparent p-0"
			>
				<CommandInput
					ref={inputRef}
					placeholder="Search files or commands…"
					aria-label="Search files or commands"
					value={search}
					onValueChange={setSearch}
				/>
				<CommandList className="min-h-0 max-h-[min(24rem,55dvh)] px-1.5 pb-2">
					{!hasResults && (
						<CommandEmpty>No matching files or commands.</CommandEmpty>
					)}

					{showUrl && (
						<CommandGroup heading="URL">
							<CommandItem
								value="open-url"
								className={resultStyle}
								onSelect={openUrl}
							>
								<IconWorld
									className="text-muted-foreground"
									aria-hidden="true"
								/>
								<span className="min-w-0 flex-1">
									<span className="block">Open URL</span>
									<span
										className="block truncate text-xs text-muted-foreground"
										title={query}
									>
										{query}
									</span>
								</span>
							</CommandItem>
						</CommandGroup>
					)}

					{filteredTabs.length > 0 && (
						<CommandGroup heading="Open files">
							{filteredTabs.map(({ tab, index }) => (
								<CommandItem
									key={tab.id}
									value={`tab-${tab.id}`}
									className={resultStyle}
									onSelect={() => {
										setActiveTabId(tab.id);
										onOpenChange(false);
									}}
								>
									<span
										className="grid size-6 shrink-0 place-items-center rounded-md bg-muted"
										aria-hidden="true"
									>
										{FORMAT_ICONS[tab.format]}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate" title={tab.name}>
											{tab.name}
										</span>
										{(tab.path || tab.id === activeTabId) && (
											<span
												className="block truncate text-xs text-muted-foreground"
												title={tab.path}
											>
												{tab.id === activeTabId &&
													(tab.path ? "Current · " : "Current")}
												{tab.path}
											</span>
										)}
									</span>
									{index < TAB_SHORTCUT_COUNT && (
										<Shortcut keyName={String(index + 1)} />
									)}
								</CommandItem>
							))}
						</CommandGroup>
					)}

					{filteredItems.length > 0 && (
						<CommandGroup heading="Actions">
							{filteredItems.map((item) => (
								<CommandItem
									key={item.id}
									value={item.id}
									className={resultStyle}
									onSelect={() => {
										item.action();
										onOpenChange(false);
									}}
								>
									{item.icon && (
										<span
											className="grid size-6 shrink-0 place-items-center text-muted-foreground"
											aria-hidden="true"
										>
											{item.icon}
										</span>
									)}
									<span className="min-w-0 flex-1 truncate">{item.label}</span>
									{item.shortcut && <Shortcut keyName={item.shortcut} />}
								</CommandItem>
							))}
						</CommandGroup>
					)}
				</CommandList>
				<footer className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t bg-muted/45 px-3 py-2 text-xs text-muted-foreground">
					<span className="inline-flex items-center gap-1">
						<Kbd>↑</Kbd>
						<Kbd>↓</Kbd> Navigate
					</span>
					<span className="inline-flex items-center gap-1">
						<Kbd>Enter</Kbd> Select
					</span>
					<span className="ms-auto inline-flex items-center gap-1">
						<Kbd>Esc</Kbd> Close
					</span>
				</footer>
			</Command>
		</CommandDialog>
	);
}
