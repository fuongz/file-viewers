import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	Kbd,
	KbdGroup,
} from "../ui";

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
		<InputGroup>
			<InputGroupInput
				ref={inputRef}
				placeholder="age > 30 AND name = 'Alice'"
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
			<InputGroupAddon align="inline-end">
				<InputGroupButton
					onClick={() => onRun(buildQuery())}
					disabled={disabled}
				>
					<KbdGroup>
						<Kbd>⌘</Kbd>
						<Kbd>enter</Kbd>
					</KbdGroup>
				</InputGroupButton>
			</InputGroupAddon>
		</InputGroup>
	);
}
