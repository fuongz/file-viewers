import { Button as BaseButton } from "@base-ui/react";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva("cursor-pointer transition-colors", {
	variants: {
		size: {
			sm: "text-[11px] px-2 py-[3px]",
			md: "text-[13px] px-3 py-[5px]",
			lg: "text-[15px] px-4 py-2",
			"icon-sm": "inline-flex items-center justify-center w-4 h-4 rounded",
			"icon-md": "inline-flex items-center justify-center w-5 h-5 rounded",
			"icon-lg": "inline-flex items-center justify-center w-7 h-7 rounded",
		},
		variant: {
			// Toolbar ghost buttons: Format, Minify, theme toggle
			toolbar:
				"inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-md " +
				"bg-transparent border-0 " +
				"text-[var(--text-muted)] text-[11px] font-medium uppercase duration-150 " +
				"hover:text-[var(--text-primary)] hover:bg-[var(--tabs-bg)]",

			// Dropdown menu items: theme options
			ghost:
				"flex items-center gap-[7px] w-full px-[10px] py-[5px] " +
				"bg-transparent border-0 " +
				"text-[var(--text-muted)] text-xs " +
				"text-left duration-[120ms] " +
				"hover:text-[var(--text-primary)] hover:bg-[var(--tabs-bg)] " +
				"data-[active]:text-[var(--tab-active-text)] data-[active]:bg-[var(--tab-active-pill-bg)]",

			// Square icon-only buttons: code block collapse/copy
			icon:
				"inline-flex items-center justify-center w-5 h-5 rounded " +
				"bg-transparent border-0 " +
				"text-[var(--text-muted)] duration-150 " +
				"hover:text-[var(--text-primary)] hover:bg-[var(--tabs-bg)]",

			// Bordered buttons with primary hover: CSV mode toggle
			outline:
				"inline-flex items-center gap-[5px] px-2 py-[3px] rounded " +
				"bg-transparent border border-[var(--border)] " +
				"text-[var(--text-muted)] text-[11px] font-medium " +
				"flex-shrink-0 duration-150 ",

			// Filled primary button using grenadier palette
			primary:
				"inline-flex items-center gap-[5px] px-3 py-1 rounded-md " +
				"bg-[var(--color-grenadier-600)] border-0 " +
				"text-white text-[11px] font-medium duration-150 " +
				"hover:bg-[var(--color-grenadier-500)] " +
				"active:bg-[var(--color-grenadier-700)]",

			link:
				"bg-transparent border-0 p-0 " +
				"text-[13px] text-[var(--text-primary)] " +
				"text-left hover:underline underline-offset-2",

			// Destructive action buttons: delete, remove
			destructive:
				"inline-flex items-center gap-[5px] px-3 py-1 rounded-md " +
				"bg-red-600 border-0 " +
				"text-white text-[11px] font-medium duration-150 " +
				"hover:bg-red-500 " +
				"active:bg-red-700",
		},
	},
	defaultVariants: {
		variant: "toolbar",
	},
});

interface ButtonProps
	extends ComponentProps<typeof BaseButton>,
		VariantProps<typeof buttonVariants> {
	active?: boolean;
}

export function Button({
	variant,
	size,
	active,
	className,
	...props
}: ButtonProps) {
	return (
		<BaseButton
			data-active={active || undefined}
			className={cn(buttonVariants({ variant, size }), className)}
			{...props}
		/>
	);
}
