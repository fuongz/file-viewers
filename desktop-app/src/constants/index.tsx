import {
	IconCsv,
	IconDeviceDesktop,
	IconFileTypeXls,
	IconJson,
	IconMarkdown,
	IconMoon,
	IconSun,
} from "@tabler/icons-react";
import type { Format } from "../components/PreviewPanel";
import type { ThemePreference } from "../types";

export const EXT_TO_FORMAT: Record<string, Format> = {
	md: "markdown",
	markdown: "markdown",
	mdx: "mdx",
	json: "json",
	csv: "csv",
	xlsx: "xlsx",
	txt: "markdown",
};

export const FORMAT_LANGUAGE: Record<Format, string> = {
	markdown: "markdown",
	mdx: "markdown",
	json: "json",
	csv: "plaintext",
	xlsx: "plaintext",
};

export const FORMAT_ICONS: Record<Format, React.ReactNode> = {
	markdown: (
		<IconMarkdown
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-500"
		/>
	),
	mdx: (
		<IconMarkdown
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-500"
		/>
	),
	json: (
		<IconJson
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-500"
		/>
	),
	csv: (
		<IconCsv
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-500"
		/>
	),
	xlsx: (
		<IconFileTypeXls
			size={13}
			stroke={1.5}
			className="stroke-zinc-500 dark:stroke-zinc-500"
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

export const STORAGE_SESSION_KEY = "fileviewers.session";
export const STORAGE_THEME_KEY = "fileviewers.theme";
