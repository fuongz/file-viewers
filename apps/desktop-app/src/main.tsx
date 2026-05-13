import { loader } from "@monaco-editor/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
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
