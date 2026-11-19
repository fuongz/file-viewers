/**
 * Product screenshots in public/shots/, one light and one dark capture each.
 * To add one, drop `<name>-light.webp` and `<name>-dark.webp` there and add
 * a line below.
 */

export type Shot = {
	light: string;
	dark: string;
	/** Full image size in pixels. */
	width: number;
	height: number;
	/** The app window inside the image, in image pixels. */
	window: { x: number; y: number; w: number; h: number };
	/** A detail worth zooming into, as fractions of the full image. */
	focus: { x: number; y: number };
};

/**
 * Captures are 2624 px wide on a transparent backdrop with the macOS window
 * frame and shadow baked in. The window sits 112 px in from the sides and
 * 76 px down from the top; the shadow takes the bottom 149 px.
 */
function shot(name: string, height: number, focus: Shot["focus"]): Shot {
	return {
		light: `/shots/${name}-light.webp`,
		dark: `/shots/${name}-dark.webp`,
		width: 2624,
		height,
		window: { x: 112, y: 76, w: 2400, h: height - 76 - 149 },
		focus,
	};
}

export const shots = {
	hero: shot("hero", 1744, { x: 0.47, y: 0.21 }),
	schema: shot("schema", 1744, { x: 0.5, y: 0.22 }),
	sqliteQuery: shot("sqlite-query", 1804, { x: 0.38, y: 0.15 }),
	csv: shot("csv", 1804, { x: 0.53, y: 0.2 }),
	csvSql: shot("csv-sql", 1804, { x: 0.76, y: 0.11 }),
	jsonl: shot("jsonl", 1804, { x: 0.17, y: 0.2 }),
	json: shot("json", 1804, { x: 0.16, y: 0.52 }),
	markdown: shot("markdown", 1804, { x: 0.68, y: 0.38 }),
	xlsx: shot("xlsx", 1804, { x: 0.07, y: 0.93 }),
	palette: shot("palette", 1804, { x: 0.47, y: 0.3 }),
	settings: shot("settings", 1804, { x: 0.56, y: 0.35 }),
} satisfies Record<string, Shot>;

export type ShotName = keyof typeof shots;
