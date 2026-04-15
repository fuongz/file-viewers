import type {
	ColumnFiltersState,
	ColumnSizingState,
	SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import type { QueryMode, SelectedCell } from "../components/table/types";

/**
 * Shared table UI state for CSV, Parquet, and Excel previews.
 * Pass the returned values directly into DataTable props.
 */
export function useTableState() {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
	const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
	const [queryMode, setQueryMode] = useState<QueryMode>("search");

	return {
		sorting,
		setSorting,
		globalFilter,
		setGlobalFilter,
		columnFilters,
		setColumnFilters,
		columnSizing,
		setColumnSizing,
		selectedCell,
		setSelectedCell,
		queryMode,
		setQueryMode,
	};
}
