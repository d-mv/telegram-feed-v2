import type {
	AvatarVisibilitySettings,
	FeedFilterSettings,
	NotificationSettings,
} from "../../types";

export function isNotificationSettings(
	value: unknown,
): value is NotificationSettings {
	if (!value || typeof value !== "object") {
		return false;
	}
	return Object.values(value).every((entry) => typeof entry === "boolean");
}

export function isFeedFilterSettings(
	value: unknown,
): value is FeedFilterSettings {
	if (!value || typeof value !== "object") {
		return false;
	}
	return Object.values(value).every((entry) => typeof entry === "boolean");
}

export function isAvatarVisibilitySettings(
	value: unknown,
): value is AvatarVisibilitySettings {
	if (!value || typeof value !== "object") {
		return false;
	}
	const candidate = value as AvatarVisibilitySettings;
	return (
		typeof candidate.feed === "boolean" &&
		typeof candidate.thread === "boolean" &&
		typeof candidate.notifications === "boolean"
	);
}

export function getFallbackChatName(isPrivate: boolean) {
	if (isPrivate) return "User";

	return "Group";
}

export function formatSender(entity: unknown, fallback: string) {
	if (!entity || typeof entity !== "object") {
		return fallback;
	}
	if ("title" in entity && typeof entity.title === "string") {
		return entity.title;
	}
	if ("firstName" in entity && typeof entity.firstName === "string") {
		const lastName =
			"lastName" in entity && typeof entity.lastName === "string"
				? entity.lastName
				: "";
		return `${entity.firstName} ${lastName}`.trim();
	}
	if ("username" in entity && typeof entity.username === "string") {
		return entity.username;
	}
	return fallback;
}

export function closeVisibleNotifications() {
	if ("serviceWorker" in navigator) {
		void navigator.serviceWorker.ready
			.then((registration) => registration.getNotifications())
			.then((notifications) => {
				notifications.forEach((notification) => notification.close());
			})
			.catch(() => {});
	}
}
