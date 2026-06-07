import { useSetAtom } from "jotai/react";
import { useContext } from "react";
import { closeMenuAtom } from "../../../atoms/menu.atom";
import { Spacer } from "../../../shared/ui/Spacer/Spacer";
import type { FontSize } from "../../../types";
import { AppContext } from "../../app/AppContext";
import { MenuDialog } from "./MenuDialog";
import { SettingButtonRow } from "./SettingButtonRow";

const OPTIONS: { value: FontSize; title: string; subtitle: string }[] = [
	{ value: "small", title: "Small", subtitle: "Compact text (14px)" },
	{ value: "medium", title: "Medium", subtitle: "Default text (16px)" },
	{ value: "large", title: "Large", subtitle: "Larger text (18px)" },
	{ value: "xlarge", title: "Extra large", subtitle: "Largest text (20px)" },
];

export default function FontSizeSettings() {
	const closeMenu = useSetAtom(closeMenuAtom);
	const { fontSize, onSetFontSize } = useContext(AppContext);

	return (
		<MenuDialog title="Font size" onClose={closeMenu}>
			{OPTIONS.map((option) => {
				const active = fontSize.size === option.value;
				return (
					<SettingButtonRow
						key={option.value}
						title={option.title}
						subtitle={option.subtitle}
						buttonText={active ? "Selected" : "Select"}
						variant={active ? "primary" : "default"}
						onClick={() => onSetFontSize({ size: option.value })}
					/>
				);
			})}
			<Spacer />
		</MenuDialog>
	);
}
