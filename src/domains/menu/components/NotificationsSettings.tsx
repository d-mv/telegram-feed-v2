import { useAtomValue, useSetAtom } from "jotai/react";
import { useContext } from "react";
import { closeMenuAtom } from "../../../atoms/menu.atom";
import {
  hasEnabledChannels,
  notificationPermissionAtom,
  notificationSettingsAtom,
} from "../../../atoms/notifications.atom";
import { Spacer } from "../../../shared/ui/Spacer/Spacer";
import { AppContext } from "../../app/AppContext";
import { ChannelNotifications } from "./ChannelNotifications";
import { MenuDialog } from "./MenuDialog";
import { SettingButtonRow } from "./SettingButtonRow";

export default function NotificationsSettings() {
  const closeMenu = useSetAtom(closeMenuAtom);
  const notificationPermission = useAtomValue(notificationPermissionAtom);
  const notificationSettings = useAtomValue(notificationSettingsAtom);
  const hasEnabledNotifications = hasEnabledChannels(notificationSettings);
  const { onDisableNotifications, onRequestNotificationPermission } = useContext(AppContext);

  return (
    <MenuDialog title="Notifications" onClose={closeMenu}>
      <SettingButtonRow
        title="Permission"
        subtitle={
          notificationPermission === "unsupported" ? "Not supported" : notificationPermission
        }
        variant={
          notificationPermission === "granted" && hasEnabledNotifications ? "primary" : "default"
        }
        buttonText={
          notificationPermission === "granted"
            ? hasEnabledNotifications
              ? "Disable"
              : "Enabled"
            : notificationPermission === "unsupported"
              ? "Unavailable"
              : "Enable"
        }
        onClick={
          notificationPermission === "granted" && hasEnabledNotifications
            ? onDisableNotifications
            : onRequestNotificationPermission
        }
        disabled={notificationPermission === "unsupported"}
      />
      <Spacer />
      <ChannelNotifications />
    </MenuDialog>
  );
}
