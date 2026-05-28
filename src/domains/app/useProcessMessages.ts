import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { Api } from "telegram";
import { NewMessage } from "telegram/events";
import { EditedMessage } from "telegram/events/EditedMessage";
import { authClientAtom, isAuthenticatedAtom } from "../../atoms/auth.atom";
import { avatarVisibilityAtom } from "../../atoms/avatarVisibility.atom";
import { feedItemsAtom } from "../../atoms/feedItems.atom";
import { notificationFocusAtom } from "../../atoms/notificationFocus.atom";
import {
	notificationPermissionAtom,
	notificationSettingsAtom,
} from "../../atoms/notifications.atom";
import { getAvatarDataUrl } from "../../shared/ui/Avatar/utils";
import type { FeedItem } from "../../types";
import {
	buildFeedItem,
	getAvatarPhotoUrl,
	mergeAlbumFeedItems,
} from "../feed/infra/telegramFeed";
import { formatSender, getFallbackChatName } from "./utils";
import type { Dal } from "../dal/types";
import { toCachedFeedItems } from "../feed/infra/feedCache";

export function useProcessMessages({ dal }: { dal: Dal }) {
	const notificationPermission = useAtomValue(notificationPermissionAtom);
	const isAuthenticated = useAtomValue(isAuthenticatedAtom);
	const authClient = useAtomValue(authClientAtom);
	const notificationSettings = useAtomValue(notificationSettingsAtom);
	const avatarVisibility = useAtomValue(avatarVisibilityAtom);
	const setFeedItems = useSetAtom(feedItemsAtom);
	const setNotificationFocus = useSetAtom(notificationFocusAtom);

	const clientRef = useRef<Awaited<
		ReturnType<NonNullable<typeof authClient>["ensureTelegramConnected"]>
	> | null>(null);
	const handlerRef = useRef<
		((event: { message?: Api.Message }) => void) | null
	>(null);
	const eventBuilderRef = useRef<NewMessage | null>(null);
	const editHandlerRef = useRef<
		((event: { message?: Api.Message }) => void) | null
	>(null);
	const editEventBuilderRef = useRef<EditedMessage | null>(null);

	// Keep mutable values in refs so the handler closure always reads the latest
	// without re-registering the event handler on every change.
	const notificationSettingsRef = useRef(notificationSettings);
	const notificationPermissionRef = useRef(notificationPermission);
	const avatarVisibilityRef = useRef(avatarVisibility);

	useEffect(() => {
		notificationSettingsRef.current = notificationSettings;
	}, [notificationSettings]);

	useEffect(() => {
		notificationPermissionRef.current = notificationPermission;
	}, [notificationPermission]);

	useEffect(() => {
		avatarVisibilityRef.current = avatarVisibility;
	}, [avatarVisibility]);

	useEffect(() => {
		if (!isAuthenticated || !authClient) return;
		let isActive = true;

		void authClient
			.ensureTelegramConnected()
			.then(async (client) => {
				clientRef.current = client;
				const me = await client.getMe();
				const meId = me?.id?.toString();
				if (!isActive) {
					return;
				}

				const handler = async (event: { message?: Api.Message }) => {
					if (!isActive) return;

					const message = event.message;
					if (!message || !(message instanceof Api.Message)) return;
					if (message.out) return;
					if (meId && message.senderId?.toString() === meId) return;

					const chatEntity = await message.getChat();
					const chatId = message.chatId?.toString() ?? "chat";
					const isPrivate = Boolean(message.isPrivate);
					const fallbackChatName = getFallbackChatName(isPrivate);
					const chatName = formatSender(chatEntity, fallbackChatName);
					const senderEntity = await message.getSender();
					const senderName = formatSender(senderEntity, chatName);
					const idPrefix = isPrivate ? "dm" : "group";
					const channelKey = `${idPrefix}:${chatId}`;
					const legacyChannelKey = `${isPrivate ? "dm" : "group"}:${chatName}`;
					const itemId = `${idPrefix}-${chatId}-${message.id ?? message.date}`;

					const nextItem: FeedItem = buildFeedItem(
						{ itemId, channelKey, isPrivate, chatName, senderName },
						message,
					);

					let isDuplicate = false;
					let nextFeedItems: FeedItem[] | null = null;
					setFeedItems((currentFeedItems) => {
						isDuplicate = currentFeedItems.some((entry) => entry.id === itemId);
						if (isDuplicate) {
							return currentFeedItems;
						}
						nextFeedItems = mergeAlbumFeedItems([
							nextItem,
							...currentFeedItems,
						]);
						return nextFeedItems;
					});

					if (isDuplicate) {
						return;
					}

					if (nextFeedItems) {
						await dal.setFeedCache(toCachedFeedItems(nextFeedItems));
					}

					const notificationsEnabled =
						notificationSettingsRef.current[channelKey] === true ||
						notificationSettingsRef.current[legacyChannelKey] === true;
					const canNotify =
						typeof Notification !== "undefined" &&
						notificationPermissionRef.current === "granted";

					if (notificationsEnabled && canNotify) {
						const body = message.message ?? "";
						const notificationAvatar = avatarVisibilityRef.current.notifications
							? await getAvatarPhotoUrl(
									senderEntity,
									message.senderId?.toString() || `notify:${channelKey}`,
									authClient.ensureTelegramConnected,
								)
							: undefined;
						const payload = {
							body: body === "" ? "New message" : body,
							tag: channelKey,
							data: {
								itemId,
								channelKey,
							},
							icon:
								notificationAvatar ??
								(avatarVisibility.notifications
									? getAvatarDataUrl(senderName)
									: "/favicon-192.png"),
						};
						try {
							let shown = false;
							if ("serviceWorker" in navigator) {
								try {
									const registration =
										await navigator.serviceWorker.getRegistration();
									if (registration && "showNotification" in registration) {
										await registration.showNotification(chatName, {
											...payload,
											badge: "/favicon-96.png",
										});
										shown = true;
									}
								} catch {
									shown = false;
								}
							}
							if (!shown) {
								const notification = new Notification(chatName, payload);
								notification.onclick = () => {
									window.focus();
									setNotificationFocus({ itemId, channelKey });
									notification.close();
								};
							}
						} catch {
							// ignore notification errors
						}
					}
				};

				const eventBuilder = new NewMessage({ incoming: true });
				handlerRef.current = handler;
				eventBuilderRef.current = eventBuilder;
				client.addEventHandler(handler, eventBuilder);

				const editHandler = async (event: { message?: Api.Message }) => {
					if (!isActive) return;
					const message = event.message;
					if (!message || !(message instanceof Api.Message)) return;

					const chatId = message.chatId?.toString() ?? "chat";
					const isPrivate = Boolean(message.isPrivate);
					const idPrefix = isPrivate ? "dm" : "group";
					const itemId = `${idPrefix}-${chatId}-${message.id}`;

					setFeedItems((currentItems) =>
						currentItems.map((item) =>
							item.id === itemId
								? { ...item, text: message.message ?? item.text }
								: item,
						),
					);
				};

				const editEventBuilder = new EditedMessage({ incoming: true });
				editHandlerRef.current = editHandler;
				editEventBuilderRef.current = editEventBuilder;
				client.addEventHandler(editHandler, editEventBuilder);
			})
			.catch(() => {});

		return () => {
			isActive = false;
			const client = clientRef.current;
			const handler = handlerRef.current;
			const eventBuilder = eventBuilderRef.current;
			if (client && handler && eventBuilder) {
				client.removeEventHandler(handler, eventBuilder);
			}
			handlerRef.current = null;
			eventBuilderRef.current = null;

			const editHandler = editHandlerRef.current;
			const editEventBuilder = editEventBuilderRef.current;
			if (client && editHandler && editEventBuilder) {
				client.removeEventHandler(editHandler, editEventBuilder);
			}
			editHandlerRef.current = null;
			editEventBuilderRef.current = null;
		};
	}, [authClient, dal, isAuthenticated, setNotificationFocus, setFeedItems]);
}
