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
			<h1 className="text-5xl font-bold text-white mb-4">404</h1>
			<p className="text-white/60 mb-8">Page not found.</p>
			<Link
				to="/"
				className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white no-underline transition-all hover:brightness-110 active:scale-95"
				style={{ backgroundColor: "#1d6ae8" }}
			>
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
				title: "File Viewers — Markdown, JSON & CSV viewer",
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
			<body style={{ backgroundColor: "#181818", color: "#ffffff", margin: 0 }}>
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
