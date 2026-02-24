import { useState } from "react";
import { useContextSelector } from "use-context-selector";
import { AppContext } from "../app/AppContext";
import type { Dal } from "../dal/types";
import { RadialMenu } from "./components/RadialMenu";
import { SettingsDialog } from "./components/SettingsDialog";

type Props = {
  isOpen: boolean;
  dal: Dal;
  channels: {
    key: string;
    label: string;
  }[];
};

export function Settings({ isOpen, dal, channels }: Props) {
  const notificationSettings = useContextSelector(AppContext, (ctx) => ctx.notificationSettings);

  const hasEnabledNotifications = useContextSelector(
    AppContext,
    (ctx) => ctx.hasEnabledNotifications,
  );

  const notificationPermission = useContextSelector(
    AppContext,
    (ctx) => ctx.notificationPermission,
  );

  const onToggleChannelNotification = useContextSelector(
    AppContext,
    (ctx) => ctx.onToggleChannelNotification,
  );

  const onRequestNotificationPermission = useContextSelector(
    AppContext,
    (ctx) => ctx.onRequestNotificationPermission,
  );

  const onDisableNotifications = useContextSelector(
    AppContext,
    (ctx) => ctx.onDisableNotifications,
  );

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  function handleToggleMenu() {
    setIsMenuOpen((prev) => !prev);
  }

  function handleOpenSettings() {
    setIsSettingsOpen(true);
    setIsMenuOpen(false);
  }

  function handleCloseSettings() {
    setIsSettingsOpen(false);
  }

  async function handleClearCache() {
    setIsClearingCache(true);
    try {
      await dal.clearCache();
    } finally {
      setIsClearingCache(false);
    }
  }
  if (isOpen) return null;

  return (
    <>
      <RadialMenu
        isOpen={isMenuOpen}
        onToggle={handleToggleMenu}
        onOpenSettings={handleOpenSettings}
      />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        onClearCache={handleClearCache}
        isClearing={isClearingCache}
        channels={channels}
        notificationSettings={notificationSettings}
        hasEnabledNotifications={hasEnabledNotifications}
        notificationPermission={notificationPermission}
        onRequestNotificationPermission={onRequestNotificationPermission}
        onToggleChannelNotification={onToggleChannelNotification}
        onDisableNotifications={onDisableNotifications}
      />
    </>
  );
}
