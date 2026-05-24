import { atom } from "jotai";
import type { NotificationSettings } from "../types";

export const notificationSettingsAtom = atom<NotificationSettings>({});

export const notificationPermissionAtom = atom<
	NotificationPermission | "unsupported"
>(
	typeof Notification === "undefined" ? "unsupported" : Notification.permission,
);

export const hasEnabledChannels = (settings: NotificationSettings) =>
	Object.values(settings).some((entry) => entry === true);
