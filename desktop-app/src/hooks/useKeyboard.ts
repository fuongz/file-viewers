import { useEffect } from "react";

export function useKeyboard(
	keyMap: Record<string, (id: string) => void | Promise<void>>,
	activeTabId: string,
	disabled?: boolean,
) {
	useEffect(() => {
		if (disabled) return;

		function handleKeyDown(e: KeyboardEvent) {
			if (e.metaKey || e.ctrlKey) {
				const key = e.shiftKey ? e.key.toUpperCase() : e.key.toLowerCase();
				if (
					keyMap[key] !== undefined &&
					keyMap[key] !== null &&
					typeof keyMap[key] === "function"
				) {
					e.preventDefault();
					keyMap[key](activeTabId);
				}
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [keyMap, activeTabId, disabled]);
}
