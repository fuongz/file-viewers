import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: () => void;
	onCancel: () => void;
	children?: ReactNode;
}

export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	return (
		<BaseDialog.Root open={open} onOpenChange={(o) => !o && onCancel()}>
			<BaseDialog.Portal>
				<BaseDialog.Backdrop className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
				<BaseDialog.Popup className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[360px] rounded-xl bg-[var(--bg-toolbar)] border border-[var(--border)] shadow-2xl p-5 flex flex-col gap-4 outline-none">
					<BaseDialog.Title className="text-[var(--text-primary)] text-sm font-semibold leading-snug m-0">
						{title}
					</BaseDialog.Title>
					{description && (
						<BaseDialog.Description className="text-[var(--text-muted)] text-xs leading-relaxed m-0">
							{description}
						</BaseDialog.Description>
					)}
					<div className="flex justify-end gap-2 mt-1">
						<Button variant="outline" onClick={onCancel}>
							{cancelLabel}
						</Button>
						<Button variant="primary" onClick={onConfirm}>
							{confirmLabel}
						</Button>
					</div>
				</BaseDialog.Popup>
			</BaseDialog.Portal>
		</BaseDialog.Root>
	);
}
