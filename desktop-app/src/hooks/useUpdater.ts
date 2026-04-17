import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { createElement, useEffect } from "react";
import { toast } from "sonner";
import { UpdateToast } from "@/components/ui/UpdateToast";

let checked = false;

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

export function useUpdater() {
	useEffect(() => {
		if (checked) return;
		checked = true;
		const run = async () => {
			try {
				const update = await check();
				if (!update) return;
				showUpdateToast(
					`v${update.version}`,
					update.body ?? undefined,
					async () => {
						await update.downloadAndInstall();
						await relaunch();
					},
				);
			} catch {}
		};

		const timer = setTimeout(run, 3000);
		return () => clearTimeout(timer);
	}, []);
}
