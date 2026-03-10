import { useAtomValue, useSetAtom } from "jotai/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { channelsAtom } from "../../../atoms/channels.atom";
import { feedFilterSettingsAtom } from "../../../atoms/feedFilters.atom";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { notificationFocusAtom } from "../../../atoms/notificationFocus.atom";
import type { FeedItem } from "../../../types";
import { getMockFeedBatch, getMockLiveItem } from "../model/mockFeed";
import { Chat } from "./Chat";
import { FeedCard } from "./FeedCard";
import { FeedHeader } from "./FeedHeader";
import { groupConsecutiveMediaOnlyItems } from "./groupConsecutiveMediaOnlyItems";
import styles from "./FeedView.module.css";
import { ScrollTopButton } from "./ScrollTopButton";

const PAGE_SIZE = 10;
const TOTAL_ITEMS = 60;

function getItemChannelKey(item: FeedItem): string {
  if (item.channelKey) {
    return item.channelKey;
  }
  const [prefix, chatId] = item.id.split("-");
  if ((prefix === "dm" || prefix === "group") && chatId) {
    return `${prefix}:${chatId}`;
  }
  return `${item.type}:${item.chatName}`;
}

// type FeedViewProps = {
//   items?: FeedItem[];
//   notificationSettings: Record<string, boolean>;
//   hasEnabledNotifications: boolean;
//   notificationPermission: NotificationPermission | "unsupported";
//   onToggleChannelNotification: (channelKey: string, enabled: boolean) => void;
//   onRequestNotificationPermission: () => void;
//   onDisableNotifications: () => void;
// };

export function FeedView() {
  const providedItems = useAtomValue(feedItemsAtom);
  const feedFilterSettings = useAtomValue(feedFilterSettingsAtom);
  const notificationFocus = useAtomValue(notificationFocusAtom);
  const setNotificationFocus = useSetAtom(notificationFocusAtom);
  const setChannels = useSetAtom(channelsAtom);
  const allItems = useMemo(() => getMockFeedBatch(TOTAL_ITEMS), []);
  const initialStart = Math.max(0, allItems.length - PAGE_SIZE);
  const [items, setItems] = useState<FeedItem[]>(
    () => (providedItems ?? allItems.slice(initialStart)),
  );
  const [cursor, setCursor] = useState(providedItems ? 0 : initialStart);
  const [focusedItem, setFocusedItem] = useState<FeedItem | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingPrependRef = useRef<{ height: number; adjust: boolean } | null>(null);

  useEffect(() => {
    if (!providedItems) return;

    setItems(providedItems);
  }, [providedItems]);

  function prependItems(nextItems: FeedItem[], adjustScroll: boolean) {
    if (nextItems.length === 0) return;

    const prevHeight = document.documentElement.scrollHeight;
    pendingPrependRef.current = { height: prevHeight, adjust: adjustScroll };
    setItems((current) => [...nextItems, ...current]);
  }

  function prependMore() {
    if (cursor <= 0) return;

    const nextCursor = Math.max(0, cursor - PAGE_SIZE);
    setIsLoadingOlder(true);
    prependItems(allItems.slice(nextCursor, cursor), true);
    setCursor(nextCursor);
  }

  function updateChannels() {
    const entries = new Map<string, { key: string; label: string }>();

    for (const item of items) {
      const parsedChannelKey = getItemChannelKey(item);
      const key = parsedChannelKey;
      if (!entries.has(key)) {
        entries.set(key, {
          key,
          label: item.chatName,
        });
      }
    }

    setChannels(() => [...entries.values()].sort((a, b) => a.label.localeCompare(b.label)));
  }

  useEffect(() => {
    updateChannels();
  }, [items]);

  useLayoutEffect(() => {
    if (!pendingPrependRef.current) return;

    const { height, adjust } = pendingPrependRef.current;
    pendingPrependRef.current = null;
    if (adjust) {
      const newHeight = document.documentElement.scrollHeight;
      const delta = newHeight - height;
      if (delta > 0) {
        window.scrollBy({ top: delta, behavior: "auto" });
      }
    }
    setIsLoadingOlder(false);
  }, [items]);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 400);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (providedItems) return;

    const target = topSentinelRef.current;
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          prependMore();
        }
      },
      { rootMargin: "120px 0px 0px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, allItems, providedItems]);

  useEffect(() => {
    if (providedItems) return;

    const interval = window.setInterval(() => {
      const shouldKeepScroll = window.scrollY > 80;
      const nextItem = getMockLiveItem();
      prependItems([nextItem], shouldKeepScroll);
    }, 12000);

    return () => window.clearInterval(interval);
  }, [providedItems]);

  const body = document.body;

  useEffect(() => {
    if (focusedItem) {
      setCursor(items.findIndex((item) => item.id === focusedItem.id));
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = "unset";
    }
  }, [focusedItem, items]);

  useEffect(() => {
    if (!notificationFocus) {
      return;
    }
    const targetItem =
      (notificationFocus.itemId
        ? items.find((item) => item.id === notificationFocus.itemId)
        : undefined) ??
      (notificationFocus.channelKey
        ? items.find((item) => getItemChannelKey(item) === notificationFocus.channelKey)
        : undefined);
    if (!targetItem) {
      return;
    }

    const targetChannelKey = getItemChannelKey(targetItem);
    if (focusedItem && getItemChannelKey(focusedItem) === targetChannelKey) {
      setFocusedItem(targetItem);
      setNotificationFocus(null);
      return;
    }

    if (focusedItem) {
      setFocusedItem(null);
    }

    window.setTimeout(() => {
      const selector = `[data-feed-item-id="${targetItem.id.replaceAll('"', '\\"')}"]`;
      const node = document.querySelector(selector) as HTMLElement | null;
      if (!node) {
        return;
      }
      node.scrollIntoView({ block: "center" });
      node.focus({ preventScroll: true });
    }, 0);
    setNotificationFocus(null);
  }, [focusedItem, items, notificationFocus, setNotificationFocus]);

  const renderItem = (item: FeedItem, groupedItems?: FeedItem[]) => (
    <FeedCard
      key={item.id}
      item={item}
      groupedItems={groupedItems}
      onFocus={setFocusedItem}
    />
  );

  const visibleItems = useMemo(
    () => items.filter((item) => feedFilterSettings[getItemChannelKey(item)] !== false),
    [feedFilterSettings, items],
  );
  const visibleItemGroups = useMemo(
    () => groupConsecutiveMediaOnlyItems(visibleItems),
    [visibleItems],
  );

  return (
    <section className={styles.feedShell}>
      <FeedHeader />
      <div className={styles.list}>
        <div ref={topSentinelRef} className={styles.sentinel} />
        {isLoadingOlder && (
          <p className={styles.loading} aria-live="polite">
            Loading older...
          </p>
        )}
        {visibleItemGroups.map((group) => renderItem(group[0], group.length > 1 ? group : undefined))}
      </div>
      {focusedItem && (
        <Chat
          item={focusedItem}
          onClose={() => setFocusedItem(null)}
        />
      )}
      {showScrollTop && (
        <ScrollTopButton onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
      )}
    </section>
  );
}
