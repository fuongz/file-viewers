import { useEffect, useRef } from "react";
import { useAppStore } from "../store";
import { diskModifiedAt } from "./useFileManager";

const POLL_INTERVAL_MS = 1500;
const RACY_THRESHOLD_MS = 1000;

function isLocalPath(path: string) {
	return /^(\/|[a-zA-Z]:[\\/]|\\\\)/.test(path);
}

/**
 * Polls open files for external edits.
 * Clean tabs reload silently; tabs with unsaved edits get a banner instead.
 */
export function useFileWatcher(reloadFromDisk: (id: string) => Promise<void>) {
	const reloadRef = useRef(reloadFromDisk);
	reloadRef.current = reloadFromDisk;

	useEffect(() => {
		let canceled = false;
		let running = false;

		async function poll() {
			if (running || document.visibilityState !== "visible") return;
			running = true;
			try {
				const { tabs } = useAppStore.getState();
				for (const tab of tabs) {
					if (canceled) return;
					if (!tab.path || !isLocalPath(tab.path) || tab.isLoading) continue;
					const modifiedAt = await diskModifiedAt(tab.path);
					if (modifiedAt === undefined || canceled) continue;

					const current = useAppStore
						.getState()
						.tabs.find((t) => t.id === tab.id);
					if (!current?.path) continue;
					const known = current.diskModifiedAt ?? modifiedAt;
					if (modifiedAt <= known + RACY_THRESHOLD_MS) {
						if (current.diskModifiedAt === undefined) {
							useAppStore
								.getState()
								.setTabs((prev) =>
									prev.map((t) =>
										t.id === current.id
											? { ...t, diskModifiedAt: modifiedAt }
											: t,
									),
								);
						}
						continue;
					}

					if (current.isDirty) {
						useAppStore
							.getState()
							.setTabs((prev) =>
								prev.map((t) =>
									t.id === current.id ? { ...t, hasExternalChange: true } : t,
								),
							);
					} else {
						await reloadRef.current(current.id);
					}
				}
			} finally {
				running = false;
			}
		}

		void poll();
		const interval = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
		const onVisibility = () => {
			if (document.visibilityState === "visible") void poll();
		};
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			canceled = true;
			window.clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, []);
}
