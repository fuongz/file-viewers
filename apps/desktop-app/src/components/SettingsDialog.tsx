import { IconKeyboard, IconPalette, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { PLATFORM_IS_MAC, THEME_LABELS, THEME_OPTIONS } from "../constants";
import {
	interfaceFonts,
	interfaceSizes,
	monoFonts,
	monoSizes,
} from "../lib/typography";
import { useAppStore } from "../store";
import type { ThemePreference } from "../types";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "./ui/dialog";
import { Kbd } from "./ui/kbd";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import {
	Sidebar,
	SidebarContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "./ui/sidebar";

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	themePref: ThemePreference;
	onThemeSelect: (pref: ThemePreference) => void;
}

const sections = [
	{ id: "appearance", label: "Appearance", icon: IconPalette },
	{ id: "shortcuts", label: "Shortcuts", icon: IconKeyboard },
] as const;

function ThemeSample({ dark = false }: { dark?: boolean }) {
	return (
		<div className="theme-sample" data-scheme={dark ? "dark" : "light"}>
			<div className="theme-sample-tabs">
				<i />
				<i />
			</div>
			<div className="theme-sample-panes">
				<div>
					<i />
					<i />
					<i />
				</div>
				<div>
					<i />
					<i />
				</div>
			</div>
		</div>
	);
}

function AppearancePanel({
	themePref,
	onThemeSelect,
}: Pick<SettingsDialogProps, "themePref" | "onThemeSelect">) {
	return (
		<fieldset className="min-w-0">
			<legend className="text-sm font-semibold">Color scheme</legend>
			<p className="mt-1 text-xs text-muted-foreground">
				Choose how File Viewers looks.
			</p>
			<div className="mt-4 @sm:hidden">
				<Select
					items={THEME_LABELS}
					value={themePref}
					onValueChange={(value) => onThemeSelect(value as ThemePreference)}
				>
					<SelectTrigger className="w-32" aria-label="Color scheme">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{THEME_OPTIONS.map((value) => (
							<SelectItem key={value} value={value}>
								{THEME_LABELS[value]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="mt-4 hidden grid-cols-3 gap-3 @sm:grid">
				{THEME_OPTIONS.map((value) => (
					<label key={value} className="relative min-w-0 cursor-pointer">
						<input
							type="radio"
							name="color-scheme"
							value={value}
							checked={themePref === value}
							onChange={() => onThemeSelect(value)}
							className="peer sr-only"
						/>
						<div className="rounded-xl border bg-background p-1.5 text-center hover:bg-muted/40 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:font-medium peer-focus-visible:underline peer-focus-visible:underline-offset-4">
							<div
								className="theme-sample-frame"
								data-system={value === "system" || undefined}
								aria-hidden="true"
							>
								<ThemeSample dark={value === "dark"} />
								{value === "system" && <ThemeSample dark />}
							</div>
							<span className="block py-1.5 text-sm">
								{THEME_LABELS[value]}
							</span>
						</div>
					</label>
				))}
			</div>
		</fieldset>
	);
}

function ShortcutsPanel() {
	const modifier = PLATFORM_IS_MAC ? "⌘" : "Ctrl";
	const shortcuts = [
		{ action: "Command Palette", keys: [modifier, "K"] },
		{ action: "Open File", keys: [modifier, "O"] },
		{ action: "Save", keys: [modifier, "S"] },
		{ action: "New Tab", keys: [modifier, "T"] },
		{ action: "Close Tab", keys: [modifier, "W"] },
		{ action: "Switch to a tab", keys: [modifier, "1–9"] },
		{ action: "Move focused tab", keys: ["Alt", "← / →"] },
		{ action: "Settings", keys: [modifier, ","] },
	];

	return (
		<dl className="divide-y rounded-xl border bg-background px-3">
			{shortcuts.map(({ action, keys }) => (
				<div
					key={action}
					className="flex items-center justify-between gap-2 py-2.5"
				>
					<dt className="text-sm">{action}</dt>
					<dd className="flex shrink-0 gap-1">
						{keys.map((key) => (
							<Kbd key={key}>{key}</Kbd>
						))}
					</dd>
				</div>
			))}
		</dl>
	);
}

function FontSelect({
	label,
	items,
	value,
	onChange,
}: {
	label: string;
	items: { label: string; value: string }[];
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<Select
			items={items}
			value={value}
			onValueChange={(next) => {
				if (next !== null) onChange(next);
			}}
		>
			<SelectTrigger aria-label={label} className="w-full min-w-0">
				<SelectValue />
			</SelectTrigger>
			<SelectContent align="end">
				<SelectGroup>
					{items.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}

const interfaceSizeItems = interfaceSizes.map((size) => ({
	label: `${size} px`,
	value: String(size),
}));
const monoSizeItems = monoSizes.map((size) => ({
	label: `${size} px`,
	value: String(size),
}));

function TypographyPanel() {
	const { interfaceFont, interfaceSize, monoFont, monoSize } = useAppStore(
		(s) => s.typography,
	);
	const setTypography = useAppStore((s) => s.setTypography);

	return (
		<section aria-labelledby="typography-heading">
			<h3 id="typography-heading" className="mb-3 text-sm font-semibold">
				Typography
			</h3>
			<div className="divide-y rounded-xl border bg-background">
				<div className="flex flex-col gap-3 p-3 @sm:p-4">
					<div className="flex flex-col items-start gap-2 @lg:flex-row @lg:justify-between">
						<div>
							<h4 className="text-sm font-medium">Interface font</h4>
							<p className="text-xs text-muted-foreground">
								Menus, settings, and other interface text.
							</p>
						</div>
						<div className="grid w-full grid-cols-[minmax(0,1fr)_5.5rem] gap-2 @lg:w-52 @lg:shrink-0">
							<FontSelect
								label="Interface font family"
								items={interfaceFonts}
								value={interfaceFont}
								onChange={(font) => setTypography({ interfaceFont: font })}
							/>
							<FontSelect
								label="Interface font size"
								items={interfaceSizeItems}
								value={String(interfaceSize)}
								onChange={(size) =>
									setTypography({ interfaceSize: Number(size) })
								}
							/>
						</div>
					</div>
					<p className="rounded-lg bg-muted/55 px-3 py-2 text-sm leading-relaxed">
						Open a file to edit its contents or see a live preview.
					</p>
				</div>
				<div className="flex flex-col gap-3 p-3 @sm:p-4">
					<div className="flex flex-col items-start gap-2 @lg:flex-row @lg:justify-between">
						<div>
							<h4 className="text-sm font-medium">Monospace font</h4>
							<p className="text-xs text-muted-foreground">
								The editor, JSON previews, and Markdown code.
							</p>
						</div>
						<div className="grid w-full grid-cols-[minmax(0,1fr)_5.5rem] gap-2 @lg:w-52 @lg:shrink-0">
							<FontSelect
								label="Monospace font family"
								items={monoFonts}
								value={monoFont}
								onChange={(font) => setTypography({ monoFont: font })}
							/>
							<FontSelect
								label="Monospace font size"
								items={monoSizeItems}
								value={String(monoSize)}
								onChange={(size) => setTypography({ monoSize: Number(size) })}
							/>
						</div>
					</div>
					<pre className="overflow-x-auto rounded-lg bg-muted/55 px-3 py-2 font-mono text-code leading-relaxed">
						<code>
							{"{\n  "}
							<span className="text-(--json-key)">{'"file"'}</span>
							{": "}
							<span className="text-(--json-string)">{'"records.jsonl"'}</span>
							{",\n  "}
							<span className="text-(--json-key)">{'"records"'}</span>
							{": "}
							<span className="text-(--json-number)">42</span>
							{"\n}"}
						</code>
					</pre>
				</div>
			</div>
		</section>
	);
}

export function SettingsDialog({
	open,
	onOpenChange,
	themePref,
	onThemeSelect,
}: SettingsDialogProps) {
	const [section, setSection] = useState<(typeof sections)[number]>(
		sections[0],
	);
	const titleRef = useRef<HTMLHeadingElement>(null);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="overflow-hidden rounded-2xl p-0 shadow-2xl sm:max-w-[min(60rem,calc(100%-2rem))]"
				overlayClassName="bg-background/55 dark:bg-black/45 supports-backdrop-filter:backdrop-blur-[5px]"
				showCloseButton={false}
				initialFocus={titleRef}
			>
				<DialogDescription className="sr-only">
					Customize appearance and view keyboard shortcuts.
				</DialogDescription>
				<SidebarProvider
					enableKeyboardShortcut={false}
					className="h-[min(40rem,calc(100dvh-3rem))] min-h-0 flex-col sm:flex-row"
				>
					<Sidebar
						collapsible="none"
						role="navigation"
						aria-label="Settings sections"
						className="h-auto w-full shrink-0 bg-muted/65 sm:h-full sm:w-44 sm:border-r"
					>
						<SidebarContent className="p-1.5 sm:p-2">
							<SidebarMenu className="flex-row gap-2 sm:flex-col">
								{sections.map((item) => (
									<SidebarMenuItem key={item.id} className="min-w-0">
										<SidebarMenuButton
											type="button"
											isActive={section.id === item.id}
											aria-current={section.id === item.id ? "page" : undefined}
											className="px-2.5 text-sm text-muted-foreground data-active:bg-primary/12 data-active:text-foreground focus-visible:ring-0 focus-visible:underline focus-visible:underline-offset-4"
											onClick={() => setSection(item)}
										>
											<item.icon aria-hidden="true" />
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarContent>
					</Sidebar>
					<div className="flex min-h-0 min-w-0 flex-1 flex-col">
						<header className="flex h-11 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
							<DialogTitle
								ref={titleRef}
								tabIndex={-1}
								className="text-sm font-medium text-muted-foreground outline-none"
							>
								Settings
							</DialogTitle>
							<span className="text-muted-foreground" aria-hidden="true">
								/
							</span>
							<h2 className="text-sm font-semibold">{section.label}</h2>
							<DialogClose
								render={
									<Button
										variant="ghost"
										size="icon-sm"
										className="ms-auto"
										aria-label="Close settings"
									/>
								}
							>
								<IconX aria-hidden="true" />
							</DialogClose>
						</header>
						<div className="@container min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-7">
							{section.id === "appearance" ? (
								<div className="flex flex-col gap-6">
									<AppearancePanel
										themePref={themePref}
										onThemeSelect={onThemeSelect}
									/>
									<TypographyPanel />
								</div>
							) : (
								<ShortcutsPanel />
							)}
						</div>
					</div>
				</SidebarProvider>
			</DialogContent>
		</Dialog>
	);
}
