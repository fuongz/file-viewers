import Editor from "@monaco-editor/react";
import type { ReactNode } from "react";

interface EditorPanelProps {
	value: string;
	onChange: (value: string) => void;
	language: string;
	isDark: boolean;
	actionsBar?: ReactNode;
}

export function EditorPanel({
	value,
	onChange,
	language,
	isDark,
	actionsBar,
}: EditorPanelProps) {
	return (
		<div className="editor-panel">
			<div className="editor-panel-monaco">
				{actionsBar && <div className="editor-panel-actions">{actionsBar}</div>}
				<Editor
					height="100%"
					language={language}
					value={value}
					theme={isDark ? "vs-dark" : "vs"}
					onChange={(val) => onChange(val ?? "")}
					options={{
						minimap: { enabled: false },
						fontSize: 13,
						lineNumbers: "on",
						wordWrap: "on",
						scrollBeyondLastLine: false,
						padding: { top: 16, bottom: 56 },
						fontFamily:
							"'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
						fontLigatures: true,
						renderLineHighlight: "all",
						cursorBlinking: "smooth",
						smoothScrolling: true,
					}}
				/>
			</div>
		</div>
	);
}
