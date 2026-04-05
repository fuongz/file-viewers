import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
	IconDeviceDesktop,
	IconKeyboard,
	IconMoon,
	IconSun,
} from "@tabler/icons-react";
import { useState } from "react";
import { THEME_LABELS, THEME_OPTIONS } from "../../constants";
import type { ThemePreference } from "../../types";
import { ToggleGroup, ToggleGroupItem } from "./ToggleGroup";

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	themePref: ThemePreference;
	onThemeSelect: (pref: ThemePreference) => void;
}

type SettingsSection = "general" | "shortcuts";

const THEME_ICONS: Record<ThemePreference, typeof IconSun> = {
	system: IconDeviceDesktop,
	light: IconSun,
	dark: IconMoon,
};

const NAV_ITEMS: {
	id: SettingsSection;
	label: string;
	icon: typeof IconSun;
}[] = [
	{ id: "general", label: "General", icon: IconSun },
	{ id: "shortcuts", label: "Shortcuts", icon: IconKeyboard },
];

function GeneralPanel({
	themePref,
	onThemeSelect,
}: {
	themePref: ThemePreference;
	onThemeSelect: (pref: ThemePreference) => void;
}) {
	return (
		<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
			<div className="settings-group">
				<div className="settings-group-header">Appearance</div>
				<div className="settings-row">
					<div className="settings-row-label">
						<div className="settings-row-label-text">Color scheme</div>
						<div className="settings-row-description">
							Choose your preferred theme
						</div>
					</div>
					<div className="settings-row-control">
						<ToggleGroup
							value={[themePref]}
							onValueChange={(val) => {
								if (val.length > 0) {
									onThemeSelect(val[0] as ThemePreference);
								}
							}}
							className="theme-toggle-group"
						>
							{THEME_OPTIONS.map((opt) => {
								const Icon = THEME_ICONS[opt];
								return (
									<ToggleGroupItem
										key={opt}
										value={opt}
										className="theme-toggle-item"
									>
										<Icon size={14} stroke={1.5} />
										<span>{THEME_LABELS[opt]}</span>
									</ToggleGroupItem>
								);
							})}
						</ToggleGroup>
					</div>
				</div>
			</div>
		</div>
	);
}

function ShortcutsPanel() {
	const shortcuts = [
		{ action: "Save", keys: ["⌘", "S"] },
		{ action: "New Tab", keys: ["⌘", "T"] },
		{ action: "Close Tab", keys: ["⌘", "W"] },
		{ action: "Open File", keys: ["⌘", "O"] },
		{ action: "Settings", keys: ["⌘", ","] },
		{ action: "Move Tab Left", keys: ["⇧", "←"] },
		{ action: "Move Tab Right", keys: ["⇧", "→"] },
	];

	return (
		<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
			<div className="settings-group">
				<div className="settings-group-header">Keyboard Shortcuts</div>
				<div className="shortcuts-list">
					{shortcuts.map((s) => (
						<div key={s.action} className="shortcut-item">
							<span className="shortcut-action">{s.action}</span>
							<div className="shortcut-keys">
								{s.keys.map((k) => (
									<kbd key={k} className="shortcut-kbd">
										{k}
									</kbd>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
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

	return (
		<BaseDialog.Root open={open} onOpenChange={onOpenChange}>
			<BaseDialog.Portal>
				<BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
				<BaseDialog.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-xl bg-[var(--bg-toolbar)] border border-[var(--border)] shadow-2xl flex outline-none overflow-hidden p-0">
					<BaseDialog.Title className="sr-only">
						Settings
					</BaseDialog.Title>
					<BaseDialog.Description className="sr-only">
						Customize your settings here.
					</BaseDialog.Description>
					<div className="settings-dialog-root">
						<div className="settings-sidebar">
							<div className="settings-sidebar-header">Settings</div>
							<nav className="settings-sidebar-nav">
								{NAV_ITEMS.map((item) => {
									const Icon = item.icon;
									return (
										<button
											key={item.id}
											type="button"
											className={`settings-sidebar-item${activeSection === item.id ? " active" : ""}`}
											onClick={() => setActiveSection(item.id)}
										>
											<Icon size={16} stroke={1.5} />
											<span>{item.label}</span>
										</button>
									);
								})}
							</nav>
						</div>
						<div className="settings-main">
							<header className="settings-header">
								<span className="text-sm font-medium text-[var(--text-muted)]">
									Settings
								</span>
								<svg
									className="w-3 h-3 text-[var(--text-muted)]"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
									aria-hidden="true"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M9 5l7 7-7 7"
									/>
								</svg>
								<span className="text-sm font-medium text-[var(--text-primary)]">
									{NAV_ITEMS.find((i) => i.id === activeSection)?.label}
								</span>
							</header>
							{activeSection === "general" ? (
								<GeneralPanel
									themePref={themePref}
									onThemeSelect={onThemeSelect}
								/>
							) : (
								<ShortcutsPanel />
							)}
						</div>
					</div>
				</BaseDialog.Popup>
			</BaseDialog.Portal>
		</BaseDialog.Root>
	);
}
