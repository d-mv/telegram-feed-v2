import { useSetAtom } from "jotai";
import { useEffect } from "react";
import { notificationFocusAtom, type NotificationFocusTarget } from "../../atoms/notificationFocus.atom";

function parseFocusTarget(value: unknown): NotificationFocusTarget | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const target = value as { itemId?: unknown; channelKey?: unknown };
  const itemId = typeof target.itemId === "string" ? target.itemId : undefined;
  const channelKey = typeof target.channelKey === "string" ? target.channelKey : undefined;
  if (!itemId && !channelKey) {
    return null;
  }
  return { itemId, channelKey };
}

export function useNotificationFocus() {
  const setNotificationFocus = useSetAtom(notificationFocusAtom);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const itemId = params.get("focusItemId") ?? undefined;
    const channelKey = params.get("focusChannelKey") ?? undefined;
    if (!itemId && !channelKey) {
      return;
    }
    setNotificationFocus({ itemId, channelKey });
    params.delete("focusItemId");
    params.delete("focusChannelKey");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }, [setNotificationFocus]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as { type?: unknown; payload?: unknown } | undefined;
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
}
