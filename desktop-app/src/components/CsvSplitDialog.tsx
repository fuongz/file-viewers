import { useState } from "react";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface CsvSplitDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConfirm: (rowsPerFile: number) => void;
	totalRows: number;
}

export function CsvSplitDialog({
	open,
	onOpenChange,
	onConfirm,
	totalRows,
}: CsvSplitDialogProps) {
	const [rowsPerFile, setRowsPerFile] = useState("1000");

	const rows = parseInt(rowsPerFile, 10);
	const isValid = !Number.isNaN(rows) && rows > 0 && rows < totalRows;
	const fileCount = isValid ? Math.ceil(totalRows / rows) : 0;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Split CSV</DialogTitle>
					<DialogDescription>
						Split this CSV file into multiple files with a maximum number of
						rows per file.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Label>Rows per file:</Label>
						<Input
							type="number"
							min="1"
							max={totalRows - 1}
							value={rowsPerFile}
							onChange={(e) => setRowsPerFile(e.target.value)}
							className="w-28"
						/>
					</div>

					{isValid && (
						<p className="text-xs text-[var(--text-muted)]">
							Will create <strong>{fileCount}</strong> file
							{fileCount !== 1 ? "s" : ""} ({totalRows} total rows)
						</p>
					)}

					{!isValid && rowsPerFile !== "" && (
						<p className="text-xs text-destructive">
							Rows per file must be between 1 and {totalRows - 1}
						</p>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={() => onConfirm(rows)} disabled={!isValid}>
						Split
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
