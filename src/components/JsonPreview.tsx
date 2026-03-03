import {
	allExpanded,
	darkStyles,
	defaultStyles,
	JsonView,
} from "react-json-view-lite";
import "react-json-view-lite/dist/index.css";

interface JsonPreviewProps {
	content: string;
	isDark: boolean;
}

export function JsonPreview({ content, isDark }: JsonPreviewProps) {
	if (!content.trim()) {
		return (
			<div className="preview-empty">
				<p>Start typing JSON in the editor...</p>
			</div>
		);
	}

	let parsed: unknown = null;
	let error: string | null = null;

	try {
		parsed = JSON.parse(content);
	} catch (e) {
		error = (e as Error).message;
	}

	if (error) {
		return (
			<div className="json-error">
				<div className="json-error-badge">Invalid JSON</div>
				<pre className="json-error-message">{error}</pre>
			</div>
		);
	}

	return (
		<div className="json-view-container">
			<JsonView
				data={parsed as object}
				shouldExpandNode={allExpanded}
				style={isDark ? darkStyles : defaultStyles}
			/>
		</div>
	);
}
