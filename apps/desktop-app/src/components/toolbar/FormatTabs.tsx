import { Tabs } from "@base-ui/react/tabs";
import { FORMAT_ICONS } from "../../constants";
import type { Format } from "../../types";

const FORMAT_LIST: Format[] = ["markdown", "json", "csv", "parquet"];

interface FormatTabsProps {
	value: Format;
	onChange: (format: Format) => void;
	isDisabled?: boolean;
}

export function FormatTabs({ value, onChange, isDisabled }: FormatTabsProps) {
	return (
		<Tabs.Root
			value={value}
			onValueChange={(val) => {
				if (isDisabled) return;
				onChange(val as Format);
			}}
			className="format-tabs-root"
		>
			<Tabs.List className="format-tabs">
				{FORMAT_LIST.map((f) => (
					<Tabs.Tab key={f} value={f} className="tab-btn" disabled={isDisabled}>
						{FORMAT_ICONS[f]}
						{f}
					</Tabs.Tab>
				))}
				<Tabs.Indicator className="tab-indicator" />
			</Tabs.List>
		</Tabs.Root>
	);
}
