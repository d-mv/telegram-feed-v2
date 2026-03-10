import { atom } from "jotai";

export type NotificationFocusTarget = {
  itemId?: string;
  channelKey?: string;
};

export const notificationFocusAtom = atom<NotificationFocusTarget | null>(null);
