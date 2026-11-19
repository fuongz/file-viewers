import { loader } from "@monaco-editor/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import JsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ── Monaco: use locally bundled files instead of CDN ─────────
window.MonacoEnvironment = {
	getWorker(_: unknown, label: string) {
		if (label === "json") return new JsonWorker();
		return new EditorWorker();
	},
};
loader.config({ monaco });

const editorSurfaceColors = {
	"editor.background": "#00000000",
	"editorGutter.background": "#00000000",
	"editor.lineHighlightBorder": "#00000000",
};
monaco.editor.defineTheme("viewer-light", {
	base: "vs",
	inherit: true,
	rules: [],
	colors: {
		...editorSurfaceColors,
		"editor.lineHighlightBackground": "#18181B10",
		"editor.selectionBackground": "#2563EB35",
		"editor.inactiveSelectionBackground": "#2563EB20",
	},
});
monaco.editor.defineTheme("viewer-dark", {
	base: "vs-dark",
	inherit: true,
	rules: [],
	colors: {
		...editorSurfaceColors,
		"editor.lineHighlightBackground": "#FFFFFF12",
		"editor.selectionBackground": "#4A92FF44",
		"editor.inactiveSelectionBackground": "#4A92FF24",
	},
});

// Open all anchor-tag clicks in the system default browser instead of the Tauri webview
document.addEventListener("click", (e) => {
	const anchor = (e.target as Element).closest("a");
	if (!anchor) return;
	const href = anchor.getAttribute("href");
	if (!href || href.startsWith("#")) return;
	e.preventDefault();
	openUrl(href);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
