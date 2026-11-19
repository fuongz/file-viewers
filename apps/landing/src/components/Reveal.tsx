import { animate, inView } from "motion";
import { type ElementType, type ReactNode, useEffect, useRef } from "react";

/**
 * Fades its content up once it scrolls into view. The server renders the
 * content visible, so nothing is hidden without JavaScript, and content that
 * is already on screen at load or under reduced motion never moves.
 */
export function Reveal({
	as: Tag = "div",
	children,
	className,
	delay = 0,
}: {
	as?: ElementType;
	children: ReactNode;
	className?: string;
	delay?: number;
}) {
	const ref = useRef<HTMLElement>(null);

	useEffect(() => {
		const element = ref.current;
		if (!element) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		if (element.getBoundingClientRect().top < window.innerHeight * 0.92) return;

		element.style.opacity = "0";
		element.style.transform = "translateY(12px)";
		return inView(
			element,
			() => {
				animate(
					element,
					{ opacity: 1, transform: "translateY(0px)" },
					{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] },
				);
			},
			{ margin: "0px 0px -8% 0px" },
		);
	}, [delay]);

	return (
		<Tag ref={ref} className={className}>
			{children}
		</Tag>
	);
}
