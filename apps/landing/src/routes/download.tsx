import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { type CSSProperties, useEffect, useState } from "react";
import { Reveal } from "../components/Reveal";
import { MacDownloadButton, SiteLayout } from "../components/SiteLayout";
import {
	DMG_FILE,
	LATEST_RELEASE_URL,
	RELEASE_DATE,
	RELEASE_DATE_LABEL,
	RELEASE_TAG_URL,
	SITE_URL,
	VERSION,
} from "../release";

export const Route = createFileRoute("/download")({
	head: () => ({
		meta: [
			{ title: "Download File Viewers for Mac" },
			{
				name: "description",
				content: `Download File Viewers ${VERSION} for macOS: one universal DMG for Apple silicon and Intel Macs. Free and open source.`,
			},
			{ property: "og:title", content: "Download File Viewers for Mac" },
			{ property: "og:url", content: `${SITE_URL}/download` },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/download` }],
	}),
	component: DownloadPage,
});

const facts = [
	{ term: "Version", detail: VERSION },
	{
		term: "Released",
		detail: <time dateTime={RELEASE_DATE}>{RELEASE_DATE_LABEL}</time>,
	},
	{ term: "Macs", detail: "Apple silicon and Intel" },
	{ term: "Download", detail: "Universal DMG" },
	{ term: "License", detail: "MIT, free" },
];

const install = [
	{
		title: "Open the DMG",
		text: `Double-click ${DMG_FILE} in your Downloads folder.`,
	},
	{
		title: "Drag the app to Applications",
		text: "Drop File Viewers onto the Applications folder in the window that opens.",
	},
	{
		title: "Open a file",
		text: "Launch File Viewers, or right-click a file in Finder, then choose Open With and File Viewers.",
	},
];

function isMac() {
	const agent = navigator.userAgent.toLowerCase();
	if (/iphone|ipad|ipod/.test(agent)) return false;
	// iPadOS reports itself as a Mac but has a touch screen.
	return (
		navigator.platform.toLowerCase().startsWith("mac") &&
		navigator.maxTouchPoints < 2
	);
}

/** Staggers the page-load entrance; see `.enter` in styles.css. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function DownloadPage() {
	const [elsewhere, setElsewhere] = useState(false);
	useEffect(() => setElsewhere(!isMac()), []);

	return (
		<SiteLayout>
			<section className="hero hero-download" aria-labelledby="download-title">
				<div className="wrap download-layout">
					<div className="download-intro">
						<p className="eyebrow enter" style={delay(0)}>
							<span className="tag">v{VERSION}</span>
							<span>
								Released{" "}
								<time dateTime={RELEASE_DATE}>{RELEASE_DATE_LABEL}</time>
							</span>
						</p>
						<h1
							id="download-title"
							className="hero-title download-title enter"
							style={delay(70)}
						>
							File Viewers for Mac.
						</h1>
						<p className="hero-lede enter" style={delay(150)}>
							One universal DMG that runs natively on Apple silicon and Intel
							Macs.
						</p>
						{elsewhere && (
							<p className="notice" role="note">
								File Viewers is a macOS app. Open this page on your Mac to
								download it there.
							</p>
						)}
					</div>
					<div className="download-card enter-window">
						<div className="download-card-head">
							<img src="/icon.png" width={64} height={64} alt="" />
							<div>
								<p className="download-card-name">File Viewers</p>
								<p className="mono-note download-file" translate="no">
									{DMG_FILE}
								</p>
							</div>
						</div>
						<dl className="facts">
							{facts.map(({ term, detail }) => (
								<div key={term}>
									<dt>{term}</dt>
									<dd>{detail}</dd>
								</div>
							))}
						</dl>
						<MacDownloadButton className="btn-block" />
						<div className="download-links">
							<a className="text-link" href={RELEASE_TAG_URL}>
								What’s new in {VERSION}
								<ArrowUpRight size={14} aria-hidden="true" />
							</a>
							<a className="text-link" href={LATEST_RELEASE_URL}>
								Latest release on GitHub
								<ArrowUpRight size={14} aria-hidden="true" />
							</a>
						</div>
					</div>
				</div>
			</section>
			<section className="section" aria-labelledby="install-title">
				<div className="wrap">
					<Reveal className="section-head">
						<p className="eyebrow eyebrow-rule">
							<span>Install</span>
							<span>3 steps</span>
						</p>
						<h2 id="install-title" className="section-title">
							From download to first file.
						</h2>
					</Reveal>
					<Reveal as="ol" className="install-steps">
						{install.map(({ title, text }, index) => (
							<li key={title}>
								<span className="step-index" aria-hidden="true">
									{String(index + 1).padStart(2, "0")}
								</span>
								<h3>{title}</h3>
								<p>{text}</p>
							</li>
						))}
					</Reveal>
				</div>
			</section>
		</SiteLayout>
	);
}
