import { useAtomValue, useSetAtom } from "jotai/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WindowVirtualizer } from "virtua";
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
import { ScrollTopButton } from "./ScrollTopButton";

const PAGE_SIZE = 10;
const TOTAL_ITEMS = 1000;

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

export function FeedView() {
  const providedItems = useAtomValue(feedItemsAtom);
  const feedFilterSettings = useAtomValue(feedFilterSettingsAtom);
  const notificationFocus = useAtomValue(notificationFocusAtom);
  const setNotificationFocus = useSetAtom(notificationFocusAtom);
  const setChannels = useSetAtom(channelsAtom);

  const allItems = useMemo(() => getMockFeedBatch(TOTAL_ITEMS), []);

  const [items, setItems] = useState<FeedItem[]>(() => providedItems ?? allItems.slice(0, PAGE_SIZE));
  const [cursor, setCursor] = useState(PAGE_SIZE);
  const [focusedItem, setFocusedItem] = useState<FeedItem | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingPrependRef = useRef<{ height: number; adjust: boolean } | null>(null);

  const effectiveItems = providedItems ?? items;

  function prependItems(nextItems: FeedItem[], adjustScroll: boolean) {
    if (nextItems.length === 0) return;
    const prevHeight = document.documentElement.scrollHeight;
    pendingPrependRef.current = { height: prevHeight, adjust: adjustScroll };
    setItems((current) => [...nextItems, ...current]);
  }

  function appendMore() {
    if (providedItems || cursor >= allItems.length || isLoadingOlder) return;

    setIsLoadingOlder(true);
    setTimeout(() => {
      const nextCursor = cursor + PAGE_SIZE;
      const nextItems = allItems.slice(cursor, nextCursor);
      setItems((current) => [...current, ...nextItems]);
      setCursor(nextCursor);
      setIsLoadingOlder(false);
    }, 400);
  }

  function updateChannels() {
    const entries = new Map<string, { key: string; label: string }>();
    for (const item of effectiveItems) {
      const key = getItemChannelKey(item);
      if (!entries.has(key)) {
        entries.set(key, { key, label: item.chatName });
      }
    }
    setChannels(() => [...entries.values()].sort((a, b) => a.label.localeCompare(b.label)));
  }

  useEffect(() => {
    updateChannels();
  }, [effectiveItems]);

  useLayoutEffect(() => {
    if (!pendingPrependRef.current) return;
    const { height, adjust } = pendingPrependRef.current;
    pendingPrependRef.current = null;
    if (adjust) {
      const delta = document.documentElement.scrollHeight - height;
      if (delta > 0) window.scrollBy({ top: delta, behavior: "auto" });
    }
  }, [effectiveItems]);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (providedItems) return;
    const target = bottomSentinelRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) appendMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [cursor, providedItems, isLoadingOlder]);

  useEffect(() => {
    if (providedItems) return;
    const interval = window.setInterval(() => {
      const nextItem = getMockLiveItem();
      prependItems([nextItem], window.scrollY > 80);
    }, 12000);
    return () => window.clearInterval(interval);
  }, [providedItems]);

  useEffect(() => {
    if (focusedItem) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [focusedItem]);

  useEffect(() => {
    if (!notificationFocus) return;
    const targetItem =
      (notificationFocus.itemId
        ? effectiveItems.find((item) => item.id === notificationFocus.itemId)
        : undefined) ??
      (notificationFocus.channelKey
        ? effectiveItems.find((item) => getItemChannelKey(item) === notificationFocus.channelKey)
        : undefined);

    if (!targetItem) return;

    if (notificationFocus.view === "thread") {
      setFocusedItem(targetItem);
      setNotificationFocus(null);
      return;
    }

    const targetChannelKey = getItemChannelKey(targetItem);
    if (focusedItem && getItemChannelKey(focusedItem) === targetChannelKey) {
      setFocusedItem(targetItem);
      setNotificationFocus(null);
      return;
    }

    setFocusedItem(null);
    window.setTimeout(() => {
      const node = document.querySelector(`[data-feed-item-id="${targetItem.id.replaceAll('"', '\\"')}"]`) as HTMLElement | null;
      if (node) {
        node.scrollIntoView({ block: "center" });
        node.focus({ preventScroll: true });
      }
    }, 0);
    setNotificationFocus(null);
  }, [effectiveItems, notificationFocus, setNotificationFocus]);

  const visibleItems = useMemo(
    () => effectiveItems.filter((item) => feedFilterSettings[getItemChannelKey(item)] !== false),
    [feedFilterSettings, effectiveItems],
  );

  const visibleItemGroups = useMemo(
    () => groupConsecutiveMediaOnlyItems(visibleItems),
    [visibleItems],
  );

  return (
    <>
      <FeedHeader />
      <section style={{ width: "100%", maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>
        <WindowVirtualizer>
          {visibleItemGroups.map((group) => (
            <FeedCard
              key={group[0].id}
              item={group[0]}
              groupedItems={group.length > 1 ? group : undefined}
              onFocus={setFocusedItem}
            />
          ))}
        </WindowVirtualizer>
        <div ref={bottomSentinelRef} style={{ height: 40, display: "flex", alignItems: "center", justifyItems: "center" }}>
          {isLoadingOlder && (
            <p style={{ textAlign: "center", opacity: 0.5, width: "100%" }} aria-live="polite">
              Loading older...
            </p>
          )}
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
    </>
  );
}
