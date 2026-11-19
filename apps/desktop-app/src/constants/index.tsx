import {
	IconCsv,
	IconDatabase,
	IconDeviceDesktop,
	IconFileTypeXls,
	IconJson,
	IconMarkdown,
	IconMoon,
	IconSun,
} from "@tabler/icons-react";
import type { Format } from "../components/PreviewPanel";
import type { ThemePreference } from "../types";

export const SQLITE_EXTENSIONS = ["sqlite", "sqlite3", "db", "db3"];

export const EXT_TO_FORMAT: Record<string, Format> = {
	md: "markdown",
	markdown: "markdown",
	mdx: "mdx",
	json: "json",
	jsonl: "jsonl",
	csv: "csv",
	xlsx: "xlsx",
	parquet: "parquet",
	...Object.fromEntries(SQLITE_EXTENSIONS.map((ext) => [ext, "sqlite"])),
	txt: "markdown",
};

export const FORMAT_LANGUAGE: Record<Format, string> = {
	markdown: "markdown",
	mdx: "markdown",
	json: "json",
	jsonl: "plaintext",
	csv: "plaintext",
	xlsx: "plaintext",
	parquet: "plaintext",
	sqlite: "plaintext",
};

export function canShowEditor(format: Format) {
	return format !== "xlsx" && format !== "sqlite";
}

const jsonIcon = (
	<IconJson
		size={13}
		stroke={1.5}
		className="stroke-zinc-500 dark:stroke-zinc-300"
	/>
);

export const FORMAT_ICONS: Record<Format, React.ReactNode> = {
	markdown: (
		<IconMarkdown
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-300"
		/>
	),
	mdx: (
		<IconMarkdown
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-300"
		/>
	),
	json: jsonIcon,
	jsonl: jsonIcon,
	csv: (
		<IconCsv
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-300"
		/>
	),
	xlsx: (
		<IconFileTypeXls
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-300"
		/>
	),
	parquet: (
		<IconDatabase
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-300"
		/>
	),
	sqlite: (
		<IconDatabase
			size={13}
			stroke={1.5}
			className="text-muted-foreground dark:text-zinc-300"
		/>
	),
};

export const THEME_LABELS: Record<ThemePreference, string> = {
	system: "System",
	dark: "Dark",
	light: "Light",
};

export const THEME_ICONS: Record<ThemePreference, React.ReactNode> = {
	system: <IconDeviceDesktop size={13} stroke={1.5} />,
	dark: <IconMoon size={13} stroke={1.5} />,
	light: <IconSun size={13} stroke={1.5} />,
};

export const THEME_OPTIONS: ThemePreference[] = ["system", "light", "dark"];
export const TAB_SHORTCUT_COUNT = 9;

export const STORAGE_SESSION_KEY = "fileviewers.session";
export const STORAGE_THEME_KEY = "fileviewers.theme";

export const PLATFORM_IS_MAC =
	typeof navigator !== "undefined" &&
	/nac\sOS|Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const REVEAL_LABEL = PLATFORM_IS_MAC
	? "Reveal in Finder"
	: "Open containing folder";
