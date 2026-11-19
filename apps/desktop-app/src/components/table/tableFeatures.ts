import {
	columnFilteringFeature,
	columnResizingFeature,
	columnSizingFeature,
	columnVisibilityFeature,
	createFilteredRowModel,
	createSortedRowModel,
	filterFns,
	globalFilteringFeature,
	type Row,
	rowSortingFeature,
	sortFns,
	type Table,
	tableFeatures,
} from "@tanstack/react-table";

export const dataTableFeatures = tableFeatures({
	columnFilteringFeature,
	columnSizingFeature,
	columnResizingFeature,
	columnVisibilityFeature,
	globalFilteringFeature,
	rowSortingFeature,
	filteredRowModel: createFilteredRowModel(),
	sortedRowModel: createSortedRowModel(),
	filterFns,
	sortFns,
});

type DataTableFeatures = typeof dataTableFeatures;
export type DataTableRecord = Record<string, unknown>;
export type DataTableInstance = Table<DataTableFeatures, DataTableRecord>;
export type DataTableRow = Row<DataTableFeatures, DataTableRecord>;
