import {
	IconLayoutSidebarLeftCollapse,
	IconLayoutSidebarLeftExpand,
} from "@tabler/icons-react";
import type { Format } from "../../types";
import { Button } from "../ui";

interface ToolbarActionsProps {
	format: Format;
	showEditor: boolean;
	onToggleEditor: () => void;
}

export function ToolbarActions({
	format,
	showEditor,
	onToggleEditor,
}: ToolbarActionsProps) {
	return (
		<div className="toolbar-actions gap-2">
			{format !== "xlsx" && (
				<Button
					onClick={onToggleEditor}
					title={showEditor ? "Hide editor" : "Show editor"}
				>
					{showEditor ? (
						<>
							<IconLayoutSidebarLeftCollapse size={15} stroke={1.5} />
							Hide editor
						</>
					) : (
						<>
							<IconLayoutSidebarLeftExpand size={15} stroke={1.5} />
							Show editor
						</>
					)}
				</Button>
			)}
		</div>
	);
}
