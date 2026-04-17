import { Globe02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FORMAT_ICONS } from "@/constants";
import { useAppStore } from "@/store";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "./command";

interface CommandItemData {
	id: string;
	label: string;
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

function HighlightMatch({ text, query }: { text: string; query: string }) {
	if (!query) return <span>{text}</span>;
	const idx = text.toLowerCase().indexOf(query.toLowerCase());
	if (idx === -1) return <span>{text}</span>;
	return (
		<span>
			{text.slice(0, idx)}
			<strong className="font-semibold">
				{text.slice(idx, idx + query.length)}
			</strong>
			{text.slice(idx + query.length)}
		</span>
	);
}

export function CommandPalette({
	open,
	onOpenChange,
	items,
	onLoadUrl,
}: CommandPaletteProps) {
	const [search, setSearch] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const { tabs, setActiveTabId } = useAppStore();

	const filteredItems = items.filter((item) =>
		item.label.toLowerCase().includes(search.toLowerCase()),
	);

	const filteredTabs = search.trim()
		? tabs.filter((tab) =>
				tab.name.toLowerCase().includes(search.toLowerCase()),
			)
		: [];

	const looksLikeUrl = isUrl(search.trim());

	const hasResults =
		filteredTabs.length > 0 || filteredItems.length > 0 || looksLikeUrl;

	useEffect(() => {
		if (open) {
			setSearch("");
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<Command shouldFilter={false} className="bg-transparent">
				<CommandInput
					ref={inputRef}
					placeholder="Search files, commands, or paste a URL..."
					value={search}
					onValueChange={setSearch}
				/>
				<CommandList>
					{!hasResults && <CommandEmpty>No results found.</CommandEmpty>}

					{filteredTabs.length > 0 && (
						<CommandGroup heading="Files">
							{filteredTabs.map((tab) => (
								<CommandItem
									key={`tab-${tab.id}`}
									value={`tab-${tab.id}`}
									onSelect={() => {
										setActiveTabId(tab.id);
										onOpenChange(false);
									}}
								>
									<span className="shrink-0 text-muted-foreground [&_svg]:size-[14px]">
										{FORMAT_ICONS[tab.format]}
									</span>
									<HighlightMatch text={tab.name} query={search} />
									{tab.path && !isUrl(tab.path) && (
										<span className="ml-auto max-w-[160px] truncate text-[0.625rem] text-muted-foreground">
											{tab.path}
										</span>
									)}
								</CommandItem>
							))}
						</CommandGroup>
					)}

					{looksLikeUrl && onLoadUrl && (
						<>
							{filteredTabs.length > 0 && <CommandSeparator />}
							<CommandGroup heading="URL">
								<CommandItem
									value="open-url"
									onSelect={async () => {
										const url = search.trim();
										onOpenChange(false);
										try {
											await onLoadUrl(url);
										} catch (err) {
											toast.error(
												`Failed to load URL: ${err instanceof Error ? err.message : "Unknown error"}`,
											);
										}
									}}
								>
									<HugeiconsIcon
										icon={Globe02Icon}
										strokeWidth={2}
										className="size-3.5 shrink-0 text-muted-foreground"
									/>
									<span className="max-w-xs truncate">{search.trim()}</span>
								</CommandItem>
							</CommandGroup>
						</>
					)}

					{filteredItems.length > 0 && (
						<>
							{(filteredTabs.length > 0 || looksLikeUrl) && (
								<CommandSeparator />
							)}
							<CommandGroup heading="Actions">
								{filteredItems.map((item) => (
									<CommandItem
										key={item.id}
										value={item.id}
										onSelect={() => {
											item.action();
											onOpenChange(false);
										}}
									>
										{item.label}
										{item.shortcut && (
											<CommandShortcut>{item.shortcut}</CommandShortcut>
										)}
									</CommandItem>
								))}
							</CommandGroup>
						</>
					)}
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
