import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDown,
	ArrowUpRight,
	Command,
	Cpu,
	Lock,
	type LucideIcon,
	MousePointerClick,
	Package,
	PanelsTopLeft,
	RefreshCw,
	Scale,
	SunMoon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { LoupeStage } from "../components/LoupeStage";
import { Reveal } from "../components/Reveal";
import { ShotCrop } from "../components/ShotWindow";
import { MacDownloadButton, SiteLayout } from "../components/SiteLayout";
import { Tour } from "../components/Tour";
import {
	ISSUES_URL,
	RELEASE_DATE,
	RELEASE_DATE_LABEL,
	REPOSITORY_URL,
	SITE_URL,
	VERSION,
} from "../release";
import { type Shot, type ShotName, shots } from "../shots";

const HERO = shots.hero;

export const Route = createFileRoute("/")({
	head: () => ({
		links: [
			{ rel: "canonical", href: SITE_URL },
			...(["light", "dark"] as const).map((scheme) => ({
				rel: "preload",
				href: scheme === "dark" ? HERO.dark : HERO.light,
				as: "image",
				type: "image/webp",
				media: `(prefers-color-scheme: ${scheme})`,
			})),
		],
	}),
	component: HomePage,
});

/** Staggers the page-load entrance; see `.enter` in styles.css. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

type Format = {
	ext: string;
	name: string;
	aliases?: string;
	text: string;
	/** Bento placement, see `.format-*` in styles.css. */
	size: "wide" | "narrow" | "third" | "half-a" | "half-b";
	/** A crop of a capture centred on the detail that shows the viewer best. */
	crop?: { shot: ShotName; focus: Shot["focus"] };
};

const formats: Format[] = [
	{
		ext: "sqlite",
		name: "SQLite database",
		aliases: ".sqlite3 .db .db3",
		text: "Browse tables and views, run read-only SQL, edit eligible rows and draw the relationship diagram.",
		size: "wide",
		crop: { shot: "sqliteQuery", focus: { x: 0.53, y: 0.21 } },
	},
	{
		ext: "csv",
		name: "Comma-separated values",
		text: "Search, sort, resize columns, edit cells, filter rows with a SQL condition and split or merge files.",
		size: "narrow",
		crop: { shot: "csv", focus: { x: 0.43, y: 0.33 } },
	},
	{
		ext: "parquet",
		name: "Apache Parquet",
		text: "Explore and query columnar tables with DuckDB, running locally inside the app.",
		size: "third",
	},
	{
		ext: "xlsx",
		name: "Excel workbook",
		text: "Switch between sheets, then search, sort and select cells.",
		size: "third",
		crop: { shot: "xlsx", focus: { x: 0.2, y: 0.29 } },
	},
	{
		ext: "json",
		name: "JSON",
		text: "A collapsible tree, the raw text and one-click formatting.",
		size: "third",
		crop: { shot: "json", focus: { x: 0.2, y: 0.33 } },
	},
	{
		ext: "jsonl",
		name: "JSON Lines",
		text: "Paginated records, the raw lines and parse errors with their line numbers.",
		size: "half-a",
		crop: { shot: "jsonl", focus: { x: 0.25, y: 0.27 } },
	},
	{
		ext: "md",
		name: "Markdown",
		aliases: ".markdown .mdx .txt",
		text: "Edit the source and read a GitHub-flavored preview side by side, with highlighted code.",
		size: "half-b",
		crop: { shot: "markdown", focus: { x: 0.57, y: 0.4 } },
	},
];

type Extra = { icon: LucideIcon; title: string; text: string };

const featured: Array<
	Extra & { crop: { shot: ShotName; focus: Shot["focus"]; scale: number } }
> = [
	{
		icon: Command,
		title: "Command palette",
		text: "Switch between open files and run actions without the mouse.",
		crop: { shot: "palette", focus: { x: 0.5, y: 0.31 }, scale: 0.5 },
	},
	{
		icon: SunMoon,
		title: "Themes and fonts",
		text: "Follow the system or pick light or dark, and set the interface and monospace fonts separately.",
		crop: { shot: "settings", focus: { x: 0.55, y: 0.4 }, scale: 0.4 },
	},
];

const extras: Extra[] = [
	{
		icon: PanelsTopLeft,
		title: "File tabs",
		text: "Keep many files open and drag tabs into order.",
	},
	{
		icon: RefreshCw,
		title: "Auto updates",
		text: "New releases arrive from GitHub, and the app asks before installing.",
	},
	{
		icon: MousePointerClick,
		title: "Open With",
		text: "Right-click a file in Finder, then choose Open With and File Viewers.",
	},
	{
		icon: Lock,
		title: "Local only",
		text: "Files are read on your Mac and never leave it. No account needed.",
	},
	{
		icon: Scale,
		title: "Open source",
		text: "MIT licensed. Read the code, file an issue or send a patch.",
	},
];

/** What the download is, under the hero buttons. */
const downloadNotes: Array<{ icon: LucideIcon; text: string }> = [
	{ icon: Package, text: "Universal DMG" },
	{ icon: Cpu, text: "Apple silicon and Intel" },
];

const faqs = [
	{
		q: "Is it free?",
		a: "Yes. File Viewers is free and MIT licensed, with no account, trial or paid tier.",
	},
	{
		q: "Which Macs does it run on?",
		a: "Macs with Apple silicon and Macs with Intel processors. The download is one universal app that runs natively on both.",
	},
	{
		q: "Does it upload my files?",
		a: "No. Files are opened and read on your Mac and stay there. The app goes online only to check GitHub Releases for updates.",
	},
	{
		q: "Where is the source code?",
		a: "On GitHub at fuongz/file-viewers. Issues and pull requests are welcome.",
		link: { href: REPOSITORY_URL, label: "Open the repository" },
	},
	{
		q: "Is there a Windows or Linux version?",
		a: "Not right now. Releases are macOS only for the moment.",
	},
];

/**
 * Parquet has no capture yet, so its card draws the format itself: columns
 * stored as chunks, grouped into row groups, with a footer that holds the
 * schema. Decorative; the card text carries the meaning.
 */
function ParquetMotif() {
	const columns = [
		{ name: "order_id", type: "int64", fills: [1, 0.92, 0.7] },
		{ name: "city", type: "string", fills: [0.58, 0.5, 0.36] },
		{ name: "amount", type: "double", fills: [0.84, 0.78, 0.6] },
		{ name: "status", type: "string", fills: [0.42, 0.4, 0.3] },
	];
	return (
		<div className="crop format-visual parquet" aria-hidden="true">
			<div className="crop-image parquet-grid">
				<span />
				{columns.map((column) => (
					<span key={column.name} className="pq-col">
						{column.name}
						<small>{column.type}</small>
					</span>
				))}
				{[0, 1, 2].map((group) => [
					<span key={`rg-${group}`} className="pq-group">
						rg {group}
					</span>,
					...columns.map((column) => (
						<span key={`${column.name}-${group}`} className="pq-chunk">
							<i style={{ transform: `scaleX(${column.fills[group]})` }} />
						</span>
					)),
				])}
				<span className="pq-footer">footer: schema and column statistics</span>
			</div>
		</div>
	);
}

function HomePage() {
	return (
		<SiteLayout>
			<section className="hero" aria-labelledby="hero-title">
				<div className="wrap hero-copy">
					<div>
						<p className="eyebrow enter" style={delay(0)}>
							<span className="tag">v{VERSION}</span>
							<span>
								Free and open source for{" "}
								<span className="keep-case">macOS</span>
							</span>
						</p>
						<h1 id="hero-title" className="hero-title">
							<span className="hero-title-lead enter" style={delay(70)}>
								Open a file.
							</span>{" "}
							<span className="enter accent-line" style={delay(150)}>
								Look closer.
							</span>
						</h1>
					</div>
					<div className="hero-side enter" style={delay(230)}>
						<p className="hero-lede">
							SQLite databases, spreadsheets, Parquet tables, JSON logs and
							Markdown notes, side by side in one Mac app.
						</p>
						<div className="hero-actions">
							<MacDownloadButton />
							<a className="btn btn-quiet" href="#tour">
								Take the tour <ArrowDown size={16} aria-hidden="true" />
							</a>
						</div>
						<ul className="mono-note note-list">
							{downloadNotes.map(({ icon: Icon, text }) => (
								<li key={text}>
									<Icon size={14} strokeWidth={1.75} aria-hidden="true" />
									{text}
								</li>
							))}
						</ul>
					</div>
				</div>
				<div className="wrap hero-stage enter-window">
					<LoupeStage
						shot={HERO}
						alt="File Viewers showing the calibrations table of an SQLite database, with four files open in tabs."
						caption={["observatory.sqlite", "calibrations"]}
						row={{ y: 0.29, from: 0.34, to: 0.74 }}
					/>
				</div>
			</section>

			<section id="tour" className="section" aria-labelledby="tour-title">
				<div className="wrap">
					<Reveal className="section-head">
						<p className="eyebrow eyebrow-rule">
							<span>Tour</span>
							<span>5 views</span>
						</p>
						<h2 id="tour-title" className="section-title">
							One window, every file.
						</h2>
						<p className="section-lede">
							A database, a spreadsheet and a set of notes, opened five ways.
						</p>
					</Reveal>
					<Reveal>
						<Tour />
					</Reveal>
				</div>
			</section>

			<section
				id="formats"
				className="section section-tint"
				aria-labelledby="formats-title"
			>
				<div className="wrap">
					<Reveal className="section-head">
						<p className="eyebrow eyebrow-rule">
							<span>Formats</span>
							<span>7 types</span>
						</p>
						<h2 id="formats-title" className="section-title">
							A viewer for each kind of file.
						</h2>
						<p className="section-lede">
							Each format opens in a viewer built for its shape, with the tools
							that suit it.
						</p>
					</Reveal>
					<ul className="formats">
						{formats.map((item, index) => (
							<Reveal
								as="li"
								key={item.ext}
								delay={(index % 3) * 0.05}
								className={`format format-${item.size} zoomable`}
							>
								{item.crop ? (
									<ShotCrop
										shot={shots[item.crop.shot]}
										focus={item.crop.focus}
										className="format-visual"
									/>
								) : (
									<ParquetMotif />
								)}
								<div className="format-body">
									<h3 className="format-title">
										<span className="format-ext" translate="no">
											<span>.</span>
											{item.ext}
										</span>{" "}
										<span className="format-name">{item.name}</span>
									</h3>
									<p className="format-text">{item.text}</p>
									{item.aliases && (
										<p className="mono-note" translate="no">
											also {item.aliases}
										</p>
									)}
								</div>
							</Reveal>
						))}
					</ul>
				</div>
			</section>

			<section className="section" aria-labelledby="extras-title">
				<div className="wrap">
					<Reveal className="section-head">
						<p className="eyebrow">Also included</p>
						<h2 id="extras-title" className="section-title">
							Everything else.
						</h2>
					</Reveal>
					<Reveal as="ul" className="featured">
						{featured.map(({ icon: Icon, title, text, crop }) => (
							<li key={title} className="feature zoomable">
								<ShotCrop
									shot={shots[crop.shot]}
									focus={crop.focus}
									scale={crop.scale}
									className="feature-visual"
								/>
								<div className="feature-body">
									<Icon size={20} strokeWidth={1.6} aria-hidden="true" />
									<div>
										<h3>{title}</h3>
										<p>{text}</p>
									</div>
								</div>
							</li>
						))}
					</Reveal>
					<Reveal as="ul" className="extras">
						{extras.map(({ icon: Icon, title, text }) => (
							<li key={title} className="extra">
								<Icon size={20} strokeWidth={1.6} aria-hidden="true" />
								<h3>{title}</h3>
								<p>{text}</p>
							</li>
						))}
					</Reveal>
				</div>
			</section>

			<section id="faq" className="section" aria-labelledby="faq-title">
				<div className="wrap faq-layout">
					<Reveal className="section-head faq-head">
						<p className="eyebrow">FAQ</p>
						<h2 id="faq-title" className="section-title">
							Questions.
						</h2>
						<p className="section-lede">
							Something else?{" "}
							<a className="text-link" href={ISSUES_URL}>
								Ask on GitHub
								<ArrowUpRight size={14} aria-hidden="true" />
							</a>
						</p>
					</Reveal>
					<Reveal className="faq-list">
						{faqs.map(({ q, a, link }) => (
							<details key={q} className="faq-item">
								<summary>
									<span>{q}</span>
									<span className="faq-mark" aria-hidden="true" />
								</summary>
								<p>
									{a}{" "}
									{link && (
										<a className="text-link" href={link.href}>
											{link.label}
											<ArrowUpRight size={14} aria-hidden="true" />
										</a>
									)}
								</p>
							</details>
						))}
					</Reveal>
				</div>
			</section>

			<section className="closing" aria-labelledby="closing-title">
				<Reveal className="wrap">
					<div className="closing-panel">
						<h2 id="closing-title" className="closing-title">
							Every file, up close.
						</h2>
						<div className="action-row">
							<MacDownloadButton />
							<a className="btn btn-quiet" href={REPOSITORY_URL}>
								View source <ArrowUpRight size={16} aria-hidden="true" />
							</a>
						</div>
						<p className="mono-note">
							v{VERSION}, released{" "}
							<time dateTime={RELEASE_DATE}>{RELEASE_DATE_LABEL}</time>
							<br />
							One universal app for Apple silicon and Intel
						</p>
					</div>
				</Reveal>
			</section>
		</SiteLayout>
	);
}
