import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_THEME_KEY } from "../constants";
import { createTab, readStoredSession } from "../hooks/useSession";
import type { FileTab, ThemePreference } from "../types";

function readStoredTheme(): ThemePreference {
	try {
		const raw = localStorage.getItem(STORAGE_THEME_KEY);
		if (raw === "system" || raw === "dark" || raw === "light") return raw;
	} catch {}
	return "system";
}

const storedSession = readStoredSession();
const initialTabs = storedSession?.tabs ?? [createTab()];
const initialActiveTabId = storedSession?.activeTabId ?? initialTabs[0].id;

export interface AppState {
	// Tabs
	tabs: FileTab[];
	activeTabId: string;
	closeConfirmTabId: string | null;
	initialPathTabs: FileTab[];
	initialContentTooLarge: boolean;
	setTabs: (updater: FileTab[] | ((prev: FileTab[]) => FileTab[])) => void;
	setActiveTabId: (id: string) => void;
	setCloseConfirmTabId: (id: string | null) => void;
	updateActiveTab: (patch: Partial<Omit<FileTab, "id">>) => void;
	addTab: () => void;
	closeTab: (id: string) => void;
	closeTabForce: (id: string) => void;
	reorderTabs: (from: number, to: number) => void;
	renameTab: (id: string, name: string) => void;

	// Theme
	themePref: ThemePreference;
	systemDark: boolean;
	setThemePref: (pref: ThemePreference) => void;
	setSystemDark: (val: boolean) => void;

	// UI
	settingsOpen: boolean;
	commandOpen: boolean;
	sidebarCollapsed: boolean;
	isDragOver: boolean;
	setSettingsOpen: (val: boolean) => void;
	setCommandOpen: (val: boolean) => void;
	toggleSidebar: () => void;
	setIsDragOver: (val: boolean) => void;
}

export const useAppStore = create<AppState>()(
	persist(
		(set, get) => ({
			// --- Tabs ---
			tabs: initialTabs,
			activeTabId: initialActiveTabId,
			closeConfirmTabId: null,
			initialPathTabs: initialTabs.filter((t) => t.path),
			initialContentTooLarge: storedSession?.contentTooLarge ?? false,

			setTabs: (updater) =>
				set((s) => ({
					tabs: typeof updater === "function" ? updater(s.tabs) : updater,
				})),
			setActiveTabId: (id) => set({ activeTabId: id }),
			setCloseConfirmTabId: (id) => set({ closeConfirmTabId: id }),

			updateActiveTab: (patch) =>
				set((s) => ({
					tabs: s.tabs.map((t) =>
						t.id === s.activeTabId ? { ...t, ...patch } : t,
					),
				})),

			addTab: () => {
				const t = createTab();
				set((s) => ({ tabs: [...s.tabs, t], activeTabId: t.id }));
			},

			closeTabForce: (id) =>
				set((s) => {
					const next = s.tabs.filter((t) => t.id !== id);
					if (next.length === 0) {
						const newTab = createTab();
						return { tabs: [newTab], activeTabId: newTab.id };
					}
					let { activeTabId } = s;
					if (id === s.activeTabId) {
						const idx = s.tabs.findIndex((t) => t.id === id);
						activeTabId = next[Math.min(idx, next.length - 1)].id;
					}
					return { tabs: next, activeTabId };
				}),

			closeTab: (id) => {
				const tab = get().tabs.find((t) => t.id === id);
				if (tab?.isDirty) {
					set({ closeConfirmTabId: id });
				} else {
					get().closeTabForce(id);
				}
			},

			reorderTabs: (from, to) =>
				set((s) => {
					const newTabs = [...s.tabs];
					const [removed] = newTabs.splice(from, 1);
					newTabs.splice(to, 0, removed);
					return { tabs: newTabs };
				}),

			renameTab: (id, name) =>
				set((s) => ({
					tabs: s.tabs.map((t) => (t.id === id ? { ...t, name } : t)),
				})),

			// --- Theme ---
			themePref: readStoredTheme(),
			systemDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
			setThemePref: (pref) => set({ themePref: pref }),
			setSystemDark: (val) => set({ systemDark: val }),

			// --- UI ---
			settingsOpen: false,
			commandOpen: false,
			sidebarCollapsed: false,
			isDragOver: false,
			setSettingsOpen: (val) => set({ settingsOpen: val }),
			setCommandOpen: (val) => set({ commandOpen: val }),
			toggleSidebar: () =>
				set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
			setIsDragOver: (val) => set({ isDragOver: val }),
		}),
		{
			name: "app-store",
			// Tabs and activeTabId are persisted separately by persistSession()
			// with proper size guards. Exclude large/ephemeral fields to prevent
			// QuotaExceededError when large files are open.
			partialize: (s) => ({
				themePref: s.themePref,
				sidebarCollapsed: s.sidebarCollapsed,
			}),
		},
	),
);

export const selectActiveTab = (s: AppState): FileTab =>
	s.tabs.find((t) => t.id === s.activeTabId) ?? s.tabs[0];

export const selectIsDark = (s: AppState): boolean =>
	s.themePref === "dark" || (s.themePref === "system" && s.systemDark);
