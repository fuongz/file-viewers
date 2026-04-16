import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect } from "react";
import { EXT_TO_FORMAT } from "../constants";
import { useAppStore } from "../store";

export function useDragDrop(loadFile: (path: string) => Promise<void>) {
	const setIsDragOver = useAppStore((s) => s.setIsDragOver);

	useEffect(() => {
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		getCurrentWebview()
			.onDragDropEvent(async (event) => {
				const { type } = event.payload;
				if (type === "enter" || type === "over") {
					setIsDragOver(true);
				} else if (type === "drop") {
					setIsDragOver(false);
					for (const path of event.payload.paths) {
						const ext = path.split(".").pop()?.toLowerCase() ?? "";
						if (EXT_TO_FORMAT[ext]) {
							await loadFile(path);
							break;
						}
					}
				} else {
					setIsDragOver(false);
				}
			})
			.then((fn) => {
				if (cancelled) fn();
				else unlisten = fn;
			});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [loadFile, setIsDragOver]);
}
