import { createFileRoute, Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { VERSION } from "../version";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	return (
		<div className="relative min-h-screen flex flex-col">
			{/* Hero */}
			<main className="flex-1 flex flex-col items-center px-8 pt-20 pb-0 max-sm:pt-16">
				{/* App Icon */}
				<img
					src="/icon.png"
					alt="File Viewers"
					width={90}
					height={90}
					className="rounded-[22%] mb-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
				/>

				{/* Name */}
				<h1 className="text-[2.8rem] font-bold text-white tracking-tight leading-none mb-3 text-center max-sm:text-4xl">
					File Viewers
				</h1>

				{/* Tagline */}
				<p className="text-[1.1rem] text-white/70 mb-6 text-center">
					Your files, beautifully rendered.
				</p>

				{/* Download */}
				<div className="mb-4">
					<Link
						to="/download"
						className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white no-underline transition-all hover:brightness-110 active:scale-95"
						style={{ backgroundColor: "#f74f18" }}
					>
						<Download size={15} />
						Download
					</Link>
				</div>

				{/* Version meta */}
				<div className="flex items-center gap-2 mb-12 flex-wrap justify-center">
					<span
						className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold tracking-widest uppercase"
						style={{ backgroundColor: "#2a2a2a", color: "#888" }}
					>
						BETA
					</span>
					<span className="text-xs text-white/40">
						v{VERSION} · Open source on{" "}
						<a
							href="https://github.com/fuongz/file-viewers"
							target="_blank"
							rel="noopener noreferrer"
							className="no-underline hover:underline text-white/40"
						>
							GitHub
						</a>
					</span>
				</div>

				{/* Hero Banner */}
				<div className="w-full mx-auto px-0 max-sm:px-4">
					<img
						src="/hero-banner.png"
						alt=""
						className="w-full rounded-t-xl shadow-[0_-8px_60px_rgba(247,79,24,0.12)]"
					/>
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
