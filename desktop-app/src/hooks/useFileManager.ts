import {
	open as openDialog,
	save as saveDialog,
} from "@tauri-apps/plugin-dialog";
import {
	readFile,
	readTextFile,
	rename,
	writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useRef } from "react";
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
			const fileName = path.split("/").pop() ?? path;

			const isBinary = fmt === "xlsx";
			const binaryContent = isBinary ? await readFile(path) : undefined;
			const fileContent = isBinary ? "" : await readTextFile(path);

			setTabs((prev) => {
				const existing = prev.find((t) => t.path === path);
				const showEditor = fmt !== "csv" && fmt !== "xlsx";
				if (existing) {
					setActiveTabId(existing.id);
					return prev.map((t) =>
						t.path === path
							? {
									...t,
									content: fileContent,
									previewContent: fileContent,
									format: fmt,
									showEditor,
									isDirty: false,
									binaryContent,
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
									showEditor,
									content: fileContent,
									previewContent: fileContent,
									path,
									isDirty: false,
									binaryContent,
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
					binaryContent,
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
					extensions: ["md", "markdown", "mdx", "json", "csv", "xlsx"],
				},
			],
		});
		if (!selected) return;
		await loadFile(selected as string);
	}, [loadFile]);

	const saveFile = useCallback(async () => {
		const tab = tabs.find((t) => t.id === activeTabId);
		if (!tab) return;
		if (tab.path) {
			if (!tab.isDirty) return;
			await writeTextFile(tab.path, tab.content);
		} else {
			const filePath = await saveDialog({
				defaultPath: tab.name,
				filters: [
					{
						name: "Developer Files",
						extensions: ["md", "markdown", "mdx", "json", "csv"],
					},
				],
			});
			if (!filePath) return;
			await writeTextFile(filePath, tab.content);
			setTabs((prev) =>
				prev.map((t) =>
					t.id === activeTabId
						? {
								...t,
								path: filePath,
								name: filePath.split("/").pop() ?? t.name,
								isDirty: false,
							}
						: t,
				),
			);
			return;
		}
		setTabs((prev) =>
			prev.map((t) => (t.id === activeTabId ? { ...t, isDirty: false } : t)),
		);
	}, [tabs, activeTabId, setTabs]);

	const saveAsFile = useCallback(async (): Promise<boolean> => {
		const tab = tabs.find((t) => t.id === activeTabId);
		if (!tab) return false;
		const filePath = await saveDialog({
			defaultPath: tab.name,
			filters: [
				{
					name: "Developer Files",
					extensions: ["md", "markdown", "mdx", "json", "csv"],
				},
			],
		});
		if (!filePath) return false;
		await writeTextFile(filePath, tab.content);
		setTabs((prev) =>
			prev.map((t) =>
				t.id === activeTabId
					? {
							...t,
							path: filePath,
							name: filePath.split("/").pop() ?? t.name,
							isDirty: false,
						}
					: t,
			),
		);
		return true;
	}, [tabs, activeTabId, setTabs]);

	// Restore file-backed tabs on mount
	const loadFileRef = useRef(loadFile);
	loadFileRef.current = loadFile;

	const renameFile = useCallback(
		async (id: string, newName: string) => {
			const tab = tabs.find((t) => t.id === id);
			if (!tab?.path) return;
			try {
				const dir = tab.path.substring(0, tab.path.lastIndexOf("/"));
				const newPath = `${dir}/${newName}`;
				await rename(tab.path, newPath);
				setTabs((prev) =>
					prev.map((t) =>
						t.id === id ? { ...t, name: newName, path: newPath } : t,
					),
				);
			} catch (err) {
				console.error("Failed to rename file:", err);
			}
		},
		[tabs, setTabs],
	);

	return { loadFile, openFile, saveFile, saveAsFile, renameFile, loadFileRef };
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: no need
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
