import { useAtomValue, useSetAtom } from "jotai/react";
import { useContext } from "react";
import { channelsAtom } from "../../../atoms/channels.atom";
import { feedFilterSettingsAtom } from "../../../atoms/feedFilters.atom";
import { closeMenuAtom } from "../../../atoms/menu.atom";
import { Spacer } from "../../../shared/ui/Spacer/Spacer";
import { AppContext } from "../../app/AppContext";
import { ChannelFilters } from "./ChannelFilters";
import { MenuDialog } from "./MenuDialog";
import { SettingButtonRow } from "./SettingButtonRow";

export default function FiltersSettings() {
	const closeMenu = useSetAtom(closeMenuAtom);
	const channels = useAtomValue(channelsAtom);
	const feedFilterSettings = useAtomValue(feedFilterSettingsAtom);
	const { onEnableAllFeedFilters } = useContext(AppContext);

	const shownCount = channels.filter(
		(channel) => feedFilterSettings[channel.key] !== false,
	).length;
	const allOn = shownCount === channels.length;
	const subtitle =
		channels.length === 0
			? "No channels in feed yet."
			: `${shownCount} of ${channels.length} channels shown`;

	return (
		<MenuDialog title="Filters" onClose={closeMenu}>
			<SettingButtonRow
				title="Feed channels"
				subtitle={subtitle}
				variant={allOn ? "default" : "primary"}
				buttonText={allOn ? "All on" : "Show all"}
				onClick={onEnableAllFeedFilters}
				disabled={channels.length === 0 || allOn}
			/>
			<Spacer />
			<ChannelFilters />
		</MenuDialog>
	);
}
