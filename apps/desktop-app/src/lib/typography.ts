const interfaceFallback = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const monoFallback = "Menlo, Consolas, monospace";

export const interfaceFonts = [
	{
		value: "inter",
		label: "Inter",
		stack: `"Inter Variable", ${interfaceFallback}`,
	},
	{ value: "system", label: "System", stack: interfaceFallback },
	{
		value: "geist",
		label: "Geist",
		stack: `"Geist Variable", ${interfaceFallback}`,
	},
	{
		value: "dm-sans",
		label: "DM Sans",
		stack: `"DM Sans Variable", ${interfaceFallback}`,
	},
	{ value: "arial", label: "Arial", stack: `Arial, ${interfaceFallback}` },
	{
		value: "verdana",
		label: "Verdana",
		stack: `Verdana, ${interfaceFallback}`,
	},
];

export const monoFonts = [
	{ value: "system", label: "System", stack: `ui-monospace, ${monoFallback}` },
	{
		value: "jetbrains-mono",
		label: "JetBrains Mono",
		stack: `"JetBrains Mono Variable", ${monoFallback}`,
	},
	{
		value: "fira-code",
		label: "Fira Code",
		stack: `"Fira Code Variable", ${monoFallback}`,
	},
	{
		value: "source-code-pro",
		label: "Source Code Pro",
		stack: `"Source Code Pro Variable", ${monoFallback}`,
	},
	{ value: "menlo", label: "Menlo", stack: monoFallback },
	{ value: "sf-mono", label: "SF Mono", stack: `"SF Mono", ${monoFallback}` },
	{ value: "consolas", label: "Consolas", stack: "Consolas, Menlo, monospace" },
	{
		value: "courier",
		label: "Courier New",
		stack: `"Courier New", ${monoFallback}`,
	},
];

export const interfaceSizes = [12, 13, 14, 15, 16, 18];
export const monoSizes = [11, 12, 13, 14, 15, 16, 18, 20];

export const defaultTypography = {
	interfaceFont: "inter",
	interfaceSize: 13,
	monoFont: "system",
	monoSize: 13,
};

export type TypographyPreferences = typeof defaultTypography;

export function fontStack(fonts: typeof interfaceFonts, value: string) {
	return fonts.find((font) => font.value === value)?.stack ?? fonts[0].stack;
}
