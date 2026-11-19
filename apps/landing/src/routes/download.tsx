import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { RELEASES_URL, SiteLayout } from "../components/SiteLayout";
import { RELEASE_DATE, VERSION } from "../version";

export const Route = createFileRoute("/download")({
	head: () => ({
		meta: [
			{ title: "Download — File Viewers" },
			{
				name: "description",
				content: "Download File Viewers for macOS, Windows, and Linux.",
			},
		],
	}),
	component: DownloadPage,
});

const releaseURL = `${RELEASES_URL}/tag/v${VERSION}`;
const assetsURL = `${RELEASES_URL}/download/v${VERSION}`;

const platforms = [
	{
		id: "macos",
		name: "macOS",
		details: "Universal · Apple Silicon and Intel",
		downloads: [
			{
				label: "Disk image",
				extension: ".dmg",
				file: `File.Viewers_${VERSION}_universal.dmg`,
			},
		],
	},
	{
		id: "windows",
		name: "Windows",
		details: "64-bit · WebView2",
		downloads: [
			{
				label: "Setup",
				extension: ".exe",
				file: `File.Viewers_${VERSION}_x64-setup.exe`,
			},
			{
				label: "Windows Installer",
				extension: ".msi",
				file: `File.Viewers_${VERSION}_x64_en-US.msi`,
			},
		],
	},
	{
		id: "linux",
		name: "Linux",
		details: "x86-64 · WebKitGTK",
		downloads: [
			{
				label: "AppImage",
				extension: ".AppImage",
				file: `File.Viewers_${VERSION}_amd64.AppImage`,
			},
			{
				label: "Debian / Ubuntu",
				extension: ".deb",
				file: `File.Viewers_${VERSION}_amd64.deb`,
			},
			{
				label: "Fedora",
				extension: ".rpm",
				file: `File.Viewers-${VERSION}-1.x86_64.rpm`,
			},
		],
	},
] as const;

type Platform = (typeof platforms)[number]["id"];

function detectPlatform(): Platform | null {
	const agent = navigator.userAgent.toLowerCase();
	if (/android|iphone|ipad|ipod|cros/.test(agent)) return null;
	const platform = navigator.platform.toLowerCase();
	if (platform.startsWith("mac")) return "macos";
	if (platform.startsWith("win")) return "windows";
	if (platform.startsWith("linux")) return "linux";
	return null;
}

const releaseDate = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeZone: "UTC",
}).format(new Date(RELEASE_DATE));

function DownloadPage() {
	const [current, setCurrent] = useState<Platform | null>(null);
	useEffect(() => setCurrent(detectPlatform()), []);

	return (
		<SiteLayout>
			<main>
				<section aria-labelledby="downloads-title" className="paper-hero">
					<div className="site-wrap download-hero">
						<Link to="/" className="site-text-link">
							<ArrowLeft size={15} aria-hidden="true" /> Back to home
						</Link>
						<h1 id="downloads-title" className="display-title">
							Download File Viewers
						</h1>
						<div className="release-meta">
							<code>v{VERSION}</code>
							<time dateTime={RELEASE_DATE}>{releaseDate}</time>
							<a className="site-text-link" href={releaseURL}>
								Changelog <ArrowUpRight size={14} aria-hidden="true" />
							</a>
						</div>
					</div>
				</section>
				<section
					aria-label="Installers by platform"
					className="site-wrap download-list"
				>
					{platforms.map(({ id, name, details, downloads }) => (
						<section
							className="platform-row"
							key={id}
							aria-labelledby={`platform-${id}`}
						>
							<div>
								<h2 id={`platform-${id}`} className="display-title">
									{name}
								</h2>
								<p>{details}</p>
								{current === id && (
									<span className="current-platform">Your platform</span>
								)}
							</div>
							<ul>
								{downloads.map(({ label, extension, file }) => (
									<li key={file}>
										<a className="installer-link" href={`${assetsURL}/${file}`}>
											<span>{label}</span>
											<code>{extension}</code>
											<ArrowDown size={16} aria-hidden="true" />
										</a>
									</li>
								))}
							</ul>
						</section>
					))}
				</section>
			</main>
		</SiteLayout>
	);
}
