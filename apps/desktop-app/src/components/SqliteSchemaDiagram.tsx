import {
	IconDatabase,
	IconKey,
	IconLayoutGrid,
	IconLink,
	IconZoomIn,
	IconZoomOut,
} from "@tabler/icons-react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import type { SchemaTable } from "./SqliteData";
import { Button } from "./ui/button";

const CARD_WIDTH = 232;
const HEADER_HEIGHT = 38;
const ROW_HEIGHT = 26;
const ROW_PADDING = 8;
const GAP_X = 140;
const GAP_Y = 36;
const CANVAS_PADDING = 32;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const TRACKPAD_RELEASE_MS = 100;

interface Point {
	x: number;
	y: number;
}

type TrackpadGesture = { phase: "begin" | "end" } | ({ phase: "move" } & Point);

interface Edge {
	from: string;
	to: string;
	sourceRow: number;
	targetRow: number;
}

function edgePath(edge: Edge, from: Point, to: Point) {
	const x1 = from.x + CARD_WIDTH;
	const x2 = to.x;
	const rowCenter = HEADER_HEIGHT + ROW_HEIGHT / 2;
	const y1 = from.y + rowCenter + edge.sourceRow * ROW_HEIGHT;
	const y2 = to.y + rowCenter + edge.targetRow * ROW_HEIGHT;
	const bend = Math.max(40, Math.abs(x2 - x1) / 2) * (x2 >= x1 ? 1 : -1);
	return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

function nodeTransform(point: Point) {
	return `translate(${point.x}px, ${point.y}px)`;
}

interface NodeMotion {
	source: "pointer" | "trackpad";
	name: string;
	element: HTMLElement;
	edges: { edge: Edge; path: SVGPathElement }[];
	point: Point;
	initial: Point;
	height: number;
	stageSize: Point;
}

function cardHeight(table: SchemaTable) {
	return HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + ROW_PADDING;
}

function autoLayout(tables: SchemaTable[]): Record<string, Point> {
	const byName = new Map(tables.map((table) => [table.name, table]));
	const layers = new Map<string, number>();
	const visiting = new Set<string>();

	// Tables that reference this table. Referencing tables sit to the left,
	// so referenced tables get deeper layers and are drawn to the right.
	const referencedBy = new Map<string, string[]>();
	for (const table of tables) {
		for (const column of table.columns) {
			const target = column.references?.table;
			if (!target || !byName.has(target)) continue;
			const children = referencedBy.get(target) ?? [];
			if (!children.includes(table.name)) children.push(table.name);
			referencedBy.set(target, children);
		}
	}

	function layerOf(name: string): number {
		const cached = layers.get(name);
		if (cached !== undefined) return cached;
		if (visiting.has(name)) return 0;
		visiting.add(name);
		const children = referencedBy.get(name) ?? [];
		const layer = children.length
			? 1 + Math.max(...children.map((child) => layerOf(child)))
			: 0;
		visiting.delete(name);
		layers.set(name, layer);
		return layer;
	}

	const buckets = new Map<number, SchemaTable[]>();
	for (const table of [...tables].sort((a, b) =>
		a.name.localeCompare(b.name),
	)) {
		const layer = layerOf(table.name);
		const bucket = buckets.get(layer) ?? [];
		bucket.push(table);
		buckets.set(layer, bucket);
	}

	const positions: Record<string, Point> = {};
	for (const [layer, bucket] of buckets) {
		let y = 0;
		for (const table of bucket) {
			positions[table.name] = {
				x: CANVAS_PADDING + layer * (CARD_WIDTH + GAP_X),
				y: CANVAS_PADDING + y,
			};
			y += cardHeight(table) + GAP_Y;
		}
	}
	return positions;
}

export function SqliteSchemaDiagram({
	path,
	revision,
}: {
	path: string;
	revision: number;
}) {
	const [tables, setTables] = useState<SchemaTable[]>();
	const [error, setError] = useState<string>();
	const [positions, setPositions] = useState<Record<string, Point>>({});
	const [zoom, setZoom] = useState(1);
	const zoomRef = useRef(zoom);
	const desiredZoom = useRef(zoom);
	const zoomAnchor = useRef<{ point: Point; screen: Point } | null>(null);
	const hasCanvas = !!tables?.length && !error;
	const containerRef = useRef<HTMLDivElement>(null);
	const stageRef = useRef<HTMLDivElement>(null);
	const positionsRef = useRef(positions);
	const motion = useRef<NodeMotion | null>(null);
	const frame = useRef<number | null>(null);
	const dragRef = useRef<{
		pointerId: number;
		start: Point;
		scroll: Point;
		scale: number;
	} | null>(null);
	const edges = useMemo(() => {
		const byName = new Map(tables?.map((table) => [table.name, table]));
		return (tables ?? []).flatMap((table) =>
			table.columns.flatMap((column, sourceRow) => {
				const reference = column.references;
				const target = reference && byName.get(reference.table);
				if (!reference || !target) return [];
				return [
					{
						from: table.name,
						to: target.name,
						sourceRow,
						targetRow: Math.max(
							0,
							target.columns.findIndex(
								(field) => field.name === reference.column,
							),
						),
					},
				];
			}),
		);
	}, [tables]);

	useLayoutEffect(() => {
		positionsRef.current = positions;
	}, [positions]);

	const drawNode = useCallback(() => {
		frame.current = null;
		const drag = motion.current;
		if (!drag) return;
		const { element, name, point } = drag;
		element.style.transform = nodeTransform(point);
		for (const { edge, path } of drag.edges) {
			const from = edge.from === name ? point : positionsRef.current[edge.from];
			const to = edge.to === name ? point : positionsRef.current[edge.to];
			if (from && to) path.setAttribute("d", edgePath(edge, from, to));
		}
		const stage = stageRef.current;
		if (!stage) return;
		const scale = zoomRef.current;
		const width = Math.ceil((point.x + CARD_WIDTH + CANVAS_PADDING) * scale);
		const height = Math.ceil((point.y + drag.height + CANVAS_PADDING) * scale);
		// Only relayout the canvas when the dragged node expands its scrollable bounds.
		if (width > drag.stageSize.x) {
			stage.style.setProperty("--drag-width", `${width}px`);
			drag.stageSize.x = width;
		}
		if (height > drag.stageSize.y) {
			stage.style.setProperty("--drag-height", `${height}px`);
			drag.stageSize.y = height;
		}
	}, []);

	const beginNode = useCallback(
		(element: HTMLElement, source: NodeMotion["source"]) => {
			const name = element.dataset.schemaCard;
			const start = name === undefined ? undefined : positionsRef.current[name];
			if (name === undefined || !start || motion.current) return false;
			const paths =
				containerRef.current?.querySelectorAll<SVGPathElement>(
					"[data-schema-edge]",
				);
			const connected = Array.from(paths ?? []).flatMap((path) => {
				const edge = edges[Number(path.dataset.schemaEdge)];
				return edge && (edge.from === name || edge.to === name)
					? [{ edge, path }]
					: [];
			});
			motion.current = {
				source,
				name,
				element,
				edges: connected,
				point: start,
				initial: start,
				height: element.offsetHeight,
				stageSize: {
					x: stageRef.current?.offsetWidth ?? 0,
					y: stageRef.current?.offsetHeight ?? 0,
				},
			};
			element.setAttribute("data-dragging", "");
			return true;
		},
		[edges],
	);

	const moveNode = useCallback(
		(x: number, y: number) => {
			if (!motion.current) return;
			motion.current.point = {
				x: Math.max(CANVAS_PADDING, x),
				y: Math.max(CANVAS_PADDING, y),
			};
			if (frame.current === null)
				frame.current = requestAnimationFrame(drawNode);
		},
		[drawNode],
	);

	const finishNode = useCallback(() => {
		const drag = motion.current;
		if (!drag) return;
		if (frame.current !== null) cancelAnimationFrame(frame.current);
		drawNode();
		motion.current = null;
		drag.element.removeAttribute("data-dragging");
		if (drag.point.x !== drag.initial.x || drag.point.y !== drag.initial.y) {
			positionsRef.current = {
				...positionsRef.current,
				[drag.name]: drag.point,
			};
			setPositions((current) =>
				current[drag.name] ? { ...current, [drag.name]: drag.point } : current,
			);
		}
	}, [drawNode]);

	useLayoutEffect(() => {
		if (motion.current) return;
		stageRef.current?.style.removeProperty("--drag-width");
		stageRef.current?.style.removeProperty("--drag-height");
	}, [positions]);

	useEffect(
		() => () => {
			if (frame.current !== null) cancelAnimationFrame(frame.current);
		},
		[],
	);
	const panRef = useRef<{
		x: number;
		y: number;
		left: number;
		top: number;
	} | null>(null);

	function startPan(event: ReactPointerEvent<HTMLDivElement>) {
		if (event.button !== 0 || motion.current) return;
		if (
			(event.target as Element).closest(
				"[data-schema-card], [data-schema-controls]",
			)
		)
			return;
		const container = containerRef.current;
		if (!container) return;
		panRef.current = {
			x: event.clientX,
			y: event.clientY,
			left: container.scrollLeft,
			top: container.scrollTop,
		};
		container.setPointerCapture(event.pointerId);
		event.preventDefault();
	}

	function movePan(event: ReactPointerEvent<HTMLDivElement>) {
		const pan = panRef.current;
		const container = containerRef.current;
		if (!pan || !container) return;
		container.scrollLeft = pan.left - (event.clientX - pan.x);
		container.scrollTop = pan.top - (event.clientY - pan.y);
	}

	function endPan(event: ReactPointerEvent<HTMLDivElement>) {
		panRef.current = null;
		const container = containerRef.current;
		if (container?.hasPointerCapture(event.pointerId)) {
			container.releasePointerCapture(event.pointerId);
		}
	}
	const changeZoom = useCallback((next: number, screen?: Point) => {
		const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
		if (motion.current || clamped === desiredZoom.current) return;
		const container = containerRef.current;
		if (container) {
			const anchor = screen ?? {
				x: container.clientWidth / 2,
				y: container.clientHeight / 2,
			};
			zoomAnchor.current = {
				screen: anchor,
				point: {
					x: (container.scrollLeft + anchor.x) / zoomRef.current,
					y: (container.scrollTop + anchor.y) / zoomRef.current,
				},
			};
		}
		desiredZoom.current = clamped;
		setZoom(clamped);
	}, []);

	useLayoutEffect(() => {
		zoomRef.current = zoom;
		const anchor = zoomAnchor.current;
		const container = containerRef.current;
		if (!anchor || !container) return;
		container.scrollLeft = anchor.point.x * zoom - anchor.screen.x;
		container.scrollTop = anchor.point.y * zoom - anchor.screen.y;
		zoomAnchor.current = null;
	}, [zoom]);

	useEffect(() => {
		const container = containerRef.current;
		if (!hasCanvas || !container) return;

		let lastTrackpadEvent = -Infinity;
		let trackpadTarget: "canvas" | "node" | undefined;
		let release: ReturnType<typeof setTimeout> | undefined;
		const endTrackpad = () => {
			if (release !== undefined) clearTimeout(release);
			release = undefined;
			trackpadTarget = undefined;
			if (motion.current?.source === "trackpad") finishNode();
		};
		let disposed = false;
		let unlisten: (() => void) | undefined;
		if (isTauri()) {
			void listen<TrackpadGesture>("schema-trackpad", ({ payload }) => {
				if (disposed) return;
				if (container.closest("[hidden]")) {
					endTrackpad();
					return;
				}
				if (payload.phase === "begin") {
					if (release !== undefined) {
						clearTimeout(release);
						release = undefined;
					}
					if (!trackpadTarget) {
						if (
							!container.matches(":hover") ||
							container.querySelector("[data-schema-controls]:hover") ||
							panRef.current ||
							motion.current
						)
							return;
						const card = container.querySelector<HTMLElement>(
							"[data-schema-card]:hover",
						);
						trackpadTarget =
							card && beginNode(card, "trackpad") ? "node" : "canvas";
					}
					lastTrackpadEvent = performance.now();
					return;
				}
				if (!trackpadTarget) return;
				lastTrackpadEvent = performance.now();
				if (payload.phase === "end") {
					if (release !== undefined) clearTimeout(release);
					release = setTimeout(endTrackpad, TRACKPAD_RELEASE_MS);
					return;
				}
				if (payload.phase !== "move" || panRef.current) return;
				const drag = motion.current;
				if (trackpadTarget === "canvas") {
					container.scrollLeft -= payload.x;
					container.scrollTop -= payload.y;
				} else if (drag?.source === "trackpad") {
					moveNode(
						drag.point.x + payload.x / zoomRef.current,
						drag.point.y + payload.y / zoomRef.current,
					);
				}
			})
				.then((stop) => {
					if (disposed) stop();
					else unlisten = stop;
				})
				.catch((error) =>
					console.warn("Could not subscribe to trackpad gestures", error),
				);
		}

		const onWheel = (event: WheelEvent) => {
			event.preventDefault();
			if (motion.current || performance.now() - lastTrackpadEvent < 150) return;
			const unit =
				event.deltaMode === 1
					? 16
					: event.deltaMode === 2
						? container.clientHeight
						: 1;
			if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
				container.scrollLeft += (event.deltaX || event.deltaY) * unit;
				if (event.deltaX) container.scrollTop += event.deltaY * unit;
				return;
			}
			const { left, top } = container.getBoundingClientRect();
			changeZoom(desiredZoom.current * Math.exp(-event.deltaY * unit * 0.002), {
				x: event.clientX - left,
				y: event.clientY - top,
			});
		};

		const onKeyDown = (event: KeyboardEvent) => {
			if ((!event.metaKey && !event.ctrlKey) || container.closest("[hidden]"))
				return;
			if (
				!container.matches(":hover") &&
				!container.contains(document.activeElement)
			)
				return;
			const target = event.target;
			if (
				target instanceof HTMLElement &&
				(target.matches("input, textarea") || target.isContentEditable)
			)
				return;
			if (event.key === "+" || event.key === "=") {
				event.preventDefault();
				changeZoom(desiredZoom.current + ZOOM_STEP);
			} else if (event.key === "-" || event.key === "_") {
				event.preventDefault();
				changeZoom(desiredZoom.current - ZOOM_STEP);
			} else if (event.key === "0") {
				event.preventDefault();
				changeZoom(1);
			}
		};

		container.addEventListener("wheel", onWheel, { passive: false });
		window.addEventListener("keydown", onKeyDown);
		return () => {
			disposed = true;
			endTrackpad();
			unlisten?.();
			container.removeEventListener("wheel", onWheel);
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [beginNode, changeZoom, finishNode, hasCanvas, moveNode]);

	useEffect(() => {
		let canceled = false;
		invoke<SchemaTable[]>("sqlite_schema", { path }).then(
			(schema) => {
				if (canceled) return;
				setTables(schema);
				setError(undefined);
				setPositions((current) => {
					const layout = autoLayout(schema);
					const known = new Set(schema.map((table) => table.name));
					const next: Record<string, Point> = {};
					for (const [name, point] of Object.entries(current)) {
						if (known.has(name)) next[name] = point;
					}
					for (const [name, point] of Object.entries(layout)) {
						next[name] ??= point;
					}
					return next;
				});
			},
			(error) => {
				if (!canceled) setError(String(error));
			},
		);
		return () => {
			canceled = true;
		};
	}, [path, revision]);

	function arrange() {
		if (!tables) return;
		finishNode();
		setPositions(autoLayout(tables));
	}

	function startDrag(event: ReactPointerEvent<HTMLDivElement>) {
		if (event.button !== 0) return;
		const container = containerRef.current;
		if (!container) return;
		event.preventDefault();
		if (panRef.current || !beginNode(event.currentTarget, "pointer")) return;
		dragRef.current = {
			pointerId: event.pointerId,
			start: { x: event.clientX, y: event.clientY },
			scroll: { x: container.scrollLeft, y: container.scrollTop },
			scale: zoomRef.current,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
		const pointer = dragRef.current;
		const drag = motion.current;
		const container = containerRef.current;
		if (
			!pointer ||
			!drag ||
			!container ||
			pointer.pointerId !== event.pointerId
		)
			return;
		moveNode(
			drag.initial.x +
				(event.clientX -
					pointer.start.x +
					container.scrollLeft -
					pointer.scroll.x) /
					pointer.scale,
			drag.initial.y +
				(event.clientY -
					pointer.start.y +
					container.scrollTop -
					pointer.scroll.y) /
					pointer.scale,
		);
	}

	function endDrag(event: ReactPointerEvent<HTMLDivElement>) {
		if (dragRef.current?.pointerId !== event.pointerId) return;
		if (event.type === "pointerup") moveDrag(event);
		dragRef.current = null;
		finishNode();
	}

	const canvasWidth =
		Math.max(
			0,
			...(tables ?? []).map(
				(table) => (positions[table.name]?.x ?? 0) + CARD_WIDTH,
			),
		) + CANVAS_PADDING;
	const canvasHeight =
		Math.max(
			0,
			...(tables ?? []).map(
				(table) => (positions[table.name]?.y ?? 0) + cardHeight(table),
			),
		) + CANVAS_PADDING;

	if (error) {
		return (
			<div role="alert" className="p-3 text-destructive">
				Could not read the schema. {error}
			</div>
		);
	}

	if (!tables) {
		return (
			<p role="status" className="p-3 text-sm text-muted-foreground">
				Reading schema…
			</p>
		);
	}

	if (!tables.length) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
				<IconDatabase className="size-6" aria-hidden="true" />
				<p>No tables in this database.</p>
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="schema-canvas relative h-full w-full cursor-grab touch-none overflow-auto active:cursor-grabbing"
			onPointerDown={startPan}
			onPointerMove={movePan}
			onPointerUp={endPan}
			onPointerCancel={endPan}
		>
			<div className="pointer-events-none sticky top-0 left-0 z-20 h-0">
				<div
					data-schema-controls
					className="pointer-events-auto absolute top-2 right-2 flex items-center gap-1 dark:text-zinc-100"
				>
					<Button type="button" variant="outline" size="sm" onClick={arrange}>
						<IconLayoutGrid aria-hidden="true" />
						Auto arrange
					</Button>
					<div className="flex items-center rounded-md border border-border bg-background/80">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Zoom out"
							onClick={() => changeZoom(zoom - ZOOM_STEP)}
						>
							<IconZoomOut aria-hidden="true" />
						</Button>
						<button
							type="button"
							onClick={() => changeZoom(1)}
							aria-label="Reset zoom"
							className="min-w-12 px-1 text-xs tabular-nums text-muted-foreground hover:text-foreground"
						>
							{Math.round(zoom * 100)}%
						</button>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Zoom in"
							onClick={() => changeZoom(zoom + ZOOM_STEP)}
						>
							<IconZoomIn aria-hidden="true" />
						</Button>
					</div>
				</div>
			</div>
			<div
				ref={stageRef}
				className="relative min-h-full min-w-full overflow-clip"
				style={{
					width: `max(${canvasWidth * zoom}px, var(--drag-width, 0px))`,
					height: `max(${canvasHeight * zoom}px, var(--drag-height, 0px))`,
				}}
			>
				<div
					className="absolute top-0 left-0 origin-top-left"
					style={{
						width: canvasWidth,
						height: canvasHeight,
						transform: `scale(${zoom})`,
					}}
				>
					<svg
						className="pointer-events-none absolute inset-0 overflow-visible"
						width={canvasWidth}
						height={canvasHeight}
						aria-hidden="true"
					>
						<defs>
							<marker
								id="schema-arrow"
								viewBox="0 0 8 8"
								refX="7"
								refY="4"
								markerWidth="6"
								markerHeight="6"
								orient="auto-start-reverse"
							>
								<path d="M 0 0 L 8 4 L 0 8 z" fill="var(--muted-foreground)" />
							</marker>
						</defs>
						{edges.map((edge, index) => {
							const from = positions[edge.from];
							const to = positions[edge.to];
							if (!from || !to) return null;
							return (
								<path
									key={JSON.stringify([edge.from, edge.sourceRow])}
									data-schema-edge={index}
									d={edgePath(edge, from, to)}
									fill="none"
									stroke="var(--muted-foreground)"
									strokeOpacity="0.6"
									strokeWidth="1.25"
									markerEnd="url(#schema-arrow)"
								/>
							);
						})}
					</svg>
					{tables.map((table) => {
						const point = positions[table.name] ?? { x: 0, y: 0 };
						return (
							<div
								key={table.name}
								data-schema-card={table.name}
								className="absolute top-0 left-0 cursor-grab overflow-hidden rounded-lg border border-border bg-card shadow-sm select-none data-dragging:z-10 data-dragging:cursor-grabbing"
								onPointerDown={startDrag}
								onPointerMove={moveDrag}
								onPointerUp={endDrag}
								onPointerCancel={endDrag}
								onLostPointerCapture={endDrag}
								style={{
									transform: nodeTransform(point),
									width: CARD_WIDTH,
									height: cardHeight(table),
								}}
							>
								<div className="flex h-[38px] items-center border-b border-border bg-muted/40 px-3 font-mono text-sm font-semibold">
									<span className="truncate">{table.name}</span>
								</div>
								<ul>
									{table.columns.map((column) => (
										<li
											key={column.name}
											className={cn(
												"flex h-[26px] items-center gap-1.5 px-3 font-mono text-xs",
												column.primaryKey && "text-foreground",
											)}
										>
											{column.primaryKey ? (
												<IconKey
													className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-300"
													aria-label="Primary key"
												/>
											) : column.references ? (
												<IconLink
													className="size-3.5 shrink-0 text-sky-600 dark:text-sky-300"
													aria-label={`References ${column.references.table}`}
												/>
											) : (
												<span
													className="size-3.5 shrink-0"
													aria-hidden="true"
												/>
											)}
											<span className="min-w-0 flex-1 truncate">
												{column.name}
											</span>
											<span className="shrink-0 text-muted-foreground">
												{column.typeName.toLowerCase()}
											</span>
										</li>
									))}
								</ul>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
