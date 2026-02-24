import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useContextSelector } from "use-context-selector";
import { AppContext } from "../../app/AppContext";
import { createIndexedDbDal } from "../../dal/indexedDbDal";
import { Settings } from "../../settings/Settings";
import type { FeedItem } from "../model/mockFeed";
import { getMockFeedBatch, getMockLiveItem } from "../model/mockFeed";
import { Chat } from "./Chat";
import { FeedHeader } from "./FeedHeader";
import { FeedList } from "./FeedList";
import styles from "./FeedView.module.css";
import { ScrollTopButton } from "./ScrollTopButton";

const PAGE_SIZE = 10;
const TOTAL_ITEMS = 60;

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
  const providedItems = useContextSelector(AppContext, (c) => c.items);
  const allItems = useMemo(() => getMockFeedBatch(TOTAL_ITEMS), []);
  const dal = useMemo(() => createIndexedDbDal(), []);
  const initialStart = Math.max(0, allItems.length - PAGE_SIZE);
  const [items, setItems] = useState<FeedItem[]>(
    () => providedItems ?? allItems.slice(initialStart),
  );
  const [cursor, setCursor] = useState(providedItems ? 0 : initialStart);
  const [focusedItem, setFocusedItem] = useState<FeedItem | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const topSentinelRef = useRef<HTMLDivElement | null>(null);
  const pendingPrependRef = useRef<{ height: number; adjust: boolean } | null>(null);

  useEffect(() => {
    if (!providedItems) {
      return;
    }
    setItems(providedItems);
  }, [providedItems]);

  function prependItems(nextItems: FeedItem[], adjustScroll: boolean) {
    if (nextItems.length === 0) {
      return;
    }
    const prevHeight = document.documentElement.scrollHeight;
    pendingPrependRef.current = { height: prevHeight, adjust: adjustScroll };
    setItems((current) => [...nextItems, ...current]);
  }

  function prependMore() {
    if (cursor <= 0) {
      return;
    }
    const nextCursor = Math.max(0, cursor - PAGE_SIZE);
    setIsLoadingOlder(true);
    prependItems(allItems.slice(nextCursor, cursor), true);
    setCursor(nextCursor);
  }

  useLayoutEffect(() => {
    if (!pendingPrependRef.current) {
      return;
    }
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
    if (providedItems) {
      return;
    }
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
    if (providedItems) {
      return;
    }
    const interval = window.setInterval(() => {
      const shouldKeepScroll = window.scrollY > 80;
      const nextItem = getMockLiveItem();
      prependItems([nextItem], shouldKeepScroll);
    }, 12000);

    return () => window.clearInterval(interval);
  }, [providedItems]);

  const body = document.body;

  const channels = useMemo(() => {
    const entries = new Map<string, { key: string; label: string }>();
    for (const item of items) {
      const key = `${item.type}:${item.chatName}`;
      if (!entries.has(key)) {
        entries.set(key, {
          key,
          label: item.chatName,
        });
      }
    }
    return [...entries.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  useEffect(() => {
    if (focusedItem) {
      setCursor(items.findIndex((item) => item.id === focusedItem.id));
      body.style.overflow = "hidden";
    } else {
      body.style.overflow = "unset";
    }
  }, [focusedItem, items]);

  return (
    <section className={styles.feedShell}>
      <FeedHeader />
      <FeedList
        items={items}
        isLoadingOlder={isLoadingOlder}
        topSentinelRef={topSentinelRef}
        onFocus={setFocusedItem}
      />
      {focusedItem && <Chat item={focusedItem} onClose={() => setFocusedItem(null)} />}
      {showScrollTop && (
        <ScrollTopButton onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
      )}
      <Settings isOpen={Boolean(focusedItem)} dal={dal} channels={channels} />
    </section>
  );
}
