import { useSetAtom } from "jotai/react";
import { useContext, useState } from "react";
import { closeMenuAtom } from "../../../atoms/menu.atom";
import { Spacer } from "../../../shared/ui/Spacer/Spacer";
import { AppContext } from "../../app/AppContext";
import { MenuDialog } from "./MenuDialog";
import { SettingButtonRow } from "./SettingButtonRow";

export default function Maintenance() {
	const closeMenu = useSetAtom(closeMenuAtom);

	const { dal, onLogout } = useContext(AppContext);

	const [isClearingCache, setIsClearingCache] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	async function handleClearCache() {
		setIsClearingCache(true);
		try {
			await dal.clearCache();
		} finally {
			setIsClearingCache(false);
		}
	}

	async function handleLogout() {
		if (!onLogout) return;
		setIsLoggingOut(true);
		try {
			await onLogout();
		} finally {
			setIsLoggingOut(false);
		}
	}

	return (
		<MenuDialog title="Maintenance" onClose={closeMenu}>
			<SettingButtonRow
				title="Clear cache"
				subtitle="Removes feed data and media previews. Session stays."
				buttonText={isClearingCache ? "Clearing..." : "Clear"}
				onClick={handleClearCache}
				disabled={isClearingCache}
			/>
			<Spacer />
			{onLogout && (
				<SettingButtonRow
					title="Logout"
					subtitle="Disconnects from Telegram and clears the session."
					buttonText={isLoggingOut ? "Logging out..." : "Logout"}
					onClick={handleLogout}
					disabled={isLoggingOut}
					danger
				/>
			)}
			<Spacer />
		</MenuDialog>
	);
}
