import { listen } from "@tauri-apps/api/event";
import { relaunch } from "@tauri-apps/plugin-process";
import { useEffect, useRef } from "react";
import { useAppStore } from "../store";

export function useNativeMenu(
	openFile: () => Promise<void>,
	saveFile: () => Promise<void>,
	openSettings: () => void,
	clearStorage: () => void,
	checkForUpdates: () => void,
	disabled?: boolean,
) {
	const addTab = useAppStore((s) => s.addTab);
	const closeTab = useAppStore((s) => s.closeTab);

	const openFileRef = useRef(openFile);
	openFileRef.current = openFile;
	useEffect(() => {
		if (disabled) return;
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-open-file", () => openFileRef.current()).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [disabled]);

	const closeTabRef = useRef(closeTab);
	closeTabRef.current = closeTab;
	useEffect(() => {
		if (disabled) return;
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-close-tab", () => {
			closeTabRef.current(useAppStore.getState().activeTabId);
		}).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [disabled]);

	const addTabRef = useRef(addTab);
	addTabRef.current = addTab;
	useEffect(() => {
		if (disabled) return;
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
	}, [disabled]);

	const saveFileRef = useRef(saveFile);
	saveFileRef.current = saveFile;
	useEffect(() => {
		if (disabled) return;
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-save", () => {
			saveFileRef.current();
		}).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [disabled]);

	const openSettingsRef = useRef(openSettings);
	openSettingsRef.current = openSettings;
	useEffect(() => {
		if (disabled) return;
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-settings", () => {
			openSettingsRef.current();
		}).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [disabled]);

	const clearStorageRef = useRef(clearStorage);
	clearStorageRef.current = clearStorage;
	useEffect(() => {
		if (disabled) return;
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-clear-storage", () => {
			clearStorageRef.current();
		}).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [disabled]);

	const checkForUpdatesRef = useRef(checkForUpdates);
	checkForUpdatesRef.current = checkForUpdates;
	useEffect(() => {
		if (disabled) return;
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-check-updates", () => {
			checkForUpdatesRef.current();
		}).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [disabled]);

	useEffect(() => {
		if (disabled) return;
		let cancelled = false;
		let unlisten: (() => void) | null = null;
		listen("menu-restart", () => {
			relaunch();
		}).then((fn) => {
			if (cancelled) fn();
			else unlisten = fn;
		});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	}, [disabled]);
}
