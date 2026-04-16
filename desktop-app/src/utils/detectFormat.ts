import type { Format } from "../components/PreviewPanel";

export function detectFormat(content: string): Format {
	const trimmed = content.trimStart();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json";
	const lines = content.split("\n").filter((l) => l.trim());
	if (lines.length >= 2) {
		const counts = lines.map((l) => (l.match(/,/g) ?? []).length);
		if (counts[0] >= 1 && counts.every((c) => c === counts[0])) return "csv";
	}
	return "markdown";
}
