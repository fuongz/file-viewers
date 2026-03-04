import {
	IconCheck,
	IconChevronDown,
	IconChevronRight,
	IconCopy,
} from "@tabler/icons-react";
import githubUrl from "highlight.js/styles/github.css?url";
import githubDarkUrl from "highlight.js/styles/github-dark.css?url";
import {
	Children,
	isValidElement,
	type ReactNode,
	useEffect,
	useState,
} from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { Button } from "./ui/Button";

interface HastNode {
	type: string;
	value?: string;
	children?: HastNode[];
	properties?: Record<string, unknown>;
}

function getNodeText(node: HastNode): string {
	if (node.type === "text") return node.value ?? "";
	return (node.children ?? []).map(getNodeText).join("");
}

interface CodeElProps {
	className?: string;
	children?: ReactNode;
}

function extractCodeInfoFromChildren(children: ReactNode): {
	lang: string;
	text: string;
} {
	const codeEl = Children.toArray(children).find(
		(c): c is React.ReactElement<CodeElProps> => isValidElement(c),
	) as React.ReactElement<CodeElProps> | undefined;
	if (!codeEl) return { lang: "", text: "" };
	const className = codeEl.props.className ?? "";
	const lang =
		className
			.split(" ")
			.find((c) => c.startsWith("language-"))
			?.replace("language-", "") ?? "";
	const text = String(codeEl.props.children ?? "").trimEnd();
	return { lang, text };
}

export function CodeBlock({
	node,
	children,
}: {
	node?: HastNode;
	children?: ReactNode;
}) {
	const [collapsed, setCollapsed] = useState(false);
	const [copied, setCopied] = useState(false);

	let lang: string;
	let rawText: string;

	if (node) {
		const codeChild = node.children?.[0];
		const classNames =
			(codeChild?.properties?.className as string[] | undefined) ?? [];
		lang =
			classNames
				.find((c) => c.startsWith("language-"))
				?.replace("language-", "") ?? "";
		rawText = getNodeText(node).trimEnd();
	} else {
		const info = extractCodeInfoFromChildren(children);
		lang = info.lang;
		rawText = info.text;
	}

	const lineCount = rawText ? rawText.split("\n").length : 0;

	const handleCopy = async () => {
		await navigator.clipboard.writeText(rawText);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div className="md-code-block">
			<div className="flex items-center justify-between px-2 py-1 bg-[var(--bg-toolbar)] border-b border-[var(--border)]">
				<div className="flex items-center gap-1.5">
					<Button
						variant="icon"
						onClick={() => setCollapsed((c) => !c)}
						title={collapsed ? "Expand" : "Collapse"}
					>
						{collapsed ? (
							<IconChevronRight size={11} stroke={2} />
						) : (
							<IconChevronDown size={11} stroke={2} />
						)}
					</Button>
					{lang && (
						<span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-primary)]">
							{lang}
						</span>
					)}
					<span className="text-[var(--text-muted)] text-[10px]">
						{lineCount} {lineCount === 1 ? "line" : "lines"}
					</span>
				</div>
				<Button variant="icon" onClick={handleCopy} title="Copy">
					{copied ? (
						<IconCheck size={13} stroke={2} />
					) : (
						<IconCopy size={13} stroke={1.5} />
					)}
				</Button>
			</div>
			{!collapsed && <pre>{children}</pre>}
		</div>
	);
}

interface MarkdownPreviewProps {
	content: string;
	isDark: boolean;
}

const HLJS_LINK_ID = "hljs-theme";

export function MarkdownPreview({ content, isDark }: MarkdownPreviewProps) {
	useEffect(() => {
		let link = document.getElementById(HLJS_LINK_ID) as HTMLLinkElement | null;
		if (!link) {
			link = document.createElement("link");
			link.id = HLJS_LINK_ID;
			link.rel = "stylesheet";
			document.head.appendChild(link);
		}
		link.href = isDark ? githubDarkUrl : githubUrl;
	}, [isDark]);

	if (!content.trim()) {
		return (
			<div className="preview-empty">
				<p>Start typing Markdown in the editor...</p>
			</div>
		);
	}

	return (
		<article className="markdown-body">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				rehypePlugins={[rehypeHighlight]}
				components={{
					// biome-ignore lint/suspicious/noExplicitAny: hast node type
					pre: ({ node, children }: any) => (
						<CodeBlock node={node}>{children}</CodeBlock>
					),
				}}
			>
				{content}
			</ReactMarkdown>
		</article>
	);
}
