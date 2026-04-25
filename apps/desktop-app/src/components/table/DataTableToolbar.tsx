import { IconDatabase, IconFilter } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { Button, ButtonGroup } from "../ui";
import { SearchInput } from "./SearchInput";
import { SqlInput } from "./SqlInput";
import type { QueryMode } from "./types";

interface DataTableToolbarProps {
	queryMode: QueryMode;
	onFilterMode?: () => void;
	onSqlMode?: () => void;
	hideSqlToggle?: boolean;
	hideFilterToggle?: boolean;
	sqlConnecting?: boolean;
	sqlLoading?: boolean;
	onSqlRun?: (query: string) => void;
	sqlTableName?: string;
	onGlobalFilterChange?: (v: string) => void;
	toolbarLeading?: ReactNode;
}

export function DataTableToolbar({
	queryMode,
	onFilterMode,
	onSqlMode,
	hideSqlToggle,
	hideFilterToggle,
	sqlConnecting,
	sqlLoading,
	onSqlRun,
	sqlTableName = "data",
	onGlobalFilterChange,
	toolbarLeading,
}: DataTableToolbarProps) {
	return (
		<div className="flex gap-2 px-2 py-1 border-b w-full items-center wrap-flex">
			{toolbarLeading}
			{!hideSqlToggle && !hideFilterToggle && (
				<ButtonGroup>
					<Button
						variant={queryMode === "search" ? "default" : "outline"}
						onClick={onFilterMode}
					>
						<IconFilter />
						Filter
					</Button>
					<Button
						variant={queryMode === "sql" ? "default" : "outline"}
						onClick={onSqlMode}
						disabled={sqlConnecting}
					>
						<IconDatabase />
						{sqlConnecting ? "Connecting..." : "SQL"}
					</Button>
				</ButtonGroup>
			)}
			{(queryMode === "search" && !hideFilterToggle) || hideSqlToggle ? (
				<SearchInput onFilter={(v) => onGlobalFilterChange?.(v)} />
			) : (
				<SqlInput
					onRun={onSqlRun ?? (() => {})}
					disabled={sqlLoading}
					tableName={sqlTableName}
				/>
			)}
		</div>
	);
}
