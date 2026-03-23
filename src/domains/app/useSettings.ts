import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedFilterSettingsAtom } from "../../atoms/feedFilters.atom";
import {
  hasEnabledChannels,
  notificationPermissionAtom,
  notificationSettingsAtom,
} from "../../atoms/notifications.atom";
import type {
  AvatarVisibilitySettings,
  FeedFilterSettings,
  NotificationSettings,
} from "../../types";
import type { Dal } from "../dal/types";
import {
  closeVisibleNotifications,
  isAvatarVisibilitySettings,
  isFeedFilterSettings,
  isNotificationSettings,
} from "./utils";
import { runtimeLogger } from "../../shared/infra/runtimeLogger";

export function useSettings({ dal }: { dal: Dal }) {
  const [feedFilterSettings, setFeedFilterSettings] = useAtom(feedFilterSettingsAtom);
  const [notificationSettings, setNotificationSettings] = useAtom(notificationSettingsAtom);
  const setAvatarVisibility = useSetAtom(avatarVisibilityAtom);
  const [notificationPermission, setNotificationPermission] = useAtom(notificationPermissionAtom);

  const getNotificationSettings = useCallback(async () => {
    try {
      const stored = await dal.getNotificationSettings();

      if (isNotificationSettings(stored)) {
        setNotificationSettings(stored);
      }
    } catch (e) {
      runtimeLogger.warn("settings_load_failed", {
        scope: "notifications",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [dal]);

  const getFeedFilterSettings = useCallback(async () => {
    try {
      const stored = await dal.getFeedFilterSettings();
      if (isFeedFilterSettings(stored)) {
        setFeedFilterSettings(stored);
      }
    } catch (e) {
      runtimeLogger.warn("settings_load_failed", {
        scope: "feed_filters",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [dal, setFeedFilterSettings]);

  const getAvatarVisibilitySettings = useCallback(async () => {
    try {
      const stored = await dal.getAvatarVisibilitySettings();
      if (isAvatarVisibilitySettings(stored)) {
        setAvatarVisibility(stored);
      }
    } catch (e) {
      runtimeLogger.warn("settings_load_failed", {
        scope: "avatar_visibility",
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [dal, setAvatarVisibility]);

  useEffect(() => {
    getNotificationSettings();
    getFeedFilterSettings();
    getAvatarVisibilitySettings();
  }, [dal, getAvatarVisibilitySettings, getFeedFilterSettings, getNotificationSettings]);

  function handleSetAvatarVisibility(next: AvatarVisibilitySettings) {
    setAvatarVisibility(next);
    dal.setAvatarVisibilitySettings(next).catch(() => {});
  }

  function handleEnableAllFeedFilters() {
    const nextSettings: FeedFilterSettings = {};
    setFeedFilterSettings(nextSettings);
    dal.setFeedFilterSettings(nextSettings).catch(() => {});
  }

  function handleToggleChannelFilter(channelKey: string, enabled: boolean) {
    const nextSettings = { ...feedFilterSettings };
    if (enabled) {
      delete nextSettings[channelKey];
    } else {
      nextSettings[channelKey] = false;
    }
    setFeedFilterSettings(nextSettings);
    dal.setFeedFilterSettings(nextSettings).catch(() => {});
  }

  function handleDisableNotifications() {
    const nextSettings: NotificationSettings = {};
    setNotificationSettings(nextSettings);
    dal.setNotificationSettings(nextSettings).catch(() => {});
    closeVisibleNotifications();
  }

  function handleToggleChannelNotification(channelKey: string, enabled: boolean) {
    const nextSettings = {
      ...notificationSettings,
      [channelKey]: enabled,
    };
    setNotificationSettings(nextSettings);
    dal.setNotificationSettings(nextSettings).catch(() => {});

    const notificationsOn = hasEnabledChannels(nextSettings);

    if (notificationsOn) {
      if (notificationPermission !== "granted") {
        void handleRequestNotificationPermission();
      }
      return;
    }

    closeVisibleNotifications();
  }

  function handleClearChannelState(channelKey: string) {
    const nextNotificationSettings = { ...notificationSettings };
    delete nextNotificationSettings[channelKey];
    setNotificationSettings(nextNotificationSettings);
    dal.setNotificationSettings(nextNotificationSettings).catch(() => {});

    const nextFeedFilterSettings = { ...feedFilterSettings };
    delete nextFeedFilterSettings[channelKey];
    setFeedFilterSettings(nextFeedFilterSettings);
    dal.setFeedFilterSettings(nextFeedFilterSettings).catch(() => {});

    if (!hasEnabledChannels(nextNotificationSettings)) {
      closeVisibleNotifications();
    }
  }

  async function handleRequestNotificationPermission() {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported");
      return;
    }
    const nextPermission = await Notification.requestPermission();
    setNotificationPermission(nextPermission);
  }

  return {
    handleDisableNotifications,
    handleEnableAllFeedFilters,
    handleRequestNotificationPermission,
    handleSetAvatarVisibility,
    handleClearChannelState,
    handleToggleChannelFilter,
    handleToggleChannelNotification,
  };
}
