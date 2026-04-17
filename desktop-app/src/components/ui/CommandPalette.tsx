import { useEffect, useRef, useState } from "react";
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
}

export function CommandPalette({
	open,
	onOpenChange,
	items,
}: CommandPaletteProps) {
	const [search, setSearch] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const filtered = items.filter((item) =>
		item.label.toLowerCase().includes(search.toLowerCase()),
	);

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
					placeholder="Type a command..."
					value={search}
					onValueChange={setSearch}
				/>
				<CommandList>
					{filtered.length === 0 ? (
						<CommandEmpty>No results found.</CommandEmpty>
					) : (
						<CommandGroup heading="Actions">
							{filtered.map((item) => (
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
					)}
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
