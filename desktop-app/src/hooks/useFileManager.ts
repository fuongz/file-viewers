import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { EXT_TO_FORMAT } from "../constants";
import type { FileTab } from "../types";
import { createTab } from "./useSession";

interface UseFileManagerArgs {
	tabs: FileTab[];
	activeTabId: string;
	setTabs: Dispatch<SetStateAction<FileTab[]>>;
	setActiveTabId: Dispatch<SetStateAction<string>>;
	activeTabIdRef: React.RefObject<string>;
}

export function useFileManager({
	tabs,
	activeTabId,
	setTabs,
	setActiveTabId,
	activeTabIdRef,
}: UseFileManagerArgs) {
	const loadFile = useCallback(
		async (path: string) => {
			const ext = path.split(".").pop()?.toLowerCase() ?? "";
			const fmt = EXT_TO_FORMAT[ext] ?? "markdown";
			const fileContent = await readTextFile(path);
			const fileName = path.split("/").pop() ?? path;

			setTabs((prev) => {
				const existing = prev.find((t) => t.path === path);
				if (existing) {
					setActiveTabId(existing.id);
					return prev.map((t) =>
						t.path === path
							? {
									...t,
									content: fileContent,
									previewContent: fileContent,
									format: fmt,
									isDirty: false,
								}
							: t,
					);
				}
				const currentId = activeTabIdRef.current;
				const currentTab = prev.find((t) => t.id === currentId);
				if (currentTab && !currentTab.path && !currentTab.content) {
					return prev.map((t) =>
						t.id === currentId
							? {
									...t,
									name: fileName,
									format: fmt,
									content: fileContent,
									previewContent: fileContent,
									path,
									isDirty: false,
								}
							: t,
					);
				}
				const newTab = createTab({
					name: fileName,
					format: fmt,
					content: fileContent,
					previewContent: fileContent,
					path,
					isDirty: false,
				});
				setActiveTabId(newTab.id);
				return [...prev, newTab];
			});
		},
		[setTabs, setActiveTabId, activeTabIdRef],
	);

	const openFile = useCallback(async () => {
		const selected = await openDialog({
			multiple: false,
			filters: [
				{
					name: "Developer Files",
					extensions: ["md", "markdown", "mdx", "json", "csv"],
				},
			],
		});
		if (!selected) return;
		await loadFile(selected as string);
	}, [loadFile]);

	const saveFile = useCallback(async () => {
		const tab = tabs.find((t) => t.id === activeTabId);
		if (!tab || !tab.isDirty) return;
		if (tab.path) {
			await writeTextFile(tab.path, tab.content);
		}
		setTabs((prev) =>
			prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t)),
		);
	}, [tabs, activeTabId, setTabs]);

	// Restore file-backed tabs on mount
	const loadFileRef = useRef(loadFile);
	loadFileRef.current = loadFile;

	return { loadFile, openFile, saveFile, loadFileRef };
}

export function useRestoreSession(
	initialPathTabs: FileTab[],
	initialActiveTabId: string,
	loadFileRef: React.RefObject<(path: string) => Promise<void>>,
	setTabs: Dispatch<SetStateAction<FileTab[]>>,
	setActiveTabId: Dispatch<SetStateAction<string>>,
) {
	const initialPathTabsRef = useRef(initialPathTabs);
	const initialActiveTabIdRef = useRef(initialActiveTabId);

	useEffect(() => {
		const pathTabs = initialPathTabsRef.current;
		if (!pathTabs.length) return;
		const savedActiveTabId = initialActiveTabIdRef.current;
		(async () => {
			const toRemove: string[] = [];
			for (const tab of pathTabs) {
				try {
					await loadFileRef.current(tab.path as string);
				} catch {
					toRemove.push(tab.id);
				}
			}
			if (toRemove.length) {
				setTabs((prev) => {
					const remaining = prev.filter((t) => !toRemove.includes(t.id));
					return remaining.length ? remaining : [createTab()];
				});
			}
			setActiveTabId((cur) =>
				toRemove.includes(cur)
					? (pathTabs.find((t) => !toRemove.includes(t.id))?.id ??
						createTab().id)
					: savedActiveTabId,
			);
		})();
	}, []);
}
