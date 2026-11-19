import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { createElement, useEffect } from "react";
import { toast } from "sonner";
import { UpdateToast } from "@/components/ui/UpdateToast";

function showUpdateToast(update: Update) {
	toast.custom(
		(toastId) =>
			createElement(UpdateToast, {
				id: toastId,
				version: `v${update.version}`,
				body: update.body ?? undefined,
				onInstall: async () => {
					await update.downloadAndInstall();
					await relaunch();
				},
			}),
		{ id: "available-update", duration: Infinity },
	);
}

let pendingCheck: ReturnType<typeof check> | null = null;

async function checkForUpdates(manual = false) {
	if (manual) toast.loading("Checking for updates…", { id: "update-check" });

	try {
		pendingCheck ??= check({ timeout: 15_000 }).finally(() => {
			pendingCheck = null;
		});
		const update = await pendingCheck;
		if (!update) {
			if (manual) toast.info("You're up to date!", { id: "update-check" });
			return;
		}
		if (manual) toast.dismiss("update-check");
		showUpdateToast(update);
	} catch {
		if (manual)
			toast.error("Could not check for updates.", { id: "update-check" });
	}
}

let checked = false;

export function useUpdater() {
	useEffect(() => {
		if (checked) return;
		const timer = setTimeout(() => {
			checked = true;
			void checkForUpdates();
		}, 3000);
		return () => clearTimeout(timer);
	}, []);

	return { checkNow: () => checkForUpdates(true) };
}
