import { useEffect } from "react";

export function useKeyboard(
	keyMap: Record<string, (id: string) => void | Promise<void>>,
	activeTabId: string,
) {
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (
				(e.metaKey || e.ctrlKey) &&
				keyMap[e.key] !== undefined &&
				keyMap[e.key] !== null &&
				typeof keyMap[e.key] === "function"
			) {
				e.preventDefault();
				keyMap[e.key](activeTabId);
			}
			// if ((e.metaKey || e.ctrlKey) && e.key === "s") {
			// 	e.preventDefault();
			// 	saveFile();
			// }
			// if ((e.metaKey || e.ctrlKey) && e.key === "w") {
			// 	e.preventDefault();
			// 	closeTab(activeTabId);
			// }
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [keyMap, activeTabId]);
}
