import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import type { Shot } from "../shots";

/**
 * CSS variables describing where the app window sits inside a shot, in
 * units of the window width, plus the light and dark image URLs.
 */
export function shotVars(shot: Shot): CSSProperties {
	const { window: box } = shot;
	return {
		"--ix": box.x / box.w,
		"--iy": box.y / box.w,
		"--s": shot.width / box.w,
		"--ratio": box.h / box.w,
		"--shot-light": `url(${shot.light})`,
		"--shot-dark": `url(${shot.dark})`,
	} as CSSProperties;
}

/**
 * A box the size of the app window in `shot`. The image overflows it by the
 * shot's transparent margin, so the baked-in frame and shadow stay visible
 * and anything placed inside lines up with the window itself.
 */
export function ShotWindow({
	shot,
	alt,
	priority = false,
	className = "",
	style,
	children,
	...rest
}: {
	shot: Shot;
	alt: string;
	priority?: boolean;
	children?: ReactNode;
} & HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			{...rest}
			className={`shot ${className}`}
			style={{ ...shotVars(shot), ...style }}
		>
			<picture>
				<source srcSet={shot.dark} media="(prefers-color-scheme: dark)" />
				<img
					src={shot.light}
					alt={alt}
					width={shot.width}
					height={shot.height}
					loading={priority ? "eager" : "lazy"}
					fetchPriority={priority ? "high" : "auto"}
					draggable={false}
				/>
			</picture>
			{children}
		</div>
	);
}

/**
 * A crop of a shot, centred on `focus` and drawn at `scale` of
 * the capture's pixels, so text reads at a predictable size. The inner layer
 * zooms toward the focus point when a `.zoomable` ancestor is hovered.
 */
export function ShotCrop({
	shot,
	focus = shot.focus,
	scale = 0.5,
	label,
	className = "",
}: {
	shot: Shot;
	focus?: Shot["focus"];
	scale?: number;
	/** Describes the crop when it is content; without it the crop is decoration. */
	label?: string;
	className?: string;
}) {
	return (
		<div
			className={`crop ${className}`}
			{...(label
				? { role: "img", "aria-label": label }
				: { "aria-hidden": true })}
		>
			<div
				className="crop-image"
				style={
					{
						...shotVars(shot),
						"--cw": shot.width,
						"--ch": shot.height,
						"--cx": focus.x,
						"--cy": focus.y,
						"--k-base": scale,
						transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
					} as CSSProperties
				}
			/>
		</div>
	);
}
