import {
	IconKeyboard,
	IconSettings,
	type TablerIcon,
} from "@tabler/icons-react";
import { useState } from "react";
import { THEME_LABELS, THEME_OPTIONS } from "../constants";
import type { ThemePreference } from "../types";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "./ui/Dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/Select";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "./ui/Sidebar";

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	themePref: ThemePreference;
	onThemeSelect: (pref: ThemePreference) => void;
}

type SettingsSection = "general" | "shortcuts";

const NAV_SECTIONS: {
	label: string;
	items: { id: SettingsSection; label: string; icon: TablerIcon }[];
}[] = [
	{
		label: "Settings",
		items: [
			{ id: "general", label: "General", icon: IconSettings },
			{ id: "shortcuts", label: "Shortcuts", icon: IconKeyboard },
		],
	},
];

function SettingRow({
	label,
	description,
	children,
}: {
	label: string;
	description?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex items-center justify-between gap-6 py-3 border-b border-[var(--border)] last:border-0">
			<div className="min-w-0">
				<div className="text-sm font-medium text-[var(--text-primary)] leading-snug">
					{label}
				</div>
				{description && (
					<div className="text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
						{description}
					</div>
				)}
			</div>
			<div className="shrink-0">{children}</div>
		</div>
	);
}

function SettingSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mb-6">
			<div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2 px-1">
				{title}
			</div>
			<div className="rounded-lg border border-[var(--border)] bg-zinc-50 dark:bg-zinc-800 overflow-hidden px-3">
				{children}
			</div>
		</div>
	);
}

function GeneralPanel({
	themePref,
	onThemeSelect,
}: {
	themePref: ThemePreference;
	onThemeSelect: (pref: ThemePreference) => void;
}) {
	return (
		<div className="flex flex-1 flex-col overflow-y-auto p-5">
			<SettingSection title="Appearance">
				<SettingRow
					label="Color scheme"
					description="Choose your preferred theme"
				>
					<Select
						value={themePref}
						onValueChange={(val) => onThemeSelect(val as ThemePreference)}
					>
						<SelectTrigger className="w-32">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{THEME_OPTIONS.map((opt) => (
								<SelectItem key={opt} value={opt}>
									{THEME_LABELS[opt]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</SettingRow>
			</SettingSection>
		</div>
	);
}

function ShortcutsPanel() {
	const shortcuts = [
		{ action: "Save", keys: ["⌘", "S"] },
		{ action: "New Tab", keys: ["⌘", "T"] },
		{ action: "Close Tab", keys: ["⌘", "W"] },
		{ action: "Open File", keys: ["⌘", "O"] },
		{ action: "Toggle Sidebar", keys: ["⌘", "B"] },
		{ action: "Settings", keys: ["⌘", ","] },
		{ action: "Move Tab Left", keys: ["⇧", "←"] },
		{ action: "Move Tab Right", keys: ["⇧", "→"] },
	];

	return (
		<div className="flex flex-1 flex-col overflow-y-auto p-5">
			<SettingSection title="Keyboard Shortcuts">
				{shortcuts.map((s) => (
					<SettingRow key={s.action} label={s.action}>
						<div className="flex gap-1 items-center">
							{s.keys.map((k) => (
								<kbd
									key={k}
									className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded border border-[var(--border)] bg-[var(--bg-toolbar)] text-[var(--text-primary)] text-[11px] font-medium shadow-[0_1px_0_var(--border)]"
								>
									{k}
								</kbd>
							))}
						</div>
					</SettingRow>
				))}
			</SettingSection>
		</div>
	);
}

export function SettingsDialog({
	open,
	onOpenChange,
	themePref,
	onThemeSelect,
}: SettingsDialogProps) {
	const [activeSection, setActiveSection] =
		useState<SettingsSection>("general");

	const activeLabel =
		NAV_SECTIONS.flatMap((s) => s.items).find((i) => i.id === activeSection)
			?.label ?? "";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="!p-0 sm:max-w-3xl overflow-hidden"
				showCloseButton={false}
			>
				<DialogTitle className="sr-only">Settings</DialogTitle>
				<DialogDescription className="sr-only">
					Customize your settings here.
				</DialogDescription>

				<SidebarProvider
					className="!min-h-0 h-[480px]"
					style={{ "--sidebar-width": "11rem" } as React.CSSProperties}
				>
					<Sidebar
						collapsible="none"
						className="border-r border-[var(--border)]"
					>
						<SidebarContent>
							{NAV_SECTIONS.map((section) => (
								<SidebarGroup key={section.label}>
									<SidebarGroupLabel>{section.label}</SidebarGroupLabel>
									<SidebarGroupContent>
										<SidebarMenu>
											{section.items.map((item) => {
												const Icon = item.icon;
												return (
													<SidebarMenuItem key={item.id}>
														<SidebarMenuButton
															isActive={activeSection === item.id}
															onClick={() => setActiveSection(item.id)}
														>
															<Icon size={15} stroke={1.5} />
															<span>{item.label}</span>
														</SidebarMenuButton>
													</SidebarMenuItem>
												);
											})}
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>
							))}
						</SidebarContent>
					</Sidebar>

					{/* Main panel */}
					<div className="flex flex-col flex-1 min-w-0 bg-[var(--bg-preview)]">
						<div className="px-6 pt-5 pb-2">
							<h2 className="text-base font-semibold text-[var(--text-primary)]">
								{activeLabel}
							</h2>
						</div>
						{activeSection === "general" ? (
							<GeneralPanel
								themePref={themePref}
								onThemeSelect={onThemeSelect}
							/>
						) : (
							<ShortcutsPanel />
						)}
					</div>
				</SidebarProvider>
			</DialogContent>
		</Dialog>
	);
}
