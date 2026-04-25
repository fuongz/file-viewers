import { IconFileUploadFilled } from "@tabler/icons-react";

export function DragOverlay() {
	return (
		<div className="fixed z-100 inset-0 flex items-center w-full h-full justify-center bg-black/50 backdrop-blur-sm transition pointer-events-none animate-drag-fade-in p-4">
			<div className="border-dashed border-3 flex items-center justify-center w-full h-full rounded-xl border-border/20">
				<div className="text-center flex flex-col gap-4 items-center justify-center animate-bounce">
					<IconFileUploadFilled className="text-white/50 size-24" />
					<span className="text-white/50 font-semibold">
						Release to drop...
					</span>
				</div>
			</div>
		</div>
	);
}
