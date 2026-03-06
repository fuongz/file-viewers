import { STORAGE_SESSION_KEY, STORAGE_THEME_KEY } from "../constants";
import type { FileTab, PersistedSession, ThemePreference } from "../types";

let _tabCounter = 0;

export function createTab(overrides?: Partial<Omit<FileTab, "id">>): FileTab {
	_tabCounter++;
	return {
		id: `tab-${_tabCounter}`,
		name: "New File",
		format: "markdown",
		content: "",
		previewContent: "",
		...overrides,
	};
}

export function readStoredSession(): {
	tabs: FileTab[];
	activeTabId: string;
} | null {
	try {
		const raw = localStorage.getItem(STORAGE_SESSION_KEY);
		if (!raw) return null;
		const parsed: PersistedSession = JSON.parse(raw);
		if (
			parsed.version !== 1 ||
			!Array.isArray(parsed.tabs) ||
			!parsed.tabs.length
		)
			return null;
		const tabs: FileTab[] = parsed.tabs.map((pt) => ({
			id: pt.id,
			name: pt.name,
			format: pt.format,
			content: pt.path ? "" : pt.content,
			previewContent: pt.path ? "" : pt.content,
			path: pt.path || undefined,
		}));
		return { tabs, activeTabId: parsed.activeTabId ?? tabs[0].id };
	} catch {
		return null;
	}
}

export function advanceTabCounter(
	session: ReturnType<typeof readStoredSession>,
): void {
	if (!session) return;
	for (const t of session.tabs) {
		const n = parseInt(t.id.replace("tab-", ""), 10);
		if (!Number.isNaN(n) && n > _tabCounter) _tabCounter = n;
	}
}

export function persistSession(
	tabs: FileTab[],
	activeTabId: string,
	themePref: ThemePreference,
): void {
	try {
		localStorage.setItem(STORAGE_THEME_KEY, themePref);
	} catch {}
	try {
		const session: PersistedSession = {
			version: 1,
			activeTabId,
			tabs: tabs.map((t) => ({
				id: t.id,
				name: t.name,
				format: t.format,
				path: t.path ?? "",
				content: t.path ? "" : t.content,
			})),
		};
		localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(session));
	} catch {}
}
