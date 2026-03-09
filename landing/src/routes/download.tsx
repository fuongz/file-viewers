import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Download } from "lucide-react";
import { VERSION } from "../version";

export const Route = createFileRoute("/download")({
	head: () => ({
		meta: [
			{ title: "Download — File Viewers" },
			{
				name: "description",
				content: "Free to download forever. No sign-up required.",
			},
		],
	}),
	component: DownloadPage,
});

const BASE = "https://github.com/fuongz/file-viewers/releases";

const PLATFORMS = [
	{
		name: "macOS",
		icon: "/icon-apple.svg",
		iconSize: 28,
		badge: "Universal (Apple Silicon & Intel)",
		downloads: [
			{
				label: "Universal .dmg",
				href: `${BASE}/download/v${VERSION}/File.Viewers_${VERSION}_universal.dmg`,
			},
		],
		requirements: [
			"macOS 11 (Big Sur) or later",
			"Apple Silicon or Intel Mac",
			"~10 MB disk space",
		],
	},
	{
		name: "Windows",
		icon: "/icon-windows.svg",
		iconSize: 26,
		badge: "64-bit",
		downloads: [
			{
				label: "Installer .exe",
				href: `${BASE}/download/v${VERSION}/File.Viewers_${VERSION}_x64-setup.exe`,
			},
		],
		requirements: [
			"Windows 10 or later (64-bit)",
			"WebView2 Runtime",
			"~10 MB disk space",
		],
	},
	{
		name: "Linux",
		icon: "/icon-linux.svg",
		iconSize: 26,
		badge: "x86_64",
		downloads: [
			{
				label: "AppImage (amd64)",
				href: `${BASE}/download/v${VERSION}/File.Viewers_${VERSION}_amd64.AppImage`,
			},
			{
				label: "Debian (amd64)",
				href: `${BASE}/download/v${VERSION}/File.Viewers_${VERSION}_amd64.deb`,
			},
			{
				label: "Fedora .rpm",
				href: `${BASE}/download/v${VERSION}/File.Viewers-${VERSION}-1.x86_64.rpm`,
			},
		],
		requirements: [
			"Ubuntu 22.04+, Debian, Fedora or compatible",
			"GTK 3, WebKitGTK",
			"~10 MB disk space",
		],
	},
];

function DownloadPage() {
	return (
		<div className="relative min-h-screen flex flex-col">
			<main className="flex-1 flex flex-col items-center px-8 pt-20 pb-16 max-sm:pt-14">
				{/* Back */}
				<div className="w-full max-w-4xl mb-10">
					<Link
						to="/"
						className="inline-flex items-center gap-1.5 text-sm no-underline transition-colors bg-zinc-800 rounded-full px-4 text-xs text-zinc-400 py-2 hover:text-white hover:bg-zinc-700 active:scale-95 transition hover:transition font-semibold"
					>
						<ArrowLeft size={12} /> Back to Home
					</Link>
				</div>

				{/* Header */}
				<div className="text-center mb-14">
					<h1 className="text-[2.4rem] font-bold text-white tracking-tight leading-none mb-3 max-sm:text-3xl">
						Download File Viewers
					</h1>
					<p className="text-white/60 text-base">
						Free to download forever. No sign-up required.
					</p>
				</div>

				{/* Platform cards */}
				<div className="w-full max-w-4xl grid grid-cols-3 gap-5 mb-16 max-sm:grid-cols-1">
					{PLATFORMS.map((platform) => (
						<div
							key={platform.name}
							className="flex flex-col rounded-2xl p-6 gap-4"
							style={{ backgroundColor: "#111" }}
						>
							{/* Platform header */}
							<div className="flex items-center gap-3">
								<img
									src={platform.icon}
									width={platform.iconSize}
									height={platform.iconSize}
									alt=""
									aria-hidden="true"
								/>
								<span className="text-lg font-semibold text-white">
									{platform.name}
								</span>
							</div>

							{/* Badge */}
							<span
								className="self-start px-2 py-0.5 rounded text-[0.65rem] font-semibold tracking-wide"
								style={{ backgroundColor: "#1e1e1e", color: "#888" }}
							>
								{platform.badge}
							</span>

							{/* Download buttons */}
							<div className="flex flex-col gap-2">
								{platform.downloads.map(({ label, href }) => (
									<a
										key={label}
										href={href}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex bg-zinc-800 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white no-underline transition-all hover:bg-[#f74f18] active:scale-95"
									>
										<Download size={14} />
										{label}
									</a>
								))}
							</div>

							{/* Requirements */}
							<ul className="list-none p-0 m-0 flex flex-col gap-1.5 mt-1 border-t border-white/5 pt-4">
								{platform.requirements.map((req) => (
									<li key={req} className="text-xs text-white/40 flex gap-2">
										<span className="text-white/20">·</span>
										{req}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</main>

			{/* Footer */}
			<footer className="px-16 py-7 max-sm:px-8">
				<p className="text-xs m-0 text-center" style={{ color: "#888" }}>
					© {new Date().getFullYear()}{" "}
					<a
						href="http://phuongphung.com"
						target="_blank"
						rel="noopener"
						className="cursor-pointer hover:underline"
					>
						fuongz
					</a>
				</p>
			</footer>
		</div>
	);
}
