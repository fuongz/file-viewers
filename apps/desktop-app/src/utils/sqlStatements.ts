export interface SqlStatement {
	text: string;
	start: number;
	end: number;
}

/**
 * Splits SQL text into statements on top-level semicolons, ignoring
 * semicolons inside strings, quoted identifiers, and comments.
 */
export function splitSqlStatements(sql: string): SqlStatement[] {
	const statements: SqlStatement[] = [];
	let start = 0;
	let index = 0;

	function push(end: number) {
		const text = sql.slice(start, end);
		const leading = text.length - text.trimStart().length;
		const trimmed = text.trim();
		if (trimmed) {
			const from = start + leading;
			statements.push({
				text: trimmed,
				start: from,
				end: from + trimmed.length,
			});
		}
	}

	while (index < sql.length) {
		const char = sql[index];
		const next = sql[index + 1];

		if (char === "-" && next === "-") {
			const end = sql.indexOf("\n", index);
			index = end === -1 ? sql.length : end + 1;
			continue;
		}
		if (char === "/" && next === "*") {
			const end = sql.indexOf("*/", index + 2);
			index = end === -1 ? sql.length : end + 2;
			continue;
		}
		if (char === "'" || char === '"' || char === "`") {
			index++;
			while (index < sql.length) {
				if (sql[index] === char) {
					if (sql[index + 1] === char) {
						index += 2;
						continue;
					}
					index++;
					break;
				}
				index++;
			}
			continue;
		}
		if (char === "[") {
			const end = sql.indexOf("]", index + 1);
			index = end === -1 ? sql.length : end + 1;
			continue;
		}
		if (char === ";") {
			push(index);
			index++;
			start = index;
			continue;
		}
		index++;
	}
	push(sql.length);
	return statements;
}

/** The statement containing the cursor, or the closest one before it. */
export function statementAtCursor(
	statements: SqlStatement[],
	cursor: number,
): SqlStatement | undefined {
	if (!statements.length) return undefined;
	const containing = statements.find(
		(statement) => cursor >= statement.start && cursor <= statement.end + 1,
	);
	if (containing) return containing;
	const before = [...statements]
		.reverse()
		.find((statement) => cursor > statement.end);
	return before ?? statements[0];
}
