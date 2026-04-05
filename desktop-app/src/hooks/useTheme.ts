import { useEffect, useState } from "react";
import { STORAGE_THEME_KEY } from "../constants";
import type { ThemePreference } from "../types";

function readStoredTheme(): ThemePreference {
	try {
		const raw = localStorage.getItem(STORAGE_THEME_KEY);
		if (raw === "system" || raw === "dark" || raw === "light") {
			const isDark =
				raw === "dark" ||
				(raw === "system" &&
					window.matchMedia("(prefers-color-scheme: dark)").matches);
			document.documentElement.setAttribute(
				"data-theme",
				isDark ? "dark" : "light",
			);
			document.documentElement.classList.toggle("dark", isDark);
			return raw;
		}
	} catch {}
	return "system";
}

export function useTheme() {
	const [themePref, setThemePref] = useState<ThemePreference>(readStoredTheme);
	const [systemDark, setSystemDark] = useState(
		() => window.matchMedia("(prefers-color-scheme: dark)").matches,
	);

	const isDark = themePref === "dark" || (themePref === "system" && systemDark);

	useEffect(() => {
		document.documentElement.setAttribute(
			"data-theme",
			isDark ? "dark" : "light",
		);
		document.documentElement.classList.toggle("dark", isDark);
	}, [isDark]);

	useEffect(() => {
		if (themePref !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [themePref]);

	return {
		themePref,
		setThemePref,
		isDark,
	};
}
