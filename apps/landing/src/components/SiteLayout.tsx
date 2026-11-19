import { Link } from "@tanstack/react-router";
import { ArrowDown } from "lucide-react";
import type { ReactNode } from "react";

export const REPOSITORY_URL = "https://github.com/fuongz/file-viewers";
export const RELEASES_URL = `${REPOSITORY_URL}/releases`;

export function DownloadLink({
	children = "Download",
}: {
	children?: ReactNode;
}) {
	return (
		<Link to="/download" className="site-button">
			<ArrowDown size={16} aria-hidden="true" />
			{children}
		</Link>
	);
}

export function SiteLayout({ children }: { children: ReactNode }) {
	return (
		<div className="site-layout">
			<header className="site-bar">
				<div className="site-wrap site-bar-inner">
					<Link to="/" className="site-brand">
						<img src="/icon.png" width={34} height={34} alt="" />
						File Viewers
					</Link>
					<nav aria-label="Main navigation">
						<Link to="/" hash="previews" className="site-nav-preview">
							Previews
						</Link>
						<a href={REPOSITORY_URL}>GitHub</a>
						<DownloadLink />
					</nav>
				</div>
			</header>
			{children}
			<footer className="site-wrap site-footer">
				<a href="https://phuongphung.com">
					© {new Date().getFullYear()} fuongz
				</a>
				<a href={RELEASES_URL}>Release notes</a>
			</footer>
		</div>
	);
}
