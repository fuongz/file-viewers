import type { Format } from "../components/PreviewPanel";

export type { Format };

export type ThemePreference = "system" | "dark" | "light";

export interface FileTab {
	id: string;
	name: string;
	format: Format;
	content: string;
	previewContent: string;
	path?: string;
	isDirty?: boolean;
	binaryContent?: Uint8Array;
}

export interface PersistedTab {
	id: string;
	name: string;
	format: Format;
	path: string;
	content: string;
}

export interface PersistedSession {
	version: 1;
	activeTabId: string;
	tabs: PersistedTab[];
}
