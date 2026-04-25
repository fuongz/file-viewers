import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, Braces, Database, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { VERSION } from "../version";

export const Route = createFileRoute("/")({ component: HomePage });

const TABS = [
	{ id: "001", label: "Markdown", icon: FileText },
	{ id: "002", label: "CSV", icon: Table2 },
	{ id: "003", label: "JSON", icon: Braces },
	{ id: "004", label: "Excel", icon: FileSpreadsheet },
	{ id: "005", label: "Parquet", icon: Database },
];

function BannerImage({ src, alt }: { src: string; alt: string }) {
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		setLoaded(false);
		const img = new Image();
		img.src = src;
		img.onload = () => setLoaded(true);
	}, [src]);

	return (
		<div className="relative w-full" style={{ minHeight: "300px" }}>
			{!loaded && (
				<div className="absolute inset-0 rounded-lg bg-white/5 animate-pulse" />
			)}
			<AnimatePresence mode="wait">
				<motion.img
					key={src}
					src={src}
					alt={alt}
					className="w-full block object-cover"
					style={{ opacity: loaded ? 1 : 0 }}
					initial={{ opacity: 0, y: 6 }}
					animate={{ opacity: loaded ? 1 : 0, y: loaded ? 0 : 6 }}
					exit={{ opacity: 0, y: -6 }}
					transition={{ duration: 0.2, ease: "easeInOut" }}
				/>
			</AnimatePresence>
		</div>
	);
}

function HomePage() {
	const [active, setActive] = useState("001");
	return (
		<div className="relative min-h-screen flex flex-col">
			{/* Hero */}
			<main className="flex-1 flex flex-col items-center px-8 pt-20 pb-0 max-sm:pt-16">
				{/* App Icon */}
				<motion.img
					src="/icon.png"
					alt="File Viewers"
					width={240}
					height={240}
					className="mb-6"
					initial={{ opacity: 0, scale: 0.9, y: 20 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					transition={{ duration: 0.5, ease: "easeOut" }}
				/>

				{/* Name */}
				<motion.h1
					className="text-[2.8rem] font-bold text-white tracking-tight leading-none mb-3 text-center max-sm:text-4xl"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
				>
					File Viewers
				</motion.h1>

				{/* Tagline */}
				<motion.p
					className="text-[1.1rem] text-white/50 mb-6 text-center"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
				>
					Your files, beautifully rendered.
				</motion.p>

				{/* Download */}
				<motion.div
					className="mb-4"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
				>
					<Link
						to="/download"
						className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-white no-underline transition-all hover:brightness-110 active:scale-95"
						style={{ backgroundColor: "#f74f18" }}
					>
						<ArrowDown size={15} />
						Download
						<span className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold tracking-widest uppercase bg-[#2a2a2a]/20">
							v{VERSION}
						</span>
					</Link>
				</motion.div>

				{/* Version meta */}
				<motion.div
					className="flex items-center gap-2 mb-12 flex-wrap justify-center"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.4, ease: "easeOut" }}
				>
					<span className="text-xs text-white/40">
						Open source on{" "}
						<a
							href="https://github.com/fuongz/file-viewers"
							target="_blank"
							rel="noopener noreferrer"
							className="no-underline hover:underline text-white/70"
						>
							GitHub
						</a>
					</span>
				</motion.div>

				{/* Tabbed Banners */}
				<motion.div
					className="w-full max-w-4xl mx-auto mb-6 pt-8 text-center"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
				>
					<p className="text-white/40 mt-1 text-xs">
						Open and preview any file format - no extra apps needed.
					</p>
				</motion.div>

				{/* Tabs row */}
				<motion.div
					className="flex items-center gap-1 mb-6 bg-white/5 rounded-full p-1"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
				>
					{TABS.map((tab) => {
						const Icon = tab.icon;
						return (
							<motion.button
								key={tab.id}
								type="button"
								onClick={() => setActive(tab.id)}
								className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border-0 ${
									active === tab.id
										? "bg-white/15 text-white shadow"
										: "bg-transparent text-white/40 hover:text-white/70"
								}`}
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
							>
								<Icon size={14} />
								{tab.label}
							</motion.button>
						);
					})}
				</motion.div>

				{/* Monitor frame + image */}
				<motion.div
					className="w-full max-w-4xl mx-auto pb-12"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.7, ease: "easeOut" }}
				>
					{/* Screen bezel */}
					<div className="relative rounded-2xl bg-[#1c1c1e] p-3 shadow-2xl border border-white/10">
						{/* Inner screen */}
						<div className="rounded-lg overflow-hidden">
							<BannerImage
								src={`/banners/${active}.png`}
								alt={TABS.find((t) => t.id === active)?.label ?? ""}
							/>
						</div>
						{/* Bottom chin */}
						<div className="h-5 flex items-center justify-center mt-2">
							<div className="w-2 h-2 rounded-full bg-white/10" />
						</div>
					</div>
					{/* Neck */}
					<div className="flex flex-col items-center">
						<div
							className="w-14 bg-[#3a3a3c]"
							style={{
								height: "40px",
								clipPath: "polygon(20% 0%, 80% 0%, 90% 100%, 10% 100%)",
							}}
						/>
						{/* Base */}
						<div className="w-36 h-3 rounded-full bg-[#3a3a3c]" />
					</div>
				</motion.div>
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
