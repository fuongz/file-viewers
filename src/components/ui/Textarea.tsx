import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const textareaVariants = cva(
	"w-full py-2 px-3 rounded border border-[var(--border)] " +
		"bg-[var(--input-bg)] text-[var(--text-primary)] text-[13px] " +
		"outline-none resize-y transition-[border-color] duration-150 " +
		"focus:border-[var(--accent)] placeholder:text-[var(--text-muted)]",
);

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
	return <textarea className={cn(textareaVariants(), className)} {...props} />;
}
