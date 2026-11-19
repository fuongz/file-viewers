import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import appCss from "../styles.css?url";

export const Route = createRootRoute({
	component: RootComponent,
	notFoundComponent: () => (
		<div className="min-h-screen flex flex-col items-center justify-center text-center px-8">
			<h1 className="display-title text-6xl mb-4">404</h1>
			<p className="text-[var(--muted)] mb-8">Page not found.</p>
			<Link to="/" className="site-button">
				Go home
			</Link>
		</div>
	),
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "File Viewers — Desktop viewer for data and docs",
			},
			{
				name: "description",
				content:
					"Browse SQLite, JSONL, JSON, CSV, Excel, Parquet, and Markdown in one open-source desktop app.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{
				rel: "icon",
				href: "/icon.png",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootComponent() {
	return <Outlet />;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
