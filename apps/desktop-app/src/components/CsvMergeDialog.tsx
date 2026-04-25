import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { useState } from "react";
import type { FileTab } from "../types";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";

interface CsvMergeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (selectedIds: string[], includeHeaders: boolean) => void;
	csvTabs: FileTab[];
}

export function CsvMergeDialog({
	open,
	onOpenChange,
	onConfirm,
	csvTabs,
}: CsvMergeDialogProps) {
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		new Set(csvTabs.filter((t) => t.format === "csv").map((t) => t.id)),
	);
	const [includeHeaders, setIncludeHeaders] = useState(true);

	const toggle = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const move = (id: string, dir: -1 | 1) => {
		const arr = csvTabs.filter((t) => selectedIds.has(t.id));
		const idx = arr.findIndex((t) => t.id === id);
		const newIdx = idx + dir;
		if (newIdx < 0 || newIdx >= arr.length) return;
		[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
		setSelectedIds(new Set(arr.map((t) => t.id)));
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Merge CSV</DialogTitle>
					<DialogDescription>
						Select CSV tabs to merge into a single file.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<label className="flex items-center gap-2 text-xs cursor-pointer">
						<input
							type="checkbox"
							checked={includeHeaders}
							onChange={(e) => setIncludeHeaders(e.target.checked)}
							className="accent-primary"
						/>
						Include headers from all files (recommended when files share the
						same header row)
					</label>

					<div className="space-y-1">
						<p className="text-xs font-medium text-[var(--text-muted)]">
							CSV Tabs to Merge
						</p>
						<div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
							{csvTabs.length === 0 && (
								<p className="text-xs text-[var(--text-muted)] text-center py-2">
									No CSV tabs open
								</p>
							)}
							{csvTabs.map((tab) => (
								<div
									key={tab.id}
									className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--bg-toolbar)]"
								>
									<input
										type="checkbox"
										checked={selectedIds.has(tab.id)}
										onChange={() => toggle(tab.id)}
										className="accent-primary"
									/>
									<span className="flex-1 text-xs truncate">{tab.name}</span>
									{selectedIds.has(tab.id) && (
										<div className="flex gap-0.5">
											<Button
												size="icon-xs"
												variant="ghost"
												onClick={() => move(tab.id, -1)}
												title="Move up"
											>
												<IconArrowUp />
											</Button>
											<Button
												size="icon-xs"
												variant="ghost"
												onClick={() => move(tab.id, 1)}
												title="Move down"
											>
												<IconArrowDown />
											</Button>
										</div>
									)}
								</div>
							))}
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={() => onConfirm(Array.from(selectedIds), includeHeaders)}
						disabled={selectedIds.size < 2}
					>
						Merge ({selectedIds.size})
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
