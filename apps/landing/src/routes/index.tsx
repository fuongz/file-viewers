import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { DownloadLink, SiteLayout } from "../components/SiteLayout";

export const Route = createFileRoute("/")({ component: HomePage });

const previews = [
	{
		id: "sqlite",
		label: "Browse database tables",
		format: "SQLite",
		file: "observatory.sqlite",
		description: "Filter rows, inspect columns, and run read-only SQL.",
		alt: "The SQLite viewer showing the observations table and its column metadata.",
	},
	{
		id: "schema",
		label: "Follow table relationships",
		format: "Schema",
		file: "observatory.sqlite",
		description:
			"Follow foreign keys and rearrange tables on the schema canvas.",
		alt: "Schema diagram linking observations, instruments, observatories, and calibrations.",
	},
	{
		id: "jsonl",
		label: "Unpack an event log",
		format: "JSONL",
		file: "events.jsonl",
		description: "Expand one record at a time or switch to the original lines.",
		alt: "Expandable JSON Lines records showing observation events and measurements.",
	},
	{
		id: "csv",
		label: "Review a spreadsheet",
		format: "CSV",
		file: "observations.csv",
		description: "Sort by a column, resize it, or select cells to copy.",
		alt: "CSV grid showing targets, exposure times, and observation quality.",
	},
	{
		id: "markdown",
		label: "Read the field notes",
		format: "Markdown",
		file: "field-notes.md",
		description: "Preview Markdown tables, checklists, and highlighted code.",
		alt: "Rendered observatory notes with a table, a handoff checklist, and a SQL code block.",
	},
];

function HomePage() {
	const [active, setActive] = useState(0);
	const tabs = useRef<Array<HTMLButtonElement | null>>([]);

	function navigatePreviews(event: KeyboardEvent<HTMLButtonElement>) {
		let next: number;
		switch (event.key) {
			case "ArrowDown":
				next = (active + 1) % previews.length;
				break;
			case "ArrowUp":
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
		tabs.current[next]?.focus();
	}

	return (
		<SiteLayout>
			<main>
				<section aria-labelledby="home-title" className="paper-hero">
					<div className="site-wrap home-hero">
						<div className="hero-copy">
							<h1 id="home-title" className="display-title">
								Open a file.
								<br />
								Look closer.
							</h1>
							<p>
								Explore databases, event logs, spreadsheets, and notes in one
								desktop app.
							</p>
							<div className="hero-actions">
								<DownloadLink />
								<a href="#previews" className="site-text-link">
									See the app <ArrowDownRight size={16} aria-hidden="true" />
								</a>
							</div>
							<p className="hero-platforms">
								Free and open source for macOS, Windows, and Linux.
							</p>
						</div>
						<div
							className="preview-collage"
							role="group"
							aria-label="Featured app previews"
						>
							{[previews[3], previews[0], previews[1]].map(({ id, format }) => (
								<Link
									key={id}
									to="/"
									hash="previews"
									className={`collage-window collage-${id}`}
									onClick={() =>
										setActive(
											previews.findIndex((preview) => preview.id === id),
										)
									}
								>
									<img
										width={1800}
										height={1140}
										src={`/banners/${id}.webp`}
										alt=""
									/>
									<span>
										{format} <ArrowUpRight size={13} aria-hidden="true" />
									</span>
								</Link>
							))}
						</div>
					</div>
				</section>
				<section
					id="previews"
					aria-labelledby="previews-title"
					className="site-wrap workflow"
				>
					<div className="workflow-copy">
						<h2 id="previews-title" className="display-title">
							Follow the data.
						</h2>
						<p>Explore the same observatory files in five views.</p>
						<div
							role="tablist"
							aria-label="App previews"
							aria-orientation="vertical"
							className="workflow-list"
						>
							{previews.map(({ id, label }, index) => (
								<button
									key={id}
									id={`preview-tab-${id}`}
									ref={(tab) => {
										tabs.current[index] = tab;
									}}
									type="button"
									role="tab"
									aria-selected={index === active}
									aria-controls={`preview-${id}`}
									tabIndex={index === active ? 0 : -1}
									onClick={() => setActive(index)}
									onKeyDown={navigatePreviews}
								>
									{label}
									<ArrowUpRight size={15} aria-hidden="true" />
								</button>
							))}
						</div>
					</div>
					<div className="workflow-images">
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
									<figure>
										<img
											className="workflow-image"
											src={`/banners/${id}.webp`}
											alt={alt}
											width={1800}
											height={1140}
											loading={index === 0 ? "lazy" : "eager"}
										/>
										<figcaption>
											<code>{file}</code>
											<span>{description}</span>
										</figcaption>
									</figure>
								)}
							</div>
						))}
					</div>
				</section>
				<section aria-labelledby="formats-title" className="format-band">
					<div className="site-wrap">
						<div>
							<h2 id="formats-title" className="display-title">
								Supported formats
							</h2>
							<p>SQLite, JSON, JSONL, CSV, Excel, Parquet, and Markdown.</p>
						</div>
						<DownloadLink />
					</div>
				</section>
			</main>
		</SiteLayout>
	);
}
