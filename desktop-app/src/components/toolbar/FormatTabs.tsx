import { Tabs } from "@base-ui/react/tabs";
import { FORMAT_ICONS } from "../../constants";
import type { Format } from "../../types";

const FORMAT_LIST: Format[] = ["markdown", "json", "csv"];

interface FormatTabsProps {
	value: Format;
	onChange: (format: Format) => void;
}

export function FormatTabs({ value, onChange }: FormatTabsProps) {
	return (
		<Tabs.Root
			value={value}
			onValueChange={(val) => onChange(val as Format)}
			className="format-tabs-root"
		>
			<Tabs.List className="format-tabs">
				{FORMAT_LIST.map((f) => (
					<Tabs.Tab key={f} value={f} className="tab-btn">
						{FORMAT_ICONS[f]}
						{f}
					</Tabs.Tab>
				))}
				<Tabs.Indicator className="tab-indicator" />
			</Tabs.List>
		</Tabs.Root>
	);
}
