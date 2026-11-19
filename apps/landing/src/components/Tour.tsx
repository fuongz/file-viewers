import { Pause, Play } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { type ShotName, shots } from "../shots";
import { Crumbs } from "./Crumbs";
import { ShotCrop } from "./ShotWindow";

const steps = [
	{
		id: "open",
		focus: { x: 0.022, y: 0.018 },
		verb: "Open",
		shot: "json",
		text: "Every file opens in its own tab with a ⌘-number shortcut. Drag tabs to reorder them, or jump between them from the command palette.",
		caption: ["config.json", "42 nodes", "2 files open"],
		alt: "Two files open as tabs, with config.json expanded as a collapsible tree of nested objects.",
	},
	{
		id: "query",
		focus: { x: 0.022, y: 0.018 },
		verb: "Query",
		shot: "sqliteQuery",
		text: "Write SQL with highlighting and run it read-only against the database. Results land in a grid under the editor.",
		caption: ["shop.db", "query", "39 rows read in 4.9 ms"],
		alt: "A SQL query joining customers, orders and order items, with revenue per customer in a results grid.",
	},
	{
		id: "diagram",
		focus: { x: 0.022, y: 0.018 },
		verb: "Diagram",
		shot: "schema",
		text: "See how tables connect through their foreign keys, then let auto arrange tidy the canvas.",
		caption: ["shop.db", "schema diagram", "5 tables"],
		alt: "A schema diagram linking order items, orders, products, categories and customers.",
	},
	{
		id: "filter",
		focus: { x: 0.022, y: 0.018 },
		verb: "Filter",
		shot: "csvSql",
		text: "Filter a CSV with a SQL condition, sort the matches by any column, and keep the raw file open beside the grid.",
		caption: ["orders.csv", "status = 'paid' AND amount > 50", "42 rows"],
		alt: "A CSV file with its raw text on the left and, on the right, the rows matching status = 'paid' AND amount > 50, sorted by amount.",
	},
	{
		id: "read",
		focus: { x: 0.022, y: 0.018 },
		verb: "Read",
		shot: "markdown",
		text: "Write Markdown on the left and read the preview on the right, with tables and highlighted code.",
		caption: ["notes.md", "source and preview side by side"],
		alt: "A Markdown file in split view: the source on the left, and the rendered milestones table and code block on the right.",
	},
] as const satisfies ReadonlyArray<{
	id: string;
	verb: string;
	shot: ShotName;
	/** Top left corner of the crop, as fractions of the capture. */
	focus: { x: number; y: number };
	text: string;
	caption: readonly string[];
	alt: string;
}>;

/** Must match the width at which styles.css puts the verbs in a row. */
const STACKED_QUERY = "(min-width: 961px)";

/** How long each step stays up while the tour plays on its own. */
const STEP_MS = 5000;

export function Tour() {
	const [active, setActive] = useState(0);
	/** False once the visitor takes over or presses pause. */
	const [autoplay, setAutoplay] = useState(true);
	const [hovered, setHovered] = useState(false);
	const [focused, setFocused] = useState(false);
	const [inView, setInView] = useState(false);
	const rootRef = useRef<HTMLDivElement>(null);
	const tabs = useRef<Array<HTMLButtonElement | null>>([]);
	const reduce = useReducedMotion();
	/** The verbs stack beside the view on wide screens and sit in a row above it on narrow ones. */
	const [stacked, setStacked] = useState(true);
	const step = steps[active];
	const canPlay = autoplay && !reduce;
	const running = canPlay && !hovered && !focused && inView;

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const observer = new IntersectionObserver(
			([entry]) => setInView(entry.isIntersecting),
			{ threshold: 0.35 },
		);
		observer.observe(root);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const wide = window.matchMedia(STACKED_QUERY);
		const update = () => setStacked(wide.matches);
		update();
		wide.addEventListener("change", update);
		return () => wide.removeEventListener("change", update);
	}, []);

	// Keyboard focus anywhere in the tour holds it, except on the play/pause
	// button, which would otherwise stop its own Play from taking effect.
	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		const onFocusIn = (event: FocusEvent) =>
			setFocused(!(event.target as HTMLElement).closest(".pill-toggle"));
		const onFocusOut = (event: FocusEvent) => {
			if (!root.contains(event.relatedTarget as Node | null)) setFocused(false);
		};
		root.addEventListener("focusin", onFocusIn);
		root.addEventListener("focusout", onFocusOut);
		return () => {
			root.removeEventListener("focusin", onFocusIn);
			root.removeEventListener("focusout", onFocusOut);
		};
	}, []);

	/** A visitor's choice always wins over the automatic tour. */
	function choose(index: number, moveFocus: boolean) {
		setAutoplay(false);
		setActive(index);
		if (moveFocus) tabs.current[index]?.focus();
	}

	function advance() {
		setActive((current) => (current + 1) % steps.length);
	}

	function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		const last = steps.length - 1;
		switch (event.key) {
			case "ArrowDown":
			case "ArrowRight":
				choose(active === last ? 0 : active + 1, true);
				break;
			case "ArrowUp":
			case "ArrowLeft":
				choose(active === 0 ? last : active - 1, true);
				break;
			case "Home":
				choose(0, true);
				break;
			case "End":
				choose(last, true);
				break;
			default:
				return;
		}
		event.preventDefault();
	}

	return (
		<div ref={rootRef} className="tour">
			<div className="tour-side">
				{!reduce && (
					<button
						type="button"
						className="pill-toggle"
						onClick={() => setAutoplay((value) => !value)}
					>
						{autoplay ? (
							<Pause size={14} aria-hidden="true" />
						) : (
							<Play size={14} aria-hidden="true" />
						)}
						{autoplay ? "Pause tour" : "Play tour"}
					</button>
				)}
				<div
					role="tablist"
					aria-label="App tour"
					aria-orientation={stacked ? "vertical" : "horizontal"}
					className="tour-tabs"
				>
					{steps.map(({ id, verb }, index) => (
						<button
							key={id}
							id={`tour-tab-${id}`}
							ref={(tab) => {
								tabs.current[index] = tab;
							}}
							type="button"
							role="tab"
							aria-selected={index === active}
							aria-controls="tour-panel"
							tabIndex={index === active ? 0 : -1}
							onClick={() => choose(index, false)}
							onKeyDown={onKeyDown}
							className="tour-tab"
						>
							<span className="tour-verb">{verb}</span>
							<span className="tour-track" aria-hidden="true">
								{index === active && canPlay && (
									<span
										key={active}
										className="tour-progress"
										style={{
											animationDuration: `${STEP_MS}ms`,
											animationPlayState: running ? "running" : "paused",
										}}
										onAnimationEnd={advance}
									/>
								)}
							</span>
						</button>
					))}
				</div>
			</div>
			<div
				id="tour-panel"
				role="tabpanel"
				aria-labelledby={`tour-tab-${step.id}`}
				// biome-ignore lint/a11y/noNoninteractiveTabindex: the WAI-ARIA tabs pattern makes a panel with no focusable content focusable, so Tab from the tab list reaches it
				tabIndex={0}
				className="tour-panel"
				onPointerEnter={() => setHovered(true)}
				onPointerLeave={() => setHovered(false)}
			>
				<div className="tour-frame">
					{steps.map(({ id, shot, focus, alt }, index) => {
						const current = index === active;
						// The slide belongs to the automatic tour; a visitor's own
						// choice switches quickly, by opacity only.
						const shift = reduce || !autoplay ? 0 : index < active ? -10 : 10;
						return (
							<motion.div
								key={id}
								className="tour-layer"
								aria-hidden={current ? undefined : true}
								initial={false}
								animate={{
									opacity: current ? 1 : 0,
									transform: `translateX(${current ? 0 : shift}px)`,
								}}
								transition={{
									duration: reduce ? 0 : autoplay ? 0.42 : 0.15,
									ease: [0.23, 1, 0.32, 1],
								}}
							>
								<ShotCrop
									shot={shots[shot]}
									focus={focus}
									scale={0.42}
									label={current ? alt : undefined}
								/>
							</motion.div>
						);
					})}
				</div>
				<div className="tour-copy">
					<p className="mono-note tour-caption">
						<Crumbs items={step.caption} />
					</p>
					<p className="tour-text">{step.text}</p>
				</div>
			</div>
		</div>
	);
}
