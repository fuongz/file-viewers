import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
	plugins: [tailwindcss(), react()],
	resolve: {
		alias: {
			"@": resolve(import.meta.dirname, "src"),
		},
	},
	build: {
		// Preserve the previous desktop WebView targets after upgrading Vite.
		target: ["chrome107", "edge107", "firefox104", "safari16"],
		chunkSizeWarningLimit: 3000,
	},
	optimizeDeps: {
		exclude: ["@duckdb/duckdb-wasm"],
	},
	clearScreen: false,
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: "ws",
					host,
					port: 1421,
				}
			: undefined,
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
}));
