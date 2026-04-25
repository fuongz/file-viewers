import { useEffect } from "react";
import { STORAGE_THEME_KEY } from "../constants";
import { selectIsDark, useAppStore } from "../store";

export function useTheme() {
	const themePref = useAppStore((s) => s.themePref);
	const setSystemDark = useAppStore((s) => s.setSystemDark);
	const isDark = useAppStore(selectIsDark);

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_THEME_KEY, themePref);
		} catch {}
		document.documentElement.setAttribute(
			"data-theme",
			isDark ? "dark" : "light",
		);
		document.documentElement.classList.toggle("dark", isDark);
	}, [isDark, themePref]);

	useEffect(() => {
		if (themePref !== "system") return;
		const mq = window.matchMedia("(prefers-color-scheme: dark)");
		const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
		mq.addEventListener("change", handler);
		return () => mq.removeEventListener("change", handler);
	}, [themePref, setSystemDark]);
}
