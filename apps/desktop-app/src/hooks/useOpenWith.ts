import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

export function useOpenWith(loadFile: (path: string) => Promise<void>) {
	const loadFileRef = useRef(loadFile);
	loadFileRef.current = loadFile;

	useEffect(() => {
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen<string[]>("open-with-files", (event) => {
			for (const path of event.payload) {
				loadFileRef.current(path);
			}
		}).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, []);
}
