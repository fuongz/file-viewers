import { loader } from "@monaco-editor/react";
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

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
