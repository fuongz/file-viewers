import { IconPlayerPlay } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Button, Input } from "../ui";

interface SqlInputProps {
	onRun: (query: string) => void;
	disabled?: boolean;
	/** Table name used in the auto-generated query (e.g. "csv", "parquet") */
	tableName?: string;
}

export function SqlInput({
	onRun,
	disabled,
	tableName = "data",
}: SqlInputProps) {
	const [condition, setCondition] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	function buildQuery() {
		const trimmed = condition.trim();
		return trimmed
			? `SELECT * FROM ${tableName} WHERE ${trimmed}`
			: `SELECT * FROM ${tableName}`;
	}

	// ⌘F / Ctrl+F focuses this input when it is mounted
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				inputRef.current?.focus();
				inputRef.current?.select();
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	return (
		<div className="csv-sql-wrapper gap-2">
			<Input
				ref={inputRef}
				className="flex-1 w-full font-mono text-xs"
				placeholder="age > 30 AND name = 'Alice'  (⌘↵)"
				value={condition}
				disabled={disabled}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setCondition(e.target.value)
				}
				onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						onRun(buildQuery());
					}
				}}
				spellCheck={false}
			/>
			<Button onClick={() => onRun(buildQuery())} disabled={disabled}>
				<IconPlayerPlay size={11} />
				Run
			</Button>
		</div>
	);
}
