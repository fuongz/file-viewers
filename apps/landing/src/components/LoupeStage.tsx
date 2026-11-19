import { Pause, Play } from "lucide-react";
import {
	type AnimationPlaybackControls,
	animate,
	useMotionValue,
	useSpring,
} from "motion/react";
import {
	type CSSProperties,
	type PointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import type { Shot } from "../shots";
import { Crumbs } from "./Crumbs";
import { ShotWindow } from "./ShotWindow";

const ZOOM = 2.2;
/** Loupe scale while it drifts on its own, and while the pointer drives it. */
const IDLE_SCALE = 0.9;
const FOLLOW = { stiffness: 170, damping: 24, mass: 0.6 };

/**
 * A screenshot on the orange stage with a magnifying loupe. Left alone, the
 * loupe drifts slowly along one row of data; a mouse takes it over and it
 * follows with a slight spring lag. Under reduced motion it stays parked.
 */
export function LoupeStage({
	shot,
	alt,
	caption,
	row,
}: {
	shot: Shot;
	alt: string;
	/** Where the capture is, outermost first: the file, then the view. */
	caption: readonly string[];
	/** The row the idle loupe drifts along, as fractions of the window. */
	row: { y: number; from: number; to: number };
}) {
	const stageRef = useRef<HTMLDivElement>(null);
	const loupeRef = useRef<HTMLDivElement>(null);
	const driftRef = useRef<AnimationPlaybackControls | null>(null);
	const [still, setStill] = useState(true);
	const [following, setFollowing] = useState(false);
	const [inView, setInView] = useState(false);
	/** The visitor can stop the idle drift (WCAG 2.2.2). */
	const [drifting, setDrifting] = useState(true);

	const restX = (row.from + row.to) / 2;

	const tx = useMotionValue(restX);
	const ty = useMotionValue(row.y);
	const fx = useSpring(tx, FOLLOW);
	const fy = useSpring(ty, FOLLOW);
	const ls = useSpring(1, { stiffness: 260, damping: 26 });

	// Motion is off until we know the user allows it.
	useEffect(() => {
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setStill(reduce.matches);
		update();
		reduce.addEventListener("change", update);
		return () => reduce.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		const stage = stageRef.current;
		if (!stage) return;
		const observer = new IntersectionObserver(
			([entry]) => setInView(entry.isIntersecting),
			{ threshold: 0.1 },
		);
		observer.observe(stage);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		const loupe = loupeRef.current;
		const write = (name: string) => (value: number) =>
			loupe?.style.setProperty(name, String(value));
		const stops = [
			fx.on("change", write("--fx")),
			fy.on("change", write("--fy")),
			ls.on("change", write("--ls")),
		];
		return () => {
			for (const stop of stops) stop();
		};
	}, [fx, fy, ls]);

	// Idle drift: back and forth along the row, only while visible and idle.
	useEffect(() => {
		driftRef.current?.stop();
		driftRef.current = null;
		if (still) {
			tx.jump(restX);
			ty.jump(row.y);
			fx.jump(restX);
			fy.jump(row.y);
			ls.jump(1);
			return;
		}
		if (following || !inView || !drifting) return;
		ty.set(row.y);
		ls.set(IDLE_SCALE);
		driftRef.current = animate(tx, [tx.get(), row.to, row.from, tx.get()], {
			duration: 14,
			ease: "easeInOut",
			times: [0, 0.3, 0.8, 1],
			repeat: Number.POSITIVE_INFINITY,
		});
		return () => driftRef.current?.stop();
	}, [still, following, inView, drifting]);

	function follow(event: PointerEvent<HTMLDivElement>) {
		if (still || event.pointerType !== "mouse") return;
		// Stop the drift now, not after React re-renders, or its next frame
		// would overwrite the pointer position.
		driftRef.current?.stop();
		const box = event.currentTarget.getBoundingClientRect();
		tx.set(Math.min(Math.max((event.clientX - box.left) / box.width, 0), 1));
		ty.set(Math.min(Math.max((event.clientY - box.top) / box.height, 0), 1));
		if (!following) {
			setFollowing(true);
			ls.set(1);
		}
	}

	function release() {
		if (!following) return;
		setFollowing(false);
	}

	return (
		<figure className="stage" ref={stageRef}>
			<div className="stage-field">
				<ShotWindow
					shot={shot}
					alt={alt}
					priority
					className="stage-window"
					data-following={following || undefined}
					onPointerMove={follow}
					onPointerLeave={release}
				>
					<div
						ref={loupeRef}
						className="loupe"
						aria-hidden="true"
						style={
							{
								"--fx": restX,
								"--fy": row.y,
								"--ls": 1,
								"--zoom": ZOOM,
							} as CSSProperties
						}
					>
						<span className="loupe-reticle" />
						<span className="loupe-power">{ZOOM}×</span>
					</div>
				</ShotWindow>
			</div>
			<figcaption className="stage-caption">
				<span>
					<Crumbs items={caption} />
				</span>
				{!still && (
					<>
						<span className="stage-hint">
							Move the pointer over the window to steer the lens
						</span>
						<button
							type="button"
							className="pill-toggle"
							onClick={() => setDrifting((value) => !value)}
						>
							{drifting ? (
								<Pause size={14} aria-hidden="true" />
							) : (
								<Play size={14} aria-hidden="true" />
							)}
							{drifting ? "Pause lens" : "Play lens"}
						</button>
					</>
				)}
			</figcaption>
		</figure>
	);
}
