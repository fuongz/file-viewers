import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { SiteLayout } from "../components/SiteLayout";
import { SITE_URL } from "../release";
import appCss from "../styles.css?url";

const TITLE = "File Viewers: open a file, look closer";
const DESCRIPTION =
	"A free, open source Mac app for SQLite, CSV, Parquet, Excel, JSON, JSON Lines and Markdown. Your files stay on your Mac.";
const OG_IMAGE = `${SITE_URL}/og.png`;

export const Route = createRootRoute({
	component: RootComponent,
	notFoundComponent: NotFound,
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: TITLE },
			{ name: "description", content: DESCRIPTION },
			{
				name: "theme-color",
				content: "#fcf9f6",
				media: "(prefers-color-scheme: light)",
			},
			{
				name: "theme-color",
				content: "#151110",
				media: "(prefers-color-scheme: dark)",
			},
			{ name: "color-scheme", content: "light dark" },
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: "File Viewers" },
			{ property: "og:title", content: TITLE },
			{ property: "og:description", content: DESCRIPTION },
			{ property: "og:url", content: SITE_URL },
			{ property: "og:image", content: OG_IMAGE },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{
				property: "og:image:alt",
				content: "File Viewers showing an SQLite table on macOS",
			},
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: TITLE },
			{ name: "twitter:description", content: DESCRIPTION },
			{ name: "twitter:image", content: OG_IMAGE },
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/icon.png" },
			{ rel: "apple-touch-icon", href: "/icon.png" },
		],
	}),
	shellComponent: RootDocument,
});

/** Unknown URLs get the site's own bar, landmarks and a title of their own. */
function NotFound() {
	useEffect(() => {
		document.title = "Page not found | File Viewers";
	}, []);
	return (
		<SiteLayout>
			<div className="not-found">
				<p className="eyebrow eyebrow-rule">
					<span>404</span>
					<span>Page not found</span>
				</p>
				<h1 className="section-title">Nothing to look at here.</h1>
				<Link to="/" className="btn btn-primary">
					Go to the home page
				</Link>
			</div>
		</SiteLayout>
	);
}

function RootComponent() {
	return <Outlet />;
}

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
