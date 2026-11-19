import Editor, { useMonaco } from "@monaco-editor/react";
import { type ReactNode, useEffect } from "react";
import { fontStack, monoFonts } from "../lib/typography";
import { useAppStore } from "../store";

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
	const { monoFont, monoSize } = useAppStore((s) => s.typography);
	const fontFamily = fontStack(monoFonts, monoFont);
	const monaco = useMonaco();

	useEffect(() => {
		if (!monaco) return;
		let active = true;
		void document.fonts.load(`${monoSize}px ${fontFamily}`).then(
			() => {
				if (active) monaco.editor.remeasureFonts();
			},
			() => {},
		);
		return () => {
			active = false;
		};
	}, [fontFamily, monoSize, monaco]);

	return (
		<div className="editor-panel">
			<div className="editor-panel-monaco">
				{actionsBar && <div className="editor-panel-actions">{actionsBar}</div>}
				<Editor
					height="100%"
					language={language}
					value={value}
					theme={isDark ? "viewer-dark" : "viewer-light"}
					onChange={(val) => onChange(val ?? "")}
					options={{
						minimap: { enabled: false },
						fontSize: monoSize,
						lineNumbers: "on",
						wordWrap: "on",
						scrollBeyondLastLine: false,
						padding: { top: 16, bottom: 56 },
						fontFamily,
						fontLigatures: true,
						renderLineHighlight: "line",
						cursorBlinking: "smooth",
						smoothScrolling: true,
					}}
				/>
			</div>
		</div>
	);
}
