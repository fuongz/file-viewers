import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";

export function useNativeMenu(
	openFile: () => Promise<void>,
	closeTab: (id: string) => void,
	activeTabIdRef: React.RefObject<string>,
	addTab: () => void,
) {
	useEffect(() => {
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-open-file", () => openFile()).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [openFile]);

	const closeTabRef = useRef(closeTab);
	closeTabRef.current = closeTab;
	useEffect(() => {
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-close-tab", () => {
			closeTabRef.current(activeTabIdRef.current);
		}).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [activeTabIdRef.current]);

	const addTabRef = useRef(addTab);
	addTabRef.current = addTab;
	useEffect(() => {
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-new-tab", () => {
			addTabRef.current();
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
