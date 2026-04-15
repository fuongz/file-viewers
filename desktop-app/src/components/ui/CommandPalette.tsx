import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { IconSearch } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);

	const filtered = items.filter((item) =>
		item.label.toLowerCase().includes(search.toLowerCase()),
	);

	useEffect(() => {
		if (open) {
			setSearch("");
			setSelectedIndex(0);
			setTimeout(() => inputRef.current?.focus(), 50);
		}
	}, [open]);

	const handleSelect = useCallback(
		(index: number) => {
			if (index >= 0 && index < filtered.length) {
				filtered[index].action();
				onOpenChange(false);
			}
		},
		[filtered, onOpenChange],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((prev) => Math.max(prev - 1, 0));
			} else if (e.key === "Enter") {
				e.preventDefault();
				handleSelect(selectedIndex);
			} else if (e.key === "Escape") {
				e.preventDefault();
				onOpenChange(false);
			}
		},
		[filtered.length, selectedIndex, handleSelect, onOpenChange],
	);

	return (
		<BaseDialog.Root open={open} onOpenChange={onOpenChange}>
			<BaseDialog.Portal>
				<BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
				<BaseDialog.Popup className="command-palette">
					<BaseDialog.Title className="sr-only">
						Command Palette
					</BaseDialog.Title>
					<div className="command-palette-input">
						<IconSearch
							size={16}
							stroke={1.5}
							className="command-palette-icon"
						/>
						<input
							ref={inputRef}
							type="text"
							placeholder="Type a command..."
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setSelectedIndex(0);
							}}
							onKeyDown={handleKeyDown}
							className="command-palette-search"
						/>
					</div>
					<div className="command-palette-list">
						{filtered.length === 0 ? (
							<div className="command-palette-empty">No results found.</div>
						) : (
							filtered.map((item, index) => (
								<button
									key={item.id}
									type="button"
									className={`command-palette-item${index === selectedIndex ? " selected" : ""}`}
									onClick={() => handleSelect(index)}
									onMouseEnter={() => setSelectedIndex(index)}
								>
									<span className="command-palette-label">{item.label}</span>
									{item.shortcut && (
										<span className="command-palette-shortcut">
											{item.shortcut}
										</span>
									)}
								</button>
							))
						)}
					</div>
				</BaseDialog.Popup>
			</BaseDialog.Portal>
		</BaseDialog.Root>
	);
}
