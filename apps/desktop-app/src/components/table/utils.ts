export function getCellStr(
	rowIdx: number,
	colIdx: number,
	data: Record<string, unknown>[],
	headers: string[],
): string {
	const row = data[rowIdx];
	if (!row) return "";
	const val = row[headers[colIdx]];
	if (val === null || val === undefined) return "";
	if (typeof val === "object") return JSON.stringify(val);
	return String(val);
}

export function cmdEntries(cmd: Set<string>): Array<[number, number]> {
	return [...cmd]
		.map((k) => k.split(":").map(Number) as [number, number])
		.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

export function rangeToChanges(
	range: { startRow: number; startCol: number; endRow: number; endCol: number },
	value: string = "",
): Array<[number, number, string]> {
	const changes: Array<[number, number, string]> = [];
	for (let r = range.startRow; r <= range.endRow; r++)
		for (let c = range.startCol; c <= range.endCol; c++)
			changes.push([r, c, value]);
	return changes;
}

export function formatClipboardRange(
	range: { startRow: number; startCol: number; endRow: number; endCol: number },
	data: Record<string, unknown>[],
	headers: string[],
): string {
	const lines: string[] = [];
	for (let r = range.startRow; r <= range.endRow; r++) {
		const cols: string[] = [];
		for (let c = range.startCol; c <= range.endCol; c++)
			cols.push(getCellStr(r, c, data, headers));
		lines.push(cols.join("\t"));
	}
	return lines.join("\n");
}
