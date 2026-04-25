import { type RefObject, useEffect } from "react";
import type { DragRange, SelectedCell } from "../types";

interface KeyboardRefs {
	selectedCellRef: RefObject<SelectedCell | null>;
	dragRangeRef: RefObject<DragRange | null>;
	cmdCellsRef: RefObject<Set<string>>;
	displayDataRef: RefObject<Record<string, unknown>[]>;
	displayHeadersRef: RefObject<string[]>;
	onCellChangeRef: RefObject<
		((rowIndex: number, colIndex: number, value: string) => void) | undefined
	>;
	onCellBatchChangeRef: RefObject<
		((changes: Array<[number, number, string]>) => void) | undefined
	>;
	onCellDoubleClickRef: RefObject<
		| ((
				rowIndex: number,
				colIndex: number,
				value: string,
				anchorEl: Element,
		  ) => void)
		| undefined
	>;
	onUndoRef: RefObject<(() => void) | undefined>;
	onRedoRef: RefObject<(() => void) | undefined>;
	setCmdCellsRef: RefObject<React.Dispatch<React.SetStateAction<Set<string>>>>;
	tableContainerRef: RefObject<HTMLDivElement | null>;
}

export function useTableKeyboard({
	selectedCellRef,
	dragRangeRef,
	cmdCellsRef,
	displayDataRef,
	displayHeadersRef,
	onCellChangeRef,
	onCellBatchChangeRef,
	onCellDoubleClickRef,
	onUndoRef,
	onRedoRef,
	setCmdCellsRef,
	tableContainerRef,
}: KeyboardRefs) {
	useEffect(() => {
		const getCellStr = (
			rowIdx: number,
			colIdx: number,
			data: Record<string, unknown>[],
			headers: string[],
		): string => {
			const row = data[rowIdx];
			if (!row) return "";
			const val = row[headers[colIdx]];
			if (val === null || val === undefined) return "";
			if (typeof val === "object") return JSON.stringify(val);
			return String(val);
		};

		const cmdEntries = (cmd: Set<string>): Array<[number, number]> =>
			[...cmd]
				.map((k) => k.split(":").map(Number) as [number, number])
				.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

		const isInputFocused = (): boolean => {
			const active = document.activeElement;
			if (!active) return false;
			return (
				active.tagName === "INPUT" ||
				active.tagName === "TEXTAREA" ||
				(active as HTMLElement).isContentEditable
			);
		};

		const onKeyDown = (e: KeyboardEvent) => {
			if (isInputFocused()) return;

			const cell = selectedCellRef.current;
			const range = dragRangeRef.current;
			const cmd = cmdCellsRef.current;
			const data = displayDataRef.current;
			const headers = displayHeadersRef.current;
			const isMod = e.metaKey || e.ctrlKey;

			if (e.key === "Delete" || e.key === "Backspace") {
				if (cmd.size > 0) {
					e.preventDefault();
					const changes = cmdEntries(cmd).map(
						([r, c]) => [r, c, ""] as [number, number, string],
					);
					onCellBatchChangeRef.current?.(changes);
				} else if (range) {
					e.preventDefault();
					const changes: Array<[number, number, string]> = [];
					for (let r = range.startRow; r <= range.endRow; r++)
						for (let c = range.startCol; c <= range.endCol; c++)
							changes.push([r, c, ""]);
					onCellBatchChangeRef.current?.(changes);
				} else if (cell) {
					e.preventDefault();
					onCellChangeRef.current?.(cell.row - 1, cell.col - 1, "");
				}
				return;
			}

			if (e.key === "Enter" && !isMod) {
				if (cell && !range && cmd.size === 0) {
					e.preventDefault();
					const el = tableContainerRef.current?.querySelector(
						`[data-ctx-row="${cell.row - 1}"][data-ctx-col="${cell.col - 1}"][data-ctx-type="cell"]`,
					);
					if (el && onCellDoubleClickRef.current) {
						onCellDoubleClickRef.current(
							cell.row - 1,
							cell.col - 1,
							cell.value,
							el,
						);
					}
				}
				return;
			}

			if (!isMod) return;

			if (e.key === "z" && !e.shiftKey) {
				e.preventDefault();
				onUndoRef.current?.();
				return;
			}

			if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key === "y") {
				e.preventDefault();
				onRedoRef.current?.();
				return;
			}

			if (e.key === "c") {
				e.preventDefault();
				if (cmd.size > 0) {
					navigator.clipboard.writeText(
						cmdEntries(cmd)
							.map(([r, c]) => getCellStr(r, c, data, headers))
							.join("\t"),
					);
				} else if (range) {
					const lines: string[] = [];
					for (let r = range.startRow; r <= range.endRow; r++) {
						const cols: string[] = [];
						for (let c = range.startCol; c <= range.endCol; c++)
							cols.push(getCellStr(r, c, data, headers));
						lines.push(cols.join("\t"));
					}
					navigator.clipboard.writeText(lines.join("\n"));
				} else if (cell) {
					navigator.clipboard.writeText(cell.value);
				}
				return;
			}

			if (e.key === "x") {
				e.preventDefault();
				if (cmd.size > 0) {
					const entries = cmdEntries(cmd);
					navigator.clipboard.writeText(
						entries.map(([r, c]) => getCellStr(r, c, data, headers)).join("\t"),
					);
					onCellBatchChangeRef.current?.(entries.map(([r, c]) => [r, c, ""]));
					setCmdCellsRef.current(new Set());
				} else if (range) {
					const lines: string[] = [];
					const changes: Array<[number, number, string]> = [];
					for (let r = range.startRow; r <= range.endRow; r++) {
						const cols: string[] = [];
						for (let c = range.startCol; c <= range.endCol; c++) {
							cols.push(getCellStr(r, c, data, headers));
							changes.push([r, c, ""]);
						}
						lines.push(cols.join("\t"));
					}
					navigator.clipboard.writeText(lines.join("\n"));
					onCellBatchChangeRef.current?.(changes);
				} else if (cell) {
					navigator.clipboard.writeText(cell.value);
					onCellChangeRef.current?.(cell.row - 1, cell.col - 1, "");
				}
				return;
			}

			if (e.key === "v") {
				e.preventDefault();
				navigator.clipboard.readText().then((text) => {
					const pasteRows = text
						.replace(/\r\n/g, "\n")
						.split("\n")
						.map((r) => r.split("\t"));
					let startRow: number;
					let startCol: number;
					if (range) {
						startRow = range.startRow;
						startCol = range.startCol;
					} else if (cell) {
						startRow = cell.row - 1;
						startCol = cell.col - 1;
					} else {
						return;
					}
					const currentData = displayDataRef.current;
					const currentHeaders = displayHeadersRef.current;
					const changes: Array<[number, number, string]> = [];
					for (let ri = 0; ri < pasteRows.length; ri++) {
						for (let ci = 0; ci < pasteRows[ri].length; ci++) {
							const rowIdx = startRow + ri;
							const colIdx = startCol + ci;
							if (rowIdx < currentData.length && colIdx < currentHeaders.length)
								changes.push([rowIdx, colIdx, pasteRows[ri][ci]]);
						}
					}
					if (changes.length === 1) {
						onCellChangeRef.current?.(
							changes[0][0],
							changes[0][1],
							changes[0][2],
						);
					} else if (changes.length > 1) {
						onCellBatchChangeRef.current?.(changes);
					}
				});
				return;
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [
		selectedCellRef,
		dragRangeRef,
		cmdCellsRef,
		displayDataRef,
		displayHeadersRef,
		onCellChangeRef,
		onCellBatchChangeRef,
		onCellDoubleClickRef,
		onUndoRef,
		onRedoRef,
		setCmdCellsRef,
		tableContainerRef,
	]);
}
