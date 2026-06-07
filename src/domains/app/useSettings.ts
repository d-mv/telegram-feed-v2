import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect } from "react";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedFilterSettingsAtom } from "../../atoms/feedFilters.atom";
import { fontSizeAtom } from "../../atoms/fontSize.atom";
import {
	hasEnabledChannels,
	notificationPermissionAtom,
	notificationSettingsAtom,
} from "../../atoms/notifications.atom";
import type {
	AvatarVisibilitySettings,
	FeedFilterSettings,
	FontSizeSettings,
	NotificationSettings,
} from "../../types";
import type { Dal } from "../dal/types";
import {
	closeVisibleNotifications,
	isAvatarVisibilitySettings,
	isFeedFilterSettings,
	isFontSizeSettings,
	isNotificationSettings,
} from "./utils";
import { runtimeLogger } from "../../shared/infra/runtimeLogger";

export function useSettings({ dal }: { dal: Dal }) {
	const [, setFeedFilterSettings] = useAtom(feedFilterSettingsAtom);
	const [, setNotificationSettings] = useAtom(notificationSettingsAtom);
	const setAvatarVisibility = useSetAtom(avatarVisibilityAtom);
	const setFontSize = useSetAtom(fontSizeAtom);
	const [notificationPermission, setNotificationPermission] = useAtom(
		notificationPermissionAtom,
	);

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

	const getFontSizeSettings = useCallback(async () => {
		try {
			const stored = await dal.getFontSizeSettings();
			if (isFontSizeSettings(stored)) {
				setFontSize(stored);
			}
		} catch (e) {
			runtimeLogger.warn("settings_load_failed", {
				scope: "font_size",
				error: e instanceof Error ? e.message : String(e),
			});
		}
	}, [dal, setFontSize]);

	useEffect(() => {
		getNotificationSettings();
		getFeedFilterSettings();
		getAvatarVisibilitySettings();
		getFontSizeSettings();
	}, [
		dal,
		getAvatarVisibilitySettings,
		getFeedFilterSettings,
		getFontSizeSettings,
		getNotificationSettings,
	]);

	function persistOrWarn(promise: Promise<void>, scope: string) {
		promise.catch((e) => {
			runtimeLogger.warn("settings_persist_failed", {
				scope,
				error: e instanceof Error ? e.message : String(e),
			});
		});
	}

	const handleSetAvatarVisibility = useCallback(
		(next: AvatarVisibilitySettings) => {
			setAvatarVisibility(next);
			persistOrWarn(dal.setAvatarVisibilitySettings(next), "avatar_visibility");
		},
		[dal, setAvatarVisibility],
	);

	const handleSetFontSize = useCallback(
		(next: FontSizeSettings) => {
			setFontSize(next);
			persistOrWarn(dal.setFontSizeSettings(next), "font_size");
		},
		[dal, setFontSize],
	);

	const handleEnableAllFeedFilters = useCallback(() => {
		const nextSettings: FeedFilterSettings = {};
		setFeedFilterSettings(nextSettings);
		persistOrWarn(dal.setFeedFilterSettings(nextSettings), "feed_filters");
	}, [dal, setFeedFilterSettings]);

	const handleToggleChannelFilter = useCallback(
		(channelKey: string, enabled: boolean) => {
			setFeedFilterSettings((prev) => {
				const nextSettings = { ...prev };
				if (enabled) {
					delete nextSettings[channelKey];
				} else {
					nextSettings[channelKey] = false;
				}
				persistOrWarn(dal.setFeedFilterSettings(nextSettings), "feed_filters");
				return nextSettings;
			});
		},
		[dal, setFeedFilterSettings],
	);

	const handleDisableNotifications = useCallback(() => {
		const nextSettings: NotificationSettings = {};
		setNotificationSettings(nextSettings);
		persistOrWarn(dal.setNotificationSettings(nextSettings), "notifications");
		closeVisibleNotifications();
	}, [dal, setNotificationSettings]);

	const handleRequestNotificationPermission = useCallback(async () => {
		if (typeof Notification === "undefined") {
			setNotificationPermission("unsupported");
			return;
		}
		const nextPermission = await Notification.requestPermission();
		setNotificationPermission(nextPermission);
	}, [setNotificationPermission]);

	const handleToggleChannelNotification = useCallback(
		(channelKey: string, enabled: boolean) => {
			setNotificationSettings((prev) => {
				const nextSettings = { ...prev, [channelKey]: enabled };
				persistOrWarn(
					dal.setNotificationSettings(nextSettings),
					"notifications",
				);

				const notificationsOn = hasEnabledChannels(nextSettings);
				if (notificationsOn) {
					if (notificationPermission !== "granted") {
						void handleRequestNotificationPermission();
					}
				} else {
					closeVisibleNotifications();
				}
				return nextSettings;
			});
		},
		[
			dal,
			handleRequestNotificationPermission,
			notificationPermission,
			setNotificationSettings,
		],
	);

	const handleClearChannelState = useCallback(
		(channelKey: string) => {
			setNotificationSettings((prev) => {
				const next = { ...prev };
				delete next[channelKey];
				persistOrWarn(dal.setNotificationSettings(next), "notifications");
				if (!hasEnabledChannels(next)) {
					closeVisibleNotifications();
				}
				return next;
			});
			setFeedFilterSettings((prev) => {
				const next = { ...prev };
				delete next[channelKey];
				persistOrWarn(dal.setFeedFilterSettings(next), "feed_filters");
				return next;
			});
		},
		[dal, setNotificationSettings, setFeedFilterSettings],
	);

	return {
		handleDisableNotifications,
		handleEnableAllFeedFilters,
		handleRequestNotificationPermission,
		handleSetAvatarVisibility,
		handleSetFontSize,
		handleClearChannelState,
		handleToggleChannelFilter,
		handleToggleChannelNotification,
	};
}
