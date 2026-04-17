import type { ReactNode } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./AlertDialog";

interface ConfirmDialogProps {
	open: boolean;
	title: string;
	description?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	confirmVariant?: "default" | "destructive";
	size?: "sm" | "default";
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
	confirmVariant = "default",
	size = "default",
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
			<AlertDialogContent size={size}>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={onCancel}>
						{cancelLabel}
					</AlertDialogCancel>
					<AlertDialogAction variant={confirmVariant} onClick={onConfirm}>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
