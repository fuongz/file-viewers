import { nanoid } from "nanoid";
import { STORAGE_SESSION_KEY, STORAGE_THEME_KEY } from "../constants";
import type { FileTab, PersistedSession, ThemePreference } from "../types";

const MAX_LOCALSTORAGE_SIZE = 5 * 1024 * 1024;

export function createTab(overrides?: Partial<Omit<FileTab, "id">>): FileTab {
	const format = overrides?.format ?? "markdown";
	return {
		id: nanoid(),
		name: "New File",
		format,
		content: "",
		previewContent: "",
		showEditor: format !== "csv" && format !== "xlsx",
		...overrides,
	};
}

export function readStoredSession(): {
	tabs: FileTab[];
	activeTabId: string;
	contentTooLarge: boolean;
} | null {
	try {
		const raw = localStorage.getItem(STORAGE_SESSION_KEY);
		if (!raw) return null;
		if (raw.length > MAX_LOCALSTORAGE_SIZE * 2) {
			localStorage.removeItem(STORAGE_SESSION_KEY);
			return null;
		}
		const parsed: PersistedSession = JSON.parse(raw);
		if (
			parsed.version !== 1 ||
			!Array.isArray(parsed.tabs) ||
			!parsed.tabs.length
		) {
			localStorage.removeItem(STORAGE_SESSION_KEY);
			return null;
		}
		let contentTooLarge = false;
		const tabs: FileTab[] = parsed.tabs.map((pt) => {
			const hasContent = !pt.path && pt.content;
			if (hasContent && pt.content.length > MAX_LOCALSTORAGE_SIZE) {
				contentTooLarge = true;
			}
			return {
				id: pt.id,
				name: pt.name,
				format: pt.format,
				content: pt.path ? "" : pt.content,
				previewContent: pt.path ? "" : pt.content,
				showEditor: pt.format !== "csv" && pt.format !== "xlsx",
				path: pt.path || undefined,
			};
		});
		return {
			tabs,
			activeTabId: parsed.activeTabId ?? tabs[0].id,
			contentTooLarge,
		};
	} catch {
		try {
			localStorage.removeItem(STORAGE_SESSION_KEY);
		} catch {}
		return null;
	}
}

export function persistSession(
	tabs: FileTab[],
	activeTabId: string,
	themePref: ThemePreference,
): { skippedLargeContent: boolean } {
	let skippedLargeContent = false;
	try {
		localStorage.setItem(STORAGE_THEME_KEY, themePref);
	} catch {}
	try {
		const session: PersistedSession = {
			version: 1,
			activeTabId,
			tabs: tabs.map((t) => {
				const content = t.path ? "" : t.content;
				if (!t.path && content.length > MAX_LOCALSTORAGE_SIZE) {
					skippedLargeContent = true;
					return {
						id: t.id,
						name: t.name,
						format: t.format,
						path: "",
						content: "",
					};
				}
				return {
					id: t.id,
					name: t.name,
					format: t.format,
					path: t.path ?? "",
					content,
				};
			}),
		};
		const serialized = JSON.stringify(session);
		if (serialized.length > MAX_LOCALSTORAGE_SIZE * 2) {
			localStorage.removeItem(STORAGE_SESSION_KEY);
			skippedLargeContent = true;
			return { skippedLargeContent };
		}
		localStorage.setItem(STORAGE_SESSION_KEY, serialized);
	} catch {
		try {
			localStorage.removeItem(STORAGE_SESSION_KEY);
		} catch {}
	}
	return { skippedLargeContent };
}
