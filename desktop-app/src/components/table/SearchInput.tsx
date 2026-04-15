import { IconSearch } from "@tabler/icons-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "../ui";

interface SearchInputProps {
	onFilter: (value: string) => void;
}

export function SearchInput({ onFilter }: SearchInputProps) {
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const id = setTimeout(() => onFilter(value), 300);
		return () => clearTimeout(id);
	}, [value, onFilter]);

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
		<div className="csv-search-wrapper w-full flex-1">
			<IconSearch size={11} className="csv-search-icon" />
			<Input
				ref={inputRef}
				className="flex-1 w-full font-mono text-xs pl-7"
				placeholder="Find"
				value={value}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setValue(e.target.value)
				}
			/>
		</div>
	);
}
