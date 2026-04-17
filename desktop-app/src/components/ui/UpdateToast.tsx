import { IconDownload, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./button";

interface UpdateToastProps {
	id: string | number;
	version: string;
	body?: string;
	onInstall: () => Promise<void>;
}

export function UpdateToast({
	id,
	version,
	body,
	onInstall,
}: UpdateToastProps) {
	const [status, setStatus] = useState<"idle" | "installing">("idle");

	const handleInstall = async () => {
		setStatus("installing");
		try {
			await onInstall();
		} catch {
			setStatus("idle");
		}
	};

	return (
		<div className="flex w-full items-start gap-3 px-4 py-2 bg-card rounded-lg shadow-2xl ring ring-ring/10">
			<div className="flex min-w-0 flex-1 flex-col gap-2.5">
				<div className="flex flex-col gap-0.5">
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold text-foreground">
							Update available
						</span>
						<span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
							{version}
						</span>
					</div>
					<p className="text-[11px] leading-snug text-muted-foreground">
						{body || "A new version is ready to install."}
					</p>
				</div>

				{status === "installing" ? (
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<IconLoader2 className="size-3 animate-spin" />
						<span>Downloading and installing...</span>
					</div>
				) : (
					<div className="flex items-center gap-1.5">
						<Button
							size="sm"
							variant="default"
							className="h-6 gap-1 px-2 text-[11px]"
							onClick={handleInstall}
						>
							<IconDownload className="size-3" />
							Install & restart
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
							onClick={() => toast.dismiss(id)}
						>
							Later
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
