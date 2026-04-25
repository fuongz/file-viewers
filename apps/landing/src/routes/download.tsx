import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, Download } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { RELEASE_DATE, VERSION } from "../version";

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

interface DownloadItem {
	label: string;
	href: string;
}

interface PlatformNote {
	text: string;
	command: string;
}

interface Platform {
	id: "macos" | "windows" | "linux";
	name: string;
	icon: string;
	badge: string;
	downloads: DownloadItem[];
	requirements: string[];
	note?: PlatformNote;
}

const PLATFORMS: Platform[] = [
	{
		id: "macos",
		name: "macOS",
		icon: "/icon-apple.svg",
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
		note: {
			text: "If macOS blocks the app after a direct download, run:",
			command: "xattr -c /Applications/File\\ Viewers.app",
		},
	},
	{
		id: "windows",
		name: "Windows",
		icon: "/icon-windows.svg",
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
		id: "linux",
		name: "Linux",
		icon: "/icon-linux.svg",
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

function detectOS(): "macos" | "windows" | "linux" | null {
	if (typeof navigator === "undefined") return null;
	const p = navigator.platform?.toLowerCase() ?? "";
	const ua = navigator.userAgent?.toLowerCase() ?? "";
	if (p.startsWith("mac") || ua.includes("mac")) return "macos";
	if (p.startsWith("win") || ua.includes("windows")) return "windows";
	if (p.startsWith("linux") || ua.includes("linux")) return "linux";
	return null;
}

function DownloadPage() {
	const [currentOS, setCurrentOS] = useState<
		"macos" | "windows" | "linux" | null
	>(null);

	useEffect(() => {
		setCurrentOS(detectOS());
	}, []);

	const releaseDate = new Date(RELEASE_DATE).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	return (
		<div className="relative min-h-screen flex flex-col">
			<main className="flex-1 flex flex-col items-center px-8 pt-16 pb-16 max-sm:pt-12 max-sm:px-4">
				{/* Back */}
				<motion.div
					className="w-full max-w-4xl mb-8"
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.4, ease: "easeOut" }}
				>
					<Link
						to="/"
						className="inline-flex items-center gap-1.5 no-underline transition-colors bg-zinc-800 rounded-full px-4 text-xs text-zinc-400 py-2 hover:text-white hover:bg-zinc-700 active:scale-95 font-semibold"
					>
						<ArrowLeft size={12} /> Back to Home
					</Link>
				</motion.div>

				{/* Header */}
				<motion.div
					className="w-full max-w-4xl mb-10 flex items-center gap-4"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: "easeOut" }}
				>
					<img
						src="/icon.png"
						width={48}
						height={48}
						alt="File Viewers"
						className="rounded-xl"
					/>
					<div>
						<h1 className="text-2xl font-bold text-white leading-tight tracking-tight">
							v{VERSION}
						</h1>
						<p className="text-xs text-white/40 mt-0.5 flex items-center gap-2">
							<span>{releaseDate}</span>
							<a
								href={`https://github.com/fuongz/file-viewers/releases/tag/v${VERSION}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-400 hover:underline no-underline inline-flex items-center gap-1"
							>
								View changelog <ArrowRight size={11} />
							</a>
						</p>
					</div>
				</motion.div>

				{/* Platform cards */}
				<div className="w-full max-w-4xl grid grid-cols-3 gap-4 max-md:grid-cols-1">
					{PLATFORMS.map((platform, index) => {
						const isCurrentOS = currentOS === platform.id;
						return (
							<motion.div
								key={platform.id}
								className={`flex flex-col rounded-2xl p-6 gap-4 border transition-colors ${isCurrentOS ? "border-[#f74f18]/40 bg-[#111]" : "border-white/8 bg-[#111]"}`}
								initial={{ opacity: 0, y: 30 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.5,
									delay: 0.1 * index + 0.2,
									ease: "easeOut",
								}}
							>
								{/* Platform header */}
								<div className="flex items-center gap-3">
									<img
										src={platform.icon}
										width={28}
										height={28}
										alt=""
										aria-hidden="true"
									/>
									<span className="text-lg font-semibold text-white">
										{platform.name}
									</span>
									{isCurrentOS && (
										<span className="ml-auto px-2 py-0.5 rounded text-[0.6rem] font-bold tracking-wider bg-[#f74f18]/15 text-[#f74f18] border border-[#f74f18]/25">
											YOUR OS
										</span>
									)}
								</div>

								{/* Badge */}
								<span className="self-start px-2 py-0.5 rounded text-[0.65rem] font-semibold tracking-wide bg-[#1e1e1e] text-[#888]">
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
								<ul className="list-none p-0 m-0 flex flex-col gap-1.5 border-t border-white/5 pt-4">
									{platform.requirements.map((req) => (
										<li key={req} className="text-xs text-white/40 flex gap-2">
											<span className="text-white/20">·</span>
											{req}
										</li>
									))}
								</ul>

								{/* Note */}
								{platform.note && (
									<div className="flex gap-2 rounded-lg bg-amber-500/8 border border-amber-500/20 px-3 py-2.5">
										<AlertTriangle
											size={13}
											className="text-amber-400 mt-0.5 flex-shrink-0"
										/>
										<div className="flex flex-col gap-1.5">
											<p className="text-xs text-amber-300/70 leading-relaxed">
												{platform.note.text}
											</p>
											<code className="text-xs">{platform.note.command}</code>
										</div>
									</div>
								)}
							</motion.div>
						);
					})}
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
