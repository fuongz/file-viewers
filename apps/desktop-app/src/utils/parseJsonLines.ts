export function parseJsonLines(content: string): unknown[] {
	const lines = content.replace(/^\uFEFF/, "").split("\n");
	const records: unknown[] = [];

	for (const [index, line] of lines.entries()) {
		if (!line.trim()) continue;
		try {
			records.push(JSON.parse(line));
		} catch (error) {
			throw new Error(`Line ${index + 1}: ${(error as Error).message}`);
		}
	}

	return records;
}
