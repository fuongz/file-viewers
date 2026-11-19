import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
	DMG_URL,
	RELEASE_DATE,
	RELEASE_DATE_LABEL,
	RELEASE_TAG_URL,
	RELEASES_URL,
	REPOSITORY_URL,
	VERSION,
} from "../release";

export function AppleGlyph({ size = 16 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="-1.5 0 20 20"
			aria-hidden="true"
			focusable="false"
			className="apple-glyph"
		>
			<path
				transform="translate(-46 -7279)"
				fill="currentColor"
				d="M57.57 7282.19c.73-.84 1.22-2.02 1.09-3.19-1.05.04-2.32.67-3.08 1.51-.68.75-1.27 1.95-1.11 3.1 1.17.09 2.37-.57 3.1-1.42m2.63 7.43c.03 3.03 2.77 4.03 2.8 4.05-.02.07-.44 1.43-1.44 2.84-.87 1.22-1.77 2.43-3.2 2.46-1.4.03-1.85-.79-3.45-.79-1.6 0-2.1.77-3.42.82-1.37.05-2.42-1.32-3.3-2.53-1.79-2.48-3.16-7.02-1.32-10.08.91-1.52 2.55-2.48 4.32-2.5 1.35-.03 2.62.87 3.45.87.82 0 2.37-1.08 4-.92.68.03 2.59.26 3.82 1.98-.1.06-2.28 1.28-2.26 3.8"
			/>
		</svg>
	);
}

export function MacDownloadButton({ className = "" }: { className?: string }) {
	return (
		<a className={`btn btn-primary ${className}`} href={DMG_URL}>
			<AppleGlyph />
			Download for Mac
		</a>
	);
}

/** lucide-react ships no brand marks, so the GitHub one is drawn here. */
function GitHubGlyph({ size = 18 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			aria-hidden="true"
			focusable="false"
		>
			<path
				fill="currentColor"
				d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2.1c-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.76 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"
			/>
		</svg>
	);
}

const sections = [
	{ id: "tour", label: "Tour" },
	{ id: "formats", label: "Formats" },
	{ id: "faq", label: "FAQ" },
] as const;

type SectionId = (typeof sections)[number]["id"];

/** Past this many pixels of scroll the bar turns solid and tightens. */
const SCROLL_EDGE = 24;
/** Must match the width at which styles.css swaps the links for the menu. */
const MENU_QUERY = "(max-width: 720px)";

/**
 * The floating bar. It reads as glass over the hero and turns solid once the
 * page scrolls. On the home page it marks the section in view; elsewhere the
 * same links lead back to those sections.
 */
function SiteBar() {
	const [scrolled, setScrolled] = useState(false);
	const [current, setCurrent] = useState<SectionId | null>(null);
	const [open, setOpen] = useState(false);
	const barRef = useRef<HTMLElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const update = () => setScrolled(window.scrollY > SCROLL_EDGE);
		update();
		window.addEventListener("scroll", update, { passive: true });
		return () => window.removeEventListener("scroll", update);
	}, []);

	// A section is current while it crosses a line just above mid-viewport.
	// Pages without these sections observe nothing and mark nothing.
	useEffect(() => {
		const targets = sections
			.map(({ id }) => document.getElementById(id))
			.filter((element) => element !== null);
		if (targets.length === 0) return;
		const visible = new Set<string>();
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) visible.add(entry.target.id);
					else visible.delete(entry.target.id);
				}
				setCurrent(sections.find(({ id }) => visible.has(id))?.id ?? null);
			},
			{ rootMargin: "-40% 0px -60% 0px" },
		);
		for (const target of targets) observer.observe(target);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!open) return;
		const close = (returnFocus: boolean) => {
			setOpen(false);
			if (returnFocus) buttonRef.current?.focus();
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") close(true);
		};
		const onPointerDown = (event: PointerEvent) => {
			if (!barRef.current?.contains(event.target as Node)) close(false);
		};
		const onFocusIn = (event: FocusEvent) => {
			if (!barRef.current?.contains(event.target as Node)) close(false);
		};
		// The menu only exists at narrow widths; close it if the window grows.
		const narrow = window.matchMedia(MENU_QUERY);
		const onResize = () => {
			if (!narrow.matches) close(false);
		};
		document.addEventListener("keydown", onKeyDown);
		document.addEventListener("pointerdown", onPointerDown);
		document.addEventListener("focusin", onFocusIn);
		narrow.addEventListener("change", onResize);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
			document.removeEventListener("pointerdown", onPointerDown);
			document.removeEventListener("focusin", onFocusIn);
			narrow.removeEventListener("change", onResize);
		};
	}, [open]);

	const links = (onNavigate?: () => void) =>
		sections.map(({ id, label }) => (
			<li key={id}>
				<a
					href={`/#${id}`}
					aria-current={current === id ? "location" : undefined}
					onClick={onNavigate}
				>
					{label}
				</a>
			</li>
		));

	return (
		<header
			ref={barRef}
			className="site-bar"
			data-scrolled={scrolled || undefined}
			data-open={open || undefined}
		>
			<div className="site-bar-pill">
				<Link to="/" className="wordmark">
					<img src="/icon.png" width={28} height={28} alt="" />
					<span>File Viewers</span>
				</Link>
				<nav aria-label="Main" className="site-nav">
					<ul>{links()}</ul>
				</nav>
				<div className="site-actions">
					<a
						href={REPOSITORY_URL}
						className="icon-link nav-github"
						aria-label="File Viewers on GitHub"
					>
						<GitHubGlyph />
					</a>
					<Link to="/download" className="btn btn-primary btn-nav">
						Download
					</Link>
					<button
						ref={buttonRef}
						type="button"
						className="icon-link menu-button"
						aria-label="Menu"
						aria-expanded={open}
						aria-controls="site-menu"
						onClick={() => setOpen((value) => !value)}
					>
						<Menu size={20} aria-hidden="true" className="menu-icon-open" />
						<X size={20} aria-hidden="true" className="menu-icon-close" />
					</button>
				</div>
				<nav id="site-menu" aria-label="Main" className="site-menu">
					<ul>
						{links(() => setOpen(false))}
						<li className="site-menu-external">
							<a href={REPOSITORY_URL} onClick={() => setOpen(false)}>
								GitHub <ArrowUpRight size={16} aria-hidden="true" />
							</a>
						</li>
					</ul>
				</nav>
			</div>
		</header>
	);
}

export function SiteLayout({ children }: { children: ReactNode }) {
	return (
		<div className="site">
			<a className="skip-link" href="#main">
				Skip to content
			</a>
			<SiteBar />
			<main id="main" tabIndex={-1}>
				{children}
			</main>
			<footer className="site-footer">
				<div className="wrap site-footer-inner">
					<div className="footer-id">
						<Link to="/" className="wordmark">
							<img src="/icon.png" width={22} height={22} alt="" />
							File Viewers
						</Link>
						<p className="mono-note">
							v{VERSION}, released{" "}
							<time dateTime={RELEASE_DATE}>{RELEASE_DATE_LABEL}</time>
							<br />
							Free under the MIT license
						</p>
					</div>
					<ul className="footer-links">
						<li>
							<a href={REPOSITORY_URL}>
								GitHub <ArrowUpRight size={14} aria-hidden="true" />
							</a>
						</li>
						<li>
							<a href={RELEASE_TAG_URL}>
								Release notes <ArrowUpRight size={14} aria-hidden="true" />
							</a>
						</li>
						<li>
							<a href={RELEASES_URL}>
								All releases <ArrowUpRight size={14} aria-hidden="true" />
							</a>
						</li>
						<li>
							<a href="https://phuongphung.com">
								© {new Date().getFullYear()} fuongz
							</a>
						</li>
					</ul>
				</div>
			</footer>
		</div>
	);
}
