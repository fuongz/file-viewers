import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowDown,
	Braces,
	Database,
	FileText,
	Network,
	Table2,
} from "lucide-react";
import { type KeyboardEvent, useState } from "react";
import { VERSION } from "../version";

export const Route = createFileRoute("/")({ component: HomePage });

const previews = [
	{
		id: "sqlite",
		label: "SQLite",
		icon: Database,
		file: "observatory.sqlite",
		description:
			"Browse tables, filter rows, and run read-only SQL in separate tabs.",
		alt: "SQLite viewer with an observatory table selected and a grid of observation records.",
	},
	{
		id: "schema",
		label: "Schema diagram",
		icon: Network,
		file: "observatory.sqlite",
		description:
			"Follow foreign keys and rearrange tables on the schema canvas.",
		alt: "Schema diagram connecting observations, instruments, observatories, and calibrations.",
	},
	{
		id: "jsonl",
		label: "JSONL",
		icon: Braces,
		file: "events.jsonl",
		description: "Expand individual records or switch to the original lines.",
		alt: "Expandable JSON Lines records showing observation events and measurements.",
	},
	{
		id: "csv",
		label: "CSV",
		icon: Table2,
		file: "observations.csv",
		description:
			"Sort columns, resize the grid, and select cells to copy or edit.",
		alt: "CSV grid showing targets, exposure times, and observation quality.",
	},
	{
		id: "markdown",
		label: "Markdown",
		icon: FileText,
		file: "field-notes.md",
		description: "Read rendered tables, checklists, and highlighted code.",
		alt: "Rendered observatory notes with a table, a handoff checklist, and a SQL code block.",
	},
];

function HomePage() {
	const [active, setActive] = useState(0);

	function navigatePreviews(event: KeyboardEvent<HTMLButtonElement>) {
		let next: number;
		switch (event.key) {
			case "ArrowRight":
				next = (active + 1) % previews.length;
				break;
			case "ArrowLeft":
				next = (active - 1 + previews.length) % previews.length;
				break;
			case "Home":
				next = 0;
				break;
			case "End":
				next = previews.length - 1;
				break;
			default:
				return;
		}
		event.preventDefault();
		setActive(next);
		document.getElementById(`preview-tab-${previews[next].id}`)?.focus();
	}

	return (
		<div className="min-h-screen bg-[#171514] text-[#faf5ef]">
			<header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
				<Link to="/" className="flex items-center gap-2 font-semibold">
					<img src="/icon.png" width={40} height={40} alt="" />
					File Viewers
				</Link>
				<a
					href="https://github.com/fuongz/file-viewers"
					className="inline-flex items-center gap-2 text-sm text-[#c6bcb3] hover:text-white"
				>
					GitHub
				</a>
			</header>

			<main className="mx-auto max-w-6xl px-5 pb-12 sm:px-8">
				<section className="mx-auto max-w-3xl py-12 text-center sm:py-16">
					<h1 className="text-balance text-4xl font-semibold tracking-[-0.045em] sm:text-6xl">
						A desktop viewer for data and docs
					</h1>
					<p className="mx-auto mt-5 max-w-lg text-pretty text-base text-[#c6bcb3] sm:text-lg">
						Open SQLite, JSON, JSONL, CSV, Excel, Parquet, and Markdown in one
						app.
					</p>
					<Link
						to="/download"
						className="mt-7 inline-flex items-center gap-2.5 rounded-lg bg-[#ffa781] px-4 py-2.5 text-sm font-semibold text-[#29160e] transition-colors hover:bg-[#ffc0a4]"
					>
						<ArrowDown size={16} aria-hidden="true" />
						Download
						<span className="border-l border-current/20 pl-2.5 tabular-nums">
							v{VERSION}
						</span>
					</Link>
				</section>

				<section aria-label="App previews" className="mx-auto max-w-5xl">
					<div
						role="tablist"
						aria-label="Choose a preview"
						className="mb-4 flex flex-wrap gap-1.5"
					>
						{previews.map(({ id, label, icon: Icon }, index) => (
							<button
								key={id}
								id={`preview-tab-${id}`}
								type="button"
								role="tab"
								aria-selected={index === active}
								aria-controls={`preview-${id}`}
								tabIndex={index === active ? 0 : -1}
								onClick={() => setActive(index)}
								onKeyDown={navigatePreviews}
								className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm text-[#c6bcb3] transition-colors hover:bg-white/8 hover:text-white aria-selected:bg-[#402c23] aria-selected:text-[#ffd0b9]"
							>
								<Icon size={15} aria-hidden="true" />
								{label}
							</button>
						))}
					</div>
					{previews.map(({ id, file, description, alt }, index) => (
						<div
							key={id}
							id={`preview-${id}`}
							role="tabpanel"
							aria-labelledby={`preview-tab-${id}`}
							hidden={index !== active}
							tabIndex={index === active ? 0 : -1}
						>
							{index === active && (
								<figure className="m-0">
									<div className="overflow-hidden rounded-xl border border-white/10 bg-[#211e1b] shadow-2xl shadow-black/35">
										<img
											src={`/banners/${id}.webp`}
											alt={alt}
											width={1800}
											height={1140}
											className="block h-auto w-full"
										/>
									</div>
									<figcaption className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1 px-1">
										<code className="text-xs text-[#f0af91]">{file}</code>
										<span className="text-sm text-[#c6bcb3]">
											{description}
										</span>
									</figcaption>
								</figure>
							)}
						</div>
					))}
				</section>
			</main>

			<footer className="mx-auto max-w-6xl px-5 pb-6 text-center text-xs text-[#a89e95] sm:px-8">
				© {new Date().getFullYear()}{" "}
				<a href="https://phuongphung.com" className="hover:text-white">
					fuongz
				</a>
			</footer>
		</div>
	);
}
