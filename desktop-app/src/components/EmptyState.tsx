import { IconBraces, IconMarkdown, IconTable } from "@tabler/icons-react";
import { Button } from "./ui";

interface EmptyStateProps {
	onOpenFile: () => void;
}

function Kbd({ children }: { children: React.ReactNode }) {
	return <span className="es-kbd">{children}</span>;
}

export function EmptyState({ onOpenFile }: EmptyStateProps) {
	return (
		<div className="empty-state">
			{/* Ghost brand mark — trio of format icons */}
			<div className="es-brand">
				<div className="es-brand-row">
					<IconMarkdown size={48} stroke={1.2} />
				</div>
				<div className="es-brand-row">
					<IconBraces size={48} stroke={1.2} />
					<IconTable size={48} stroke={1.2} />
				</div>
			</div>

			{/* Action list */}
			<ul className="es-actions">
				<li>
					<Button variant="link" onClick={onOpenFile}>
						Open File
					</Button>
					<span className="es-keys">
						<Kbd>⌘</Kbd>
						<Kbd>O</Kbd>
					</span>
				</li>
				<li>
					<span className="es-action-label">Drop a file anywhere</span>
					<span className="es-keys">
						<Kbd>↓</Kbd>
					</span>
				</li>
			</ul>
		</div>
	);
}
