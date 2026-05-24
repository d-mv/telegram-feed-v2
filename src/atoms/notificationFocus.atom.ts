import { atom } from "jotai";

export type NotificationFocusTarget = {
	itemId?: string;
	channelKey?: string;
	view?: "feed" | "thread";
};

export const notificationFocusAtom = atom<NotificationFocusTarget | null>(null);
