import { useAppStore } from "../store";
import { ConfirmDialog } from "./ui/ConfirmDialog";

export function CloseTabDialog() {
	const { tabs, closeConfirmTabId, setCloseConfirmTabId, closeTabForce } =
		useAppStore();

	const tab = tabs.find((t) => t.id === closeConfirmTabId);

	return (
		<ConfirmDialog
			open={closeConfirmTabId !== null}
			title="Close unsaved tab?"
			description={
				<>
					<strong>{tab?.name}</strong> has unsaved changes. Closing it will
					discard them.
				</>
			}
			confirmLabel="Close anyway"
			cancelLabel="Cancel"
			confirmVariant="destructive"
			size="sm"
			onConfirm={() => {
				if (closeConfirmTabId) closeTabForce(closeConfirmTabId);
				setCloseConfirmTabId(null);
			}}
			onCancel={() => setCloseConfirmTabId(null)}
		/>
	);
}
