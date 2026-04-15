import { useCallback, useState } from "react";
import type { FileTab } from "../types";
import { createTab, readStoredSession } from "./useSession";

export function useTabs() {
	const storedSession = readStoredSession();
	const initialTabs = storedSession?.tabs ?? [createTab()];

	const [tabs, setTabs] = useState<FileTab[]>(initialTabs);
	const [activeTabId, setActiveTabId] = useState<string>(
		storedSession?.activeTabId ?? initialTabs[0].id,
	);
	const [closeConfirmTabId, setCloseConfirmTabId] = useState<string | null>(
		null,
	);

	const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

	const updateActiveTab = useCallback(
		(updates: Partial<Omit<FileTab, "id">>) => {
			setTabs((prev) =>
				prev.map((t) => (t.id === activeTabId ? { ...t, ...updates } : t)),
			);
		},
		[activeTabId],
	);

	const addTab = useCallback(() => {
		const t = createTab();
		setTabs((prev) => [...prev, t]);
		setActiveTabId(t.id);
	}, []);

	const closeTabForce = useCallback(
		(id: string) => {
			setTabs((prev) => {
				if (prev.length === 1) return prev;
				const idx = prev.findIndex((t) => t.id === id);
				const next = prev.filter((t) => t.id !== id);
				if (id === activeTabId) {
					setActiveTabId(next[Math.min(idx, next.length - 1)].id);
				}
				return next;
			});
		},
		[activeTabId],
	);

	const closeTab = useCallback(
		(id: string) => {
			const tab = tabs.find((t) => t.id === id);
			if (tab?.isDirty) {
				setCloseConfirmTabId(id);
			} else {
				closeTabForce(id);
			}
		},
		[tabs, closeTabForce],
	);

	const reorderTabs = useCallback(
		(fromIndex: number, toIndex: number) => {
			setTabs((prev) => {
				const newTabs = [...prev];
				const [removed] = newTabs.splice(fromIndex, 1);
				newTabs.splice(toIndex, 0, removed);
				return newTabs;
			});
		},
		[],
	);

	const renameTab = useCallback(
		(id: string, newName: string) => {
			setTabs((prev) =>
				prev.map((t) => (t.id === id ? { ...t, name: newName } : t)),
			);
		},
		[],
	);

	return {
		tabs,
		setTabs,
		activeTabId,
		setActiveTabId,
		activeTab,
		updateActiveTab,
		addTab,
		closeTab,
		closeTabForce,
		closeConfirmTabId,
		setCloseConfirmTabId,
		reorderTabs,
		renameTab,
		initialPathTabs: initialTabs.filter((t) => t.path),
	};
}
