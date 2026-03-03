import { Input as BaseInput } from "@base-ui/react";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const inputVariants = cva(
	"w-[180px] py-1 px-[10px] rounded border border-[var(--border)] " +
		"bg-[var(--input-bg)] text-[var(--text-primary)] text-[13px] " +
		"outline-none transition-[border-color] duration-150 " +
		"focus:border-[var(--color-grenadier-400)] focus:ring focus:ring-[var(--color-grenadier-200)] placeholder:text-[var(--text-muted)]",
);

export function Input({
	className,
	...props
}: ComponentProps<typeof BaseInput>) {
	return <BaseInput className={cn(inputVariants(), className)} {...props} />;
}
