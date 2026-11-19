import { Fragment } from "react";

/**
 * A path-like line of mono text, such as a file and the view of it. The
 * slashes between the parts are drawn in CSS (see `.crumb` in styles.css), so
 * they are never read out or copied; a real space keeps the parts apart.
 */
export function Crumbs({ items }: { items: readonly string[] }) {
	return items.map((item, index) => (
		<Fragment key={item}>
			{index > 0 && " "}
			<span className="crumb">{item}</span>
		</Fragment>
	));
}
