import { useAtomValue, useSetAtom } from "jotai/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { channelsAtom } from "../../../atoms/channels.atom";
import { feedFilterSettingsAtom } from "../../../atoms/feedFilters.atom";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { markFeedItemReadThrough } from "../infra/telegramFeed";
import type { FeedItem } from "../../../types";
import { getMockFeedBatch, getMockLiveItem } from "../model/mockFeed";
import { Chat } from "./Chat";
import { FeedCard } from "./FeedCard";
import { FeedHeader } from "./FeedHeader";
import styles from "./FeedView.module.css";
import { ScrollTopButton } from "./ScrollTopButton";

const PAGE_SIZE = 10;
const TOTAL_ITEMS = 60;

function toReadableKey(item: FeedItem): string {
  const sourceId = (item.sourceMessage as { id?: unknown } | undefined)?.id;
  if (typeof sourceId === "number" || typeof sourceId === "string") {
    return String(sourceId);
  }
  return item.id;
}

function normalizeReadState(items: FeedItem[]): FeedItem[] {
  return items.map((item) => ({
    ...item,
    isRead: item.isRead === true,
  }));
}

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
  const setChannels = useSetAtom(channelsAtom);
  const allItems = useMemo(() => getMockFeedBatch(TOTAL_ITEMS), []);
  const initialStart = Math.max(0, allItems.length - PAGE_SIZE);
  const [items, setItems] = useState<FeedItem[]>(
    () => normalizeReadState(providedItems ?? allItems.slice(initialStart)),
  );
  const [cursor, setCursor] = useState(providedItems ? 0 : initialStart);
  const [focusedItem, setFocusedItem] = useState<FeedItem | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingPrependRef = useRef<{ height: number; adjust: boolean } | null>(null);

  useEffect(() => {
    if (!providedItems) return;

    setItems(normalizeReadState(providedItems));
  }, [providedItems]);

  function prependItems(nextItems: FeedItem[], adjustScroll: boolean) {
    if (nextItems.length === 0) return;

    const prevHeight = document.documentElement.scrollHeight;
    pendingPrependRef.current = { height: prevHeight, adjust: adjustScroll };
    setItems((current) => [...normalizeReadState(nextItems), ...current]);
  }

  function markReadByKeys(targetKeys: string[], scopeItem?: FeedItem) {
    if (targetKeys.length === 0) {
      return;
    }
    const scopeChannelKey = scopeItem ? getItemChannelKey(scopeItem) : null;
    setItems((current) => {
      let furthestIndex = -1;
      for (const key of targetKeys) {
        const index = current.findIndex(
          (item) =>
            (scopeChannelKey === null || getItemChannelKey(item) === scopeChannelKey) &&
            (toReadableKey(item) === key || item.id === key),
        );
        if (index > furthestIndex) {
          furthestIndex = index;
        }
      }
      if (furthestIndex < 0) {
        return current;
      }
      return current.map((item, index) => {
        if (
          index > furthestIndex ||
          item.isRead === true ||
          (scopeChannelKey !== null && getItemChannelKey(item) !== scopeChannelKey)
        ) {
          return item;
        }
        return { ...item, isRead: true };
      });
    });

    if (scopeItem) {
      void markFeedItemReadThrough(scopeItem).catch(() => {});
    }
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

  const renderItem = (item: FeedItem) => (
    <FeedCard
      key={item.id}
      item={item}
      onFocus={setFocusedItem}
      onMarkRead={(targetItem) =>
        markReadByKeys([toReadableKey(targetItem), targetItem.id], targetItem)
      }
    />
  );

  const visibleItems = useMemo(
    () => items.filter((item) => feedFilterSettings[getItemChannelKey(item)] !== false),
    [feedFilterSettings, items],
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
        {visibleItems.map(renderItem)}
      </div>
      {focusedItem && (
        <Chat
          item={focusedItem}
          onClose={() => setFocusedItem(null)}
          onMarkReadThrough={(readMessageIds) => markReadByKeys(readMessageIds, focusedItem)}
        />
      )}
      {showScrollTop && (
        <ScrollTopButton onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
      )}
    </section>
  );
}
