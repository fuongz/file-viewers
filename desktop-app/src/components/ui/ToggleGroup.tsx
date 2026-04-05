import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { createContext, useContext } from "react";
import { cn } from "@/lib/utils";

const ToggleGroupContext = createContext<{
	variant?: "default" | "outline";
	size?: "default" | "sm" | "lg";
}>({ variant: "default", size: "default" });

function ToggleGroup({
	className,
	variant = "default",
	size = "default",
	children,
	...props
}: ToggleGroupPrimitive.Props & {
	variant?: "default" | "outline";
	size?: "default" | "sm" | "lg";
}) {
	return (
		<ToggleGroupPrimitive
			data-slot="toggle-group"
			data-variant={variant}
			data-size={size}
			className={cn("toggle-group-root", className)}
			{...props}
		>
			<ToggleGroupContext.Provider value={{ variant, size }}>
				{children}
			</ToggleGroupContext.Provider>
		</ToggleGroupPrimitive>
	);
}

function ToggleGroupItem({
	className,
	children,
	variant,
	size,
	...props
}: TogglePrimitive.Props & {
	variant?: "default" | "outline";
	size?: "default" | "sm" | "lg";
}) {
	const context = useContext(ToggleGroupContext);

	return (
		<TogglePrimitive
			data-slot="toggle-group-item"
			data-variant={context.variant || variant}
			data-size={context.size || size}
			className={cn("toggle-group-item", className)}
			{...props}
		>
			{children}
		</TogglePrimitive>
	);
}

export { ToggleGroup, ToggleGroupItem };
