export type QueryMode = "search" | "sql";

export interface SelectedCell {
	row: number; // 1-based
	col: number; // 1-based
	value: string;
}
