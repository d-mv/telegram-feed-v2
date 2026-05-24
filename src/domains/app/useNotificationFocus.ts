import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import {
	notificationFocusAtom,
	type NotificationFocusTarget,
} from "../../atoms/notificationFocus.atom";
import { pushToastAtom } from "../../atoms/toasts.atom";
import { APP_OPEN_TARGET_EVENT } from "./openTarget";
import {
	parseTelegramRoute as parseTelegramUrl,
	resolveTelegramFeedItem,
} from "./resolveTelegramFeedItem";

function parseFocusTarget(value: unknown): NotificationFocusTarget | null {
	if (!value || typeof value !== "object") {
		return null;
	}
	const target = value as {
		itemId?: unknown;
		channelKey?: unknown;
		view?: unknown;
	};
	const itemId = typeof target.itemId === "string" ? target.itemId : undefined;
	const channelKey =
		typeof target.channelKey === "string" ? target.channelKey : undefined;
	const view =
		target.view === "thread" || target.view === "feed"
			? target.view
			: undefined;
	if (!itemId && !channelKey) {
		return null;
	}
	return { itemId, channelKey, view };
}

function normalizePath(pathname: string): string {
	if (pathname === "/" || pathname === "") {
		return "/";
	}
	return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function clearLocation() {
	window.history.replaceState({}, "", "/");
}

type TelegramRoute = {
	kind: "telegram";
	url: string;
};

function parseTelegramRoute(url: string): TelegramRoute | "unsupported" {
	const parsed = parseTelegramUrl(url);
	if (parsed === "unsupported") {
		return "unsupported";
	}
	return { kind: "telegram", url: parsed.url };
}

function parseInboundLocation(
	location: Pick<Location, "pathname" | "search">,
): NotificationFocusTarget | TelegramRoute | "unsupported" | null {
	const params = new URLSearchParams(location.search);
	const focusItemId = params.get("focusItemId") ?? undefined;
	const focusChannelKey = params.get("focusChannelKey") ?? undefined;
	if (focusItemId || focusChannelKey) {
		return {
			itemId: focusItemId,
			channelKey: focusChannelKey,
			view: "feed",
		};
	}

	const pathname = normalizePath(location.pathname);
	if (pathname === "/open") {
		const channelKey = params.get("channel") ?? undefined;
		if (!channelKey) {
			return "unsupported";
		}
		return { channelKey, view: "thread" };
	}
	if (pathname === "/thread") {
		const itemId = params.get("itemId") ?? undefined;
		const channelKey = params.get("channel") ?? undefined;
		if (!itemId && !channelKey) {
			return "unsupported";
		}
		return { itemId, channelKey, view: "thread" };
	}

	const incomingUrl = params.get("url");
	if (!incomingUrl) {
		return null;
	}

	try {
		const parsed = new URL(incomingUrl);
		if (
			parsed.protocol === "tg:" ||
			parsed.hostname === "t.me" ||
			parsed.hostname === "telegram.me"
		) {
			return parseTelegramRoute(incomingUrl);
		}
	} catch {
		return "unsupported";
	}

	return "unsupported";
}

export function useNotificationFocus() {
	const authClient = useAtomValue(authClientAtom);
	const isAuthenticated = useAtomValue(isAuthenticatedAtom);
	const setFeedItems = useSetAtom(feedItemsAtom);
	const setNotificationFocus = useSetAtom(notificationFocusAtom);
	const pushToast = useSetAtom(pushToastAtom);

	useEffect(() => {
		let isActive = true;
		const target = parseInboundLocation(window.location);
		if (!target) {
			return;
		}

		clearLocation();

		if (!isAuthenticated) {
			pushToast("Open links after logging in.");
			return;
		}

		if (target === "unsupported") {
			pushToast("Unsupported link.");
			return;
		}

		if ("kind" in target && target.kind === "telegram") {
			if (!authClient) {
				pushToast("Unsupported link.");
				return;
			}
			void resolveTelegramFeedItem(
				target.url,
				authClient.ensureTelegramConnected,
			)
				.then((item) => {
					if (!isActive) {
						return;
					}
					setFeedItems((currentItems) =>
						currentItems.some((entry) => entry.id === item.id)
							? currentItems
							: [item, ...currentItems],
					);
					setNotificationFocus({
						channelKey: item.channelKey,
						itemId: item.id,
						view: "thread",
					});
				})
				.catch(() => {
					if (isActive) {
						pushToast("Unsupported link.");
					}
				});
			return () => {
				isActive = false;
			};
		}

		setNotificationFocus(target as NotificationFocusTarget);
		return () => {
			isActive = false;
		};
	}, [
		authClient,
		isAuthenticated,
		pushToast,
		setFeedItems,
		setNotificationFocus,
	]);

	useEffect(() => {
		let isActive = true;

		function handleOpenTarget(event: Event) {
			const detail = (event as CustomEvent<string>).detail;
			if (typeof detail !== "string" || detail === "") {
				return;
			}

			let target:
				| NotificationFocusTarget
				| TelegramRoute
				| "unsupported"
				| null;
			try {
				const parsed = detail.startsWith("/")
					? new URL(detail, window.location.origin)
					: new URL(detail);
				target = parseInboundLocation(parsed);
			} catch {
				pushToast("Unsupported link.");
				return;
			}

			if (!target || target === "unsupported") {
				pushToast("Unsupported link.");
				return;
			}
			if (!isAuthenticated) {
				pushToast("Open links after logging in.");
				return;
			}
			if ("kind" in target && target.kind === "telegram") {
				if (!authClient) {
					pushToast("Unsupported link.");
					return;
				}
				void resolveTelegramFeedItem(
					target.url,
					authClient.ensureTelegramConnected,
				)
					.then((item) => {
						if (!isActive) {
							return;
						}
						setFeedItems((currentItems) =>
							currentItems.some((entry) => entry.id === item.id)
								? currentItems
								: [item, ...currentItems],
						);
						setNotificationFocus({
							channelKey: item.channelKey,
							itemId: item.id,
							view: "thread",
						});
					})
					.catch(() => {
						if (isActive) {
							pushToast("Unsupported link.");
						}
					});
				return;
			}

			setNotificationFocus(target as NotificationFocusTarget);
		}

		window.addEventListener(
			APP_OPEN_TARGET_EVENT,
			handleOpenTarget as EventListener,
		);
		return () => {
			isActive = false;
			window.removeEventListener(
				APP_OPEN_TARGET_EVENT,
				handleOpenTarget as EventListener,
			);
		};
	}, [
		authClient,
		isAuthenticated,
		pushToast,
		setFeedItems,
		setNotificationFocus,
	]);

	useEffect(() => {
		if (!("serviceWorker" in navigator)) {
			return;
		}
		const handleMessage = (event: MessageEvent) => {
			const data = event.data as
				| { type?: unknown; payload?: unknown }
				| undefined;
			if (data?.type !== "NOTIFICATION_FOCUS") {
				return;
			}
			const target = parseFocusTarget(data.payload);
			if (target) {
				setNotificationFocus(target);
			}
		};
		navigator.serviceWorker.addEventListener("message", handleMessage);
		return () => {
			navigator.serviceWorker.removeEventListener("message", handleMessage);
		};
	}, [setNotificationFocus]);

	useEffect(() => {
		if (!("registerProtocolHandler" in navigator)) {
			return;
		}
		try {
			navigator.registerProtocolHandler("web+tgfeed", "/?url=%s");
		} catch {
			// ignore unsupported protocol registration
		}
	}, []);
}
