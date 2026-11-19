import {
	open as openDialog,
	save as saveDialog,
} from "@tauri-apps/plugin-dialog";
import {
	readFile,
	readTextFile,
	rename,
	stat,
	writeTextFile,
} from "@tauri-apps/plugin-fs";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { canShowEditor, EXT_TO_FORMAT, SQLITE_EXTENSIONS } from "../constants";
import { useAppStore } from "../store";
import type { FileTab } from "../types";
import { createTab } from "./useSession";

/** Modification time in ms, or undefined when it cannot be read. */
export async function diskModifiedAt(
	path: string,
): Promise<number | undefined> {
	try {
		const info = await stat(path);
		return info.mtime?.getTime();
	} catch {
		return undefined;
	}
}

function getSaveOptions(tab: FileTab) {
	const isJsonLines = tab.format === "jsonl";
	return {
		defaultPath:
			isJsonLines && !tab.name.toLowerCase().endsWith(".jsonl")
				? `${tab.name}.jsonl`
				: tab.name,
		filters: [
			{
				name: isJsonLines ? "JSON Lines" : "Developer Files",
				extensions: isJsonLines
					? ["jsonl"]
					: ["md", "markdown", "mdx", "json", "jsonl", "csv"],
			},
		],
	};
}

export function useFileManager() {
	const setTabs = useAppStore((s) => s.setTabs);
	const setActiveTabId = useAppStore((s) => s.setActiveTabId);

	const loadFile = useCallback(
		async (path: string, { previewOnly = false } = {}) => {
			const ext = path.split(".").pop()?.toLowerCase() ?? "";
			const fmt = EXT_TO_FORMAT[ext] ?? "markdown";
			const fileName = path.split(/[/\\]/).pop() ?? path;
			const openedAt = Date.now();

			const existing =
				previewOnly &&
				useAppStore.getState().tabs.find((tab) => tab.path === path);
			if (existing) {
				useAppStore.setState((state) => ({
					activeTabId: existing.id,
					tabs: state.tabs.map((tab) =>
						tab.id === existing.id ? { ...tab, showEditor: false } : tab,
					),
				}));
				return;
			}

			setTabs((prev) => {
				const existing = prev.find((t) => t.path === path);
				const showEditor =
					!previewOnly &&
					canShowEditor(fmt) &&
					fmt !== "csv" &&
					fmt !== "parquet";
				if (existing) {
					setActiveTabId(existing.id);
					return prev.map((t) =>
						t.path === path
							? {
									...t,
									content: "",
									previewContent: "",
									format: fmt,
									showEditor,
									isDirty: false,
									binaryContent: undefined,
									isLoading: true,
									openedAt,
								}
							: t,
					);
				}
				// Use getState() to avoid stale closure on activeTabId
				const currentId = useAppStore.getState().activeTabId;
				const currentTab = prev.find((t) => t.id === currentId);
				if (currentTab && !currentTab.path && !currentTab.content) {
					return prev.map((t) =>
						t.id === currentId
							? {
									...t,
									name: fileName,
									format: fmt,
									showEditor,
									content: "",
									previewContent: "",
									path,
									isDirty: false,
									binaryContent: undefined,
									isLoading: true,
									openedAt,
								}
							: t,
					);
				}
				const newTab = createTab({
					name: fileName,
					format: fmt,
					showEditor,
					content: "",
					previewContent: "",
					path,
					isDirty: false,
					binaryContent: undefined,
					isLoading: true,
					openedAt,
				});
				setActiveTabId(newTab.id);
				return [...prev, newTab];
			});

			try {
				const isBinary = fmt === "xlsx" || fmt === "parquet";
				const binaryContent = isBinary ? await readFile(path) : undefined;
				const fileContent =
					isBinary || fmt === "sqlite" ? "" : await readTextFile(path);
				const modifiedAt = await diskModifiedAt(path);

				const duration = Date.now() - openedAt;
				const MIN_LOADING_TIME = 300;
				const remainingTime = Math.max(0, MIN_LOADING_TIME - duration);

				setTimeout(() => {
					setTabs((prev) =>
						prev.map((t) =>
							t.openedAt === openedAt
								? {
										...t,
										content: fileContent,
										previewContent: fileContent,
										binaryContent,
										isLoading: false,
										diskModifiedAt: modifiedAt,
										hasExternalChange: false,
									}
								: t,
						),
					);
				}, remainingTime);
			} catch {
				setTabs((prev) =>
					prev.map((t) =>
						t.openedAt === openedAt ? { ...t, isLoading: false } : t,
					),
				);
			}
		},
		[setTabs, setActiveTabId],
	);

	const openFile = useCallback(async () => {
		const selected = await openDialog({
			multiple: false,
			filters: [
				{
					name: "Developer Files",
					extensions: [
						"md",
						"markdown",
						"mdx",
						"json",
						"jsonl",
						"csv",
						"xlsx",
						"parquet",
						...SQLITE_EXTENSIONS,
					],
				},
			],
		});
		if (!selected) return;
		await loadFile(selected as string);
	}, [loadFile]);

	const saveFile = useCallback(async () => {
		const { tabs, activeTabId } = useAppStore.getState();
		const tab = tabs.find((t) => t.id === activeTabId);
		if (!tab || tab.format === "sqlite") return;
		if (tab.path) {
			if (!tab.isDirty) return;
			const current = await diskModifiedAt(tab.path);
			if (
				current !== undefined &&
				tab.diskModifiedAt !== undefined &&
				current > tab.diskModifiedAt + 1000
			) {
				setTabs((prev) =>
					prev.map((t) =>
						t.id === activeTabId ? { ...t, hasExternalChange: true } : t,
					),
				);
				toast.warning(
					"File changed on disk. Reload it or keep your version before saving.",
				);
				return;
			}
			await writeTextFile(tab.path, tab.content);
			const written = await diskModifiedAt(tab.path);
			setTabs((prev) =>
				prev.map((t) =>
					t.id === activeTabId
						? {
								...t,
								isDirty: false,
								hasExternalChange: false,
								diskModifiedAt: written,
							}
						: t,
				),
			);
			return;
		}
		const filePath = await saveDialog(getSaveOptions(tab));
		if (!filePath) return;
		await writeTextFile(filePath, tab.content);
		const written = await diskModifiedAt(filePath);
		setTabs((prev) =>
			prev.map((t) =>
				t.id === activeTabId
					? {
							...t,
							path: filePath,
							name: filePath.split(/[/\\]/).pop() ?? t.name,
							isDirty: false,
							hasExternalChange: false,
							diskModifiedAt: written,
						}
					: t,
			),
		);
	}, [setTabs]);

	const saveAsFile = useCallback(async (): Promise<boolean> => {
		const { tabs, activeTabId } = useAppStore.getState();
		const tab = tabs.find((t) => t.id === activeTabId);
		if (!tab || tab.format === "sqlite") return false;
		const filePath = await saveDialog(getSaveOptions(tab));
		if (!filePath) return false;
		await writeTextFile(filePath, tab.content);
		setTabs((prev) =>
			prev.map((t) =>
				t.id === activeTabId
					? {
							...t,
							path: filePath,
							name: filePath.split(/[/\\]/).pop() ?? t.name,
							isDirty: false,
						}
					: t,
			),
		);
		return true;
	}, [setTabs]);

	const loadUrl = useCallback(
		async (url: string) => {
			let parsedUrl: URL;
			try {
				parsedUrl = new URL(url);
			} catch {
				throw new Error("Invalid URL");
			}

			const urlPath = parsedUrl.pathname;
			const ext = urlPath.split(".").pop()?.toLowerCase() ?? "";
			if (
				ext === "parquet" ||
				ext === "xlsx" ||
				SQLITE_EXTENSIONS.includes(ext)
			)
				throw new Error(
					`Opening .${ext} files from URLs is not supported yet.`,
				);
			const fmt = EXT_TO_FORMAT[ext] ?? "markdown";
			const fileName =
				urlPath.split("/").filter(Boolean).pop() ||
				parsedUrl.hostname ||
				"download";
			const showEditor =
				canShowEditor(fmt) && fmt !== "csv" && fmt !== "parquet";
			const openedAt = Date.now();

			setTabs((prev) => {
				const existing = prev.find((t) => t.path === url);
				if (existing) {
					setActiveTabId(existing.id);
					return prev.map((t) =>
						t.path === url
							? {
									...t,
									content: "",
									previewContent: "",
									format: fmt,
									showEditor,
									isDirty: false,
									binaryContent: undefined,
									isLoading: true,
									openedAt,
								}
							: t,
					);
				}
				const currentId = useAppStore.getState().activeTabId;
				const currentTab = prev.find((t) => t.id === currentId);
				if (currentTab && !currentTab.path && !currentTab.content) {
					return prev.map((t) =>
						t.id === currentId
							? {
									...t,
									name: fileName,
									format: fmt,
									showEditor,
									content: "",
									previewContent: "",
									path: url,
									isDirty: false,
									binaryContent: undefined,
									isLoading: true,
									openedAt,
								}
							: t,
					);
				}
				const newTab = createTab({
					name: fileName,
					format: fmt,
					content: "",
					previewContent: "",
					path: url,
					isDirty: false,
					binaryContent: undefined,
					isLoading: true,
					openedAt,
				});
				setActiveTabId(newTab.id);
				return [...prev, newTab];
			});

			try {
				const response = await tauriFetch(url);
				if (!response.ok) throw new Error(`HTTP ${response.status}`);

				const reader = response.body?.getReader();
				if (!reader) throw new Error("No response body");

				const decoder = new TextDecoder();
				let accumulated = "";

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					accumulated += decoder.decode(value, { stream: true });
					const snapshot = accumulated;
					setTabs((prev) =>
						prev.map((t) =>
							t.openedAt === openedAt
								? { ...t, content: snapshot, previewContent: snapshot }
								: t,
						),
					);
				}

				const elapsed = Date.now() - openedAt;
				const delay = Math.max(0, 300 - elapsed);
				setTimeout(() => {
					setTabs((prev) =>
						prev.map((t) =>
							t.openedAt === openedAt ? { ...t, isLoading: false } : t,
						),
					);
				}, delay);
			} catch (err) {
				setTabs((prev) =>
					prev.map((t) =>
						t.openedAt === openedAt ? { ...t, isLoading: false } : t,
					),
				);
				throw err;
			}
		},
		[setTabs, setActiveTabId],
	);

	const reloadFromDisk = useCallback(
		async (id: string) => {
			const tab = useAppStore.getState().tabs.find((t) => t.id === id);
			if (!tab?.path) return;
			try {
				const isBinary = tab.format === "xlsx" || tab.format === "parquet";
				const binaryContent = isBinary ? await readFile(tab.path) : undefined;
				const content =
					isBinary || tab.format === "sqlite"
						? ""
						: await readTextFile(tab.path);
				const modifiedAt = await diskModifiedAt(tab.path);
				setTabs((prev) =>
					prev.map((t) =>
						t.id === id
							? {
									...t,
									...(tab.format === "sqlite"
										? { reloadToken: (t.reloadToken ?? 0) + 1 }
										: {
												content,
												previewContent: content,
												binaryContent,
											}),
									isDirty: false,
									isLoading: false,
									hasExternalChange: false,
									diskModifiedAt: modifiedAt,
								}
							: t,
					),
				);
			} catch (error) {
				toast.error(`Could not reload the file. ${String(error)}`);
			}
		},
		[setTabs],
	);

	const keepLocalFile = useCallback(
		async (id: string) => {
			const tab = useAppStore.getState().tabs.find((t) => t.id === id);
			if (!tab?.path) return;
			const modifiedAt = await diskModifiedAt(tab.path);
			setTabs((prev) =>
				prev.map((t) =>
					t.id === id
						? {
								...t,
								hasExternalChange: false,
								diskModifiedAt: modifiedAt ?? t.diskModifiedAt,
							}
						: t,
				),
			);
		},
		[setTabs],
	);

	const loadFileRef = useRef(loadFile);
	loadFileRef.current = loadFile;

	const renameFile = useCallback(
		async (id: string, newName: string) => {
			const { tabs } = useAppStore.getState();
			const tab = tabs.find((t) => t.id === id);
			if (!tab?.path) return;
			try {
				const lastSep = Math.max(
					tab.path.lastIndexOf("/"),
					tab.path.lastIndexOf("\\"),
				);
				const dir = tab.path.substring(0, lastSep);
				const sep = tab.path[lastSep];
				const newPath = `${dir}${sep}${newName}`;
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
		[setTabs],
	);

	return {
		loadFile,
		openFile,
		saveFile,
		saveAsFile,
		renameFile,
		reloadFromDisk,
		keepLocalFile,
		loadFileRef,
		loadUrl,
	};
}

export function useRestoreSession(
	loadFileRef: React.RefObject<(path: string) => Promise<void>>,
) {
	const initialPathTabs = useAppStore.getState().initialPathTabs;
	const initialActiveTabId = useAppStore.getState().activeTabId;
	const setTabs = useAppStore((s) => s.setTabs);
	const setActiveTabId = useAppStore((s) => s.setActiveTabId);

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
			const cur = useAppStore.getState().activeTabId;
			const nextActiveId = toRemove.includes(cur)
				? (pathTabs.find((t: FileTab) => !toRemove.includes(t.id))?.id ??
					createTab().id)
				: savedActiveTabId;
			setActiveTabId(nextActiveId);
		})();
	}, []);
}
