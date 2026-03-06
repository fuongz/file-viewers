import { THEME_ICONS, THEME_LABELS, THEME_OPTIONS } from "../../constants";
import type { ThemePreference } from "../../types";
import { Button } from "../ui/Button";

interface ThemeMenuProps {
	themePref: ThemePreference;
	themeMenuOpen: boolean;
	themeMenuRef: React.RefObject<HTMLDivElement | null>;
	onToggle: () => void;
	onSelect: (pref: ThemePreference) => void;
}

export function ThemeMenu({
	themePref,
	themeMenuOpen,
	themeMenuRef,
	onToggle,
	onSelect,
}: ThemeMenuProps) {
	return (
		<div className="theme-menu-wrap" ref={themeMenuRef}>
			<Button onClick={onToggle}>
				{THEME_ICONS[themePref]}
				{THEME_LABELS[themePref]}
			</Button>
			{themeMenuOpen && (
				<div className="theme-dropdown">
					{THEME_OPTIONS.map((opt) => (
						<Button
							variant="ghost"
							key={opt}
							active={themePref === opt}
							onClick={() => onSelect(opt)}
						>
							{THEME_ICONS[opt]}
							{THEME_LABELS[opt]}
						</Button>
					))}
				</div>
			)}
		</div>
	);
}
