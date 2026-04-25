import { useCallback, useRef } from "react";
import { selectActiveTab, useAppStore } from "../store";
import { detectFormat } from "../utils/detectFormat";

export function useEditorActions() {
	const activeTab = useAppStore(selectActiveTab);
	const activeTabId = useAppStore((s) => s.activeTabId);
	const setTabs = useAppStore((s) => s.setTabs);
	const updateActiveTab = useAppStore((s) => s.updateActiveTab);

	const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleEditorChange = useCallback(
		(val: string) => {
			setTabs((prev) =>
				prev.map((t) => {
					if (t.id !== activeTabId) return t;
					const format = t.path ? t.format : detectFormat(val);
					return { ...t, content: val, isDirty: true, format };
				}),
			);
			if (previewTimer.current) clearTimeout(previewTimer.current);
			previewTimer.current = setTimeout(() => {
				setTabs((prev) =>
					prev.map((t) =>
						t.id === activeTabId ? { ...t, previewContent: val } : t,
					),
				);
			}, 300);
		},
		[activeTabId, setTabs],
	);

	const formatMarkdown = useCallback(() => {
		const converted = activeTab.content
			.replace(/\\n/g, "\n")
			.replace(/\\t/g, "\t")
			.replace(/\\r/g, "\r")
			.replace(/\\"/g, '"')
			.replace(/\\\\/g, "\\");
		updateActiveTab({ content: converted, previewContent: converted });
	}, [activeTab.content, updateActiveTab]);

	const formatJson = useCallback(() => {
		const tryParse = (src: string) => JSON.stringify(JSON.parse(src), null, 2);
		try {
			let formatted: string;
			try {
				formatted = tryParse(activeTab.content);
			} catch {
				const unescaped = activeTab.content
					.replace(/\\n/g, "\n")
					.replace(/\\t/g, "\t")
					.replace(/\\r/g, "\r")
					.replace(/\\"/g, '"')
					.replace(/\\\\/g, "\\");
				formatted = tryParse(unescaped);
			}
			updateActiveTab({ content: formatted, previewContent: formatted });
		} catch {}
	}, [activeTab.content, updateActiveTab]);

	const minifyJson = useCallback(() => {
		try {
			const minified = JSON.stringify(JSON.parse(activeTab.content));
			updateActiveTab({ content: minified, previewContent: minified });
		} catch {}
	}, [activeTab.content, updateActiveTab]);

	return { handleEditorChange, formatMarkdown, formatJson, minifyJson };
}
