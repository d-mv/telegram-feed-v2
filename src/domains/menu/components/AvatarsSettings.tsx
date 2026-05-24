import { useSetAtom } from "jotai/react";
import { useContext } from "react";
import { closeMenuAtom } from "../../../atoms/menu.atom";
import { Spacer } from "../../../shared/ui/Spacer/Spacer";
import { AppContext } from "../../app/AppContext";
import { MenuDialog } from "./MenuDialog";
import { SettingButtonRow } from "./SettingButtonRow";

export default function AvatarsSettings() {
	const closeMenu = useSetAtom(closeMenuAtom);
	const { avatarVisibility, onSetAvatarVisibility } = useContext(AppContext);

	function toggle(key: keyof typeof avatarVisibility) {
		onSetAvatarVisibility({
			...avatarVisibility,
			[key]: !avatarVisibility[key],
		});
	}

	return (
		<MenuDialog title="Avatars" onClose={closeMenu}>
			<SettingButtonRow
				title="Feed"
				subtitle="Show user avatars in feed cards"
				buttonText={avatarVisibility.feed ? "On" : "Off"}
				variant={avatarVisibility.feed ? "primary" : "default"}
				onClick={() => toggle("feed")}
			/>
			<SettingButtonRow
				title="Thread"
				subtitle="Show user avatars in thread messages"
				buttonText={avatarVisibility.thread ? "On" : "Off"}
				variant={avatarVisibility.thread ? "primary" : "default"}
				onClick={() => toggle("thread")}
			/>
			<SettingButtonRow
				title="Notifications"
				subtitle="Use sender avatars in browser notifications"
				buttonText={avatarVisibility.notifications ? "On" : "Off"}
				variant={avatarVisibility.notifications ? "primary" : "default"}
				onClick={() => toggle("notifications")}
			/>
			<Spacer />
		</MenuDialog>
	);
}
