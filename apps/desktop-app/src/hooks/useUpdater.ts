import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { createElement, useEffect } from "react";
import { toast } from "sonner";
import { UpdateToast } from "@/components/ui/UpdateToast";

function showUpdateToast(
	version: string,
	body?: string,
	onInstall?: () => Promise<void>,
) {
	toast.custom(
		(toastId) =>
			createElement(UpdateToast, {
				id: toastId,
				version,
				body,
				onInstall: onInstall ?? (async () => {}),
			}),
		{ duration: Infinity },
	);
}

async function checkForUpdates(showNoUpdateToast = false) {
	try {
		const update = await check();
		if (!update) {
			if (showNoUpdateToast) toast.info("You're up to date!");
			return;
		}
		showUpdateToast(
			`v${update.version}`,
			update.body ?? undefined,
			async () => {
				await update.downloadAndInstall();
				await relaunch();
			},
		);
	} catch {
		if (showNoUpdateToast)
			toast.error(
				import.meta.env.DEV
					? "You are in dev mode!"
					: "Could not check for updates.",
			);
	}
}

let checked = false;

export function useUpdater() {
	useEffect(() => {
		if (checked) return;
		checked = true;
		const timer = setTimeout(() => checkForUpdates(false), 3000);
		return () => clearTimeout(timer);
	}, []);

	return { checkNow: () => checkForUpdates(true) };
}
