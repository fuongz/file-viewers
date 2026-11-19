import { type PointerEvent, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";

interface TabPosition {
	element: HTMLElement;
	left: number;
	width: number;
}

interface DragLayout {
	tabs: TabPosition[];
	from: number;
	grabOffset: number;
	gap: number;
	animate: boolean;
	to?: number;
}

interface Drag {
	id: string;
	pointerId: number;
	startX: number;
	x: number;
	y: number;
	layout?: DragLayout;
}

function measureTabs(strip: HTMLElement, drag: Drag): DragLayout | undefined {
	const left = strip.getBoundingClientRect().left - strip.scrollLeft;
	const elements = Array.from(
		strip.querySelectorAll<HTMLElement>("[data-tab-id]"),
	);
	const from = elements.findIndex((tab) => tab.dataset.tabId === drag.id);
	if (from < 0) return;
	const grabOffset = drag.startX - elements[from].getBoundingClientRect().left;
	const gap = Number.parseFloat(getComputedStyle(strip).columnGap) || 0;
	const animate = window.matchMedia(
		"(prefers-reduced-motion: no-preference)",
	).matches;

	// A new gesture can interrupt a previous drop animation.
	const tabs = elements.map((element) => {
		for (const animation of element.getAnimations?.() ?? []) animation.cancel();
		const rect = element.getBoundingClientRect();
		return { element, left: rect.left - left, width: rect.width };
	});
	return { tabs, from, grabOffset, gap, animate };
}

function dropTarget(
	drag: Drag,
	layout: DragLayout,
	strip: HTMLElement,
	rect: DOMRect,
) {
	if (
		drag.x < rect.left ||
		drag.x > rect.right ||
		drag.y < rect.top ||
		drag.y > rect.bottom
	) {
		return null;
	}

	const x = drag.x - rect.left + strip.scrollLeft;
	const before = layout.tabs.findIndex((tab) => x < tab.left + tab.width / 2);
	const boundary = before === -1 ? layout.tabs.length : before;
	const { from } = layout;
	return from === boundary || from + 1 === boundary
		? null
		: { boundary, to: boundary > from ? boundary - 1 : boundary };
}

function positionTabs(
	drag: Drag,
	layout: DragLayout,
	strip: HTMLElement,
	rect: DOMRect,
	to: number,
) {
	const { from, tabs } = layout;
	const tab = tabs[from];
	const pointerLeft = drag.x - rect.left - layout.grabOffset;
	const visibleLeft = Math.max(
		0,
		Math.min(pointerLeft, rect.width - tab.width),
	);
	const x = strip.scrollLeft + visibleLeft - tab.left;
	tab.element.style.transform = `translateX(${x}px)`;

	if (layout.to === to) return;
	layout.to = to;
	for (const [index, sibling] of tabs.entries()) {
		if (index === from) continue;
		const direction =
			index > from && index <= to ? -1 : index < from && index >= to ? 1 : 0;
		sibling.element.setAttribute("data-shifting", "");
		sibling.element.style.transform = `translateX(${direction * (tab.width + layout.gap)}px)`;
	}
}

export function useFileTabDrag(onMove: (id: string, to: number) => void) {
	const stripRef = useRef<HTMLDivElement>(null);
	const dragRef = useRef<Drag | null>(null);
	const frameRef = useRef(0);
	const ignoreClick = useRef(false);
	const [draggedId, setDraggedId] = useState<string | null>(null);
	const [dropBoundary, setDropBoundary] = useState<number | null>(null);

	useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

	function finishDrag(to?: number) {
		const drag = dragRef.current;
		if (!drag) return;
		dragRef.current = null;
		cancelAnimationFrame(frameRef.current);
		frameRef.current = 0;
		const strip = stripRef.current;
		if (strip?.hasPointerCapture(drag.pointerId)) {
			strip.releasePointerCapture(drag.pointerId);
		}

		const moving = drag.layout?.animate ? drag.layout.tabs : [];
		const oldPositions = moving.map(
			({ element }) => element.getBoundingClientRect().left,
		);
		for (const { element } of moving) {
			element.removeAttribute("data-shifting");
			element.style.removeProperty("transform");
		}

		const commit = () => {
			setDraggedId(null);
			setDropBoundary(null);
			if (to !== undefined) onMove(drag.id, to);
		};
		if (!moving.length) {
			commit();
			return;
		}

		flushSync(commit);
		for (const [index, { element }] of moving.entries()) {
			const offset = oldPositions[index] - element.getBoundingClientRect().left;
			if (Math.abs(offset) < 1) continue;
			element.animate?.(
				[
					{ transform: `translateX(${offset}px)` },
					{ transform: "translateX(0)" },
				],
				{ duration: 160, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
			);
		}
	}

	function onPointerDown(event: PointerEvent<HTMLDivElement>) {
		if (event.button !== 0 || !event.isPrimary) return;
		ignoreClick.current = false;
		const target = event.target;
		if (!(target instanceof Element) || !target.closest('[role="tab"]')) return;
		const id = target.closest<HTMLElement>("[data-tab-id]")?.dataset.tabId;
		if (!id) return;
		dragRef.current = {
			id,
			pointerId: event.pointerId,
			startX: event.clientX,
			x: event.clientX,
			y: event.clientY,
		};
	}

	function updateDrag() {
		frameRef.current = 0;
		const drag = dragRef.current;
		const strip = stripRef.current;
		if (!drag?.layout || !strip) return;

		const rect = strip.getBoundingClientRect();
		const before = strip.scrollLeft;
		if (
			drag.y >= rect.top &&
			drag.y <= rect.bottom &&
			drag.x >= rect.left &&
			drag.x <= rect.right
		) {
			if (drag.x < rect.left + 24) strip.scrollLeft -= 10;
			if (drag.x > rect.right - 24) strip.scrollLeft += 10;
		}
		const drop = dropTarget(drag, drag.layout, strip, rect);
		setDropBoundary(drop?.boundary ?? null);
		if (drag.layout.animate) {
			positionTabs(
				drag,
				drag.layout,
				strip,
				rect,
				drop?.to ?? drag.layout.from,
			);
		}

		if (strip.scrollLeft !== before) {
			frameRef.current = requestAnimationFrame(updateDrag);
		}
	}

	function onPointerMove(event: PointerEvent<HTMLDivElement>) {
		const drag = dragRef.current;
		if (!drag || event.pointerId !== drag.pointerId) return;
		drag.x = event.clientX;
		drag.y = event.clientY;
		if (!drag.layout) {
			if (Math.abs(drag.x - drag.startX) < 5) return;
			drag.layout = measureTabs(event.currentTarget, drag);
			if (!drag.layout) return;
			ignoreClick.current = true;
			event.currentTarget.setPointerCapture(event.pointerId);
			setDraggedId(drag.id);
		}
		if (!frameRef.current) frameRef.current = requestAnimationFrame(updateDrag);
	}

	function onPointerUp(event: PointerEvent<HTMLDivElement>) {
		const drag = dragRef.current;
		if (!drag || event.pointerId !== drag.pointerId) return;
		drag.x = event.clientX;
		drag.y = event.clientY;
		const strip = event.currentTarget;
		const drop =
			drag.layout &&
			dropTarget(drag, drag.layout, strip, strip.getBoundingClientRect());
		finishDrag(drop?.to);
	}

	const cancelDrag = () => finishDrag();
	useEffect(() => {
		if (!draggedId) return;
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") cancelDrag();
		}
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("resize", cancelDrag);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("resize", cancelDrag);
		};
	}, [draggedId]);

	return {
		stripRef,
		draggedId,
		dropBoundary,
		dragHandlers: {
			onPointerDown,
			onPointerMove,
			onPointerUp,
			onPointerCancel: cancelDrag,
			onLostPointerCapture: cancelDrag,
			onPointerLeave: () => {
				if (!dragRef.current?.layout) dragRef.current = null;
			},
			onClickCapture: (event: React.MouseEvent) => {
				if (ignoreClick.current && event.detail > 0) {
					ignoreClick.current = false;
					event.preventDefault();
					event.stopPropagation();
				}
			},
		},
	};
}
