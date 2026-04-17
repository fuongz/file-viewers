import * as duckdb from "@duckdb/duckdb-wasm";
import duckdbEhWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import duckdbMvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckdbEhWasm from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckdbMvpWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useTableState } from "../hooks/useTableState";
import { DataTable, TableSkeleton } from "./table";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui";

interface ParquetPreviewProps {
	binaryContent?: Uint8Array;
	fileName?: string;
	onProcessingChange?: (loading: boolean) => void;
}

const BUNDLES: duckdb.DuckDBBundles = {
	mvp: { mainModule: duckdbMvpWasm, mainWorker: duckdbMvpWorker },
	eh: { mainModule: duckdbEhWasm, mainWorker: duckdbEhWorker },
};

const SQL_IDLE_MS = 120_000;

function rowsFromResult(
	result: import("apache-arrow").Table,
): Record<string, unknown>[] {
	return result
		.toArray()
		.map((r) =>
			Object.fromEntries(
				Object.entries(r.toJSON()).map(([k, v]) => [
					k,
					typeof v === "bigint" ? Number(v) : v,
				]),
			),
		);
}

export function ParquetPreview({ binaryContent }: ParquetPreviewProps) {
	// Persistent DuckDB connection for SQL mode
	const dbRef = useRef<duckdb.AsyncDuckDB | null>(null);
	const connRef = useRef<duckdb.AsyncDuckDBConnection | null>(null);
	const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const {
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
	} = useTableState();

	const [sqlConnecting, setSqlConnecting] = useState(false);
	const [sqlRows, setSqlRows] = useState<Record<string, unknown>[] | null>(
		null,
	);
	const [sqlError, setSqlError] = useState<string | null>(null);
	const [sqlLoading, setSqlLoading] = useState(false);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [data, setData] = useState<Record<string, unknown>[]>([]);

	const deferredData = useDeferredValue(data);
	const isStale = data !== deferredData;

	// ── Teardown helpers ──────────────────────────────────────────────────────

	function clearIdleTimer() {
		if (idleTimerRef.current) {
			clearTimeout(idleTimerRef.current);
			idleTimerRef.current = null;
		}
	}

	async function teardownSqlConn() {
		clearIdleTimer();
		try {
			await connRef.current?.close();
		} catch {
			/* ignore */
		}
		try {
			await dbRef.current?.terminate();
		} catch {
			/* ignore */
		}
		connRef.current = null;
		dbRef.current = null;
	}

	function resetIdleTimer() {
		clearIdleTimer();
		idleTimerRef.current = setTimeout(async () => {
			await teardownSqlConn();
			setQueryMode("search");
			setSqlRows(null);
			setSqlError(null);
		}, SQL_IDLE_MS);
	}

	// ── Initial file load (one-shot DuckDB) ──────────────────────────────────

	useEffect(() => {
		if (!binaryContent) {
			setLoading(false);
			setError("No parquet data available");
			return;
		}

		// Close any open SQL connection when file changes (inlined to avoid unstable deps)
		if (idleTimerRef.current) {
			clearTimeout(idleTimerRef.current);
			idleTimerRef.current = null;
		}
		connRef.current?.close().catch(() => {});
		dbRef.current?.terminate().catch(() => {});
		connRef.current = null;
		dbRef.current = null;
		setQueryMode("search");
		setSqlRows(null);
		setSqlError(null);

		setLoading(true);
		setError(null);

		const content = binaryContent;
		let active = true;

		async function loadData() {
			let db: duckdb.AsyncDuckDB | null = null;
			let conn: duckdb.AsyncDuckDBConnection | null = null;
			try {
				const bundle = await duckdb.selectBundle(BUNDLES);
				const worker = new Worker(bundle.mainWorker!);
				db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
				await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
				if (!active) {
					await db.terminate();
					return;
				}
				await db.registerFileBuffer("data.parquet", new Uint8Array(content));
				conn = await db.connect();
				const result = await conn.query('SELECT * FROM "data.parquet"');
				if (active) {
					setData(rowsFromResult(result));
					setLoading(false);
				}
			} catch (e) {
				if (active) {
					setError((e as Error).message);
					setLoading(false);
				}
			} finally {
				try {
					await conn?.close();
				} catch {
					/* ignore */
				}
				try {
					await db?.terminate();
				} catch {
					/* ignore */
				}
			}
		}

		loadData();
		return () => {
			active = false;
		};
	}, [binaryContent]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
			connRef.current?.close().catch(() => {});
			dbRef.current?.terminate().catch(() => {});
		};
	}, []);

	// ── SQL connection lifecycle ──────────────────────────────────────────────

	async function openSqlMode() {
		if (!binaryContent) return;
		setSqlConnecting(true);
		setSqlError(null);
		try {
			const bundle = await duckdb.selectBundle(BUNDLES);
			const worker = new Worker(bundle.mainWorker!);
			const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
			await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
			await db.registerFileBuffer(
				"data.parquet",
				new Uint8Array(binaryContent),
			);
			const conn = await db.connect();
			await conn.query('CREATE VIEW parquet AS SELECT * FROM "data.parquet"');
			dbRef.current = db;
			connRef.current = conn;
			setQueryMode("sql");
			resetIdleTimer();
		} catch (e) {
			setSqlError((e as Error).message);
			await teardownSqlConn();
		} finally {
			setSqlConnecting(false);
		}
	}

	async function closeSqlMode() {
		await teardownSqlConn();
		setQueryMode("search");
		setSqlRows(null);
		setSqlError(null);
		setSelectedCell(null);
	}

	async function runSqlQuery(query: string) {
		if (!connRef.current) return;
		setSqlLoading(true);
		setSqlError(null);
		resetIdleTimer();
		try {
			const result = await connRef.current.query(query);
			setSqlRows(rowsFromResult(result));
		} catch (e) {
			setSqlError((e as Error).message);
			setSqlRows(null);
		} finally {
			setSqlLoading(false);
		}
	}

	// ── Derived display data ──────────────────────────────────────────────────

	const headers = useMemo(
		() => (deferredData.length === 0 ? [] : Object.keys(deferredData[0])),
		[deferredData],
	);

	const displayData = useMemo(
		() => (queryMode === "sql" && sqlRows ? sqlRows : deferredData),
		[queryMode, sqlRows, deferredData],
	);

	const displayHeaders = useMemo(
		() => (displayData.length > 0 ? Object.keys(displayData[0]) : headers),
		[displayData, headers],
	);

	// ── Early returns ─────────────────────────────────────────────────────────
	if (loading || isStale) return <TableSkeleton />;

	if (error) {
		return (
			<div className="json-error">
				<div className="json-error-badge">Invalid Parquet</div>
				<pre className="json-error-message">{error}</pre>
			</div>
		);
	}

	if (deferredData.length === 0) {
		return (
			<div className="preview-empty">
				<p>No data in parquet file</p>
			</div>
		);
	}

	return (
		<DataTable
			displayData={displayData}
			displayHeaders={displayHeaders}
			queryMode={queryMode}
			onFilterMode={closeSqlMode}
			onSqlMode={queryMode === "sql" ? closeSqlMode : openSqlMode}
			sqlConnecting={sqlConnecting}
			sqlLoading={sqlLoading}
			sqlError={sqlError}
			onSqlRun={runSqlQuery}
			sqlTableName="parquet"
			sorting={sorting}
			onSortingChange={setSorting}
			globalFilter={globalFilter}
			onGlobalFilterChange={setGlobalFilter}
			columnFilters={columnFilters}
			onColumnFiltersChange={setColumnFilters}
			columnSizing={columnSizing}
			onColumnSizingChange={setColumnSizing}
			selectedCell={selectedCell}
			onCellSelect={setSelectedCell}
			statusRight={
				<>
					{sqlConnecting && (
						<span className="csv-statusbar-chip text-[var(--text-muted)]">
							Connecting...
						</span>
					)}
					{queryMode === "sql" && !sqlConnecting && (
						<Tooltip>
							<TooltipTrigger>
								<span className="flex gap-2 bg-emerald-100 px-2 items-center rounded text-emerald-900">
									<span>Connected</span>
								</span>
							</TooltipTrigger>
							<TooltipContent>
								<span>Connected to DuckDB</span>
							</TooltipContent>
						</Tooltip>
					)}
				</>
			}
		/>
	);
}
