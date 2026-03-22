import { useSetAtom } from "jotai/react";
import { useContext, useEffect, useState } from "react";
import { closeMenuAtom } from "../../../atoms/menu.atom";
import { notificationFocusAtom } from "../../../atoms/notificationFocus.atom";
import { feedItemsAtom } from "../../../atoms/feedItems.atom";
import { pushToastAtom } from "../../../atoms/toasts.atom";
import { resolveTelegramFeedItem } from "../../app/resolveTelegramFeedItem";
import { AppContext } from "../../app/AppContext";
import { searchTelegram } from "../../search/infra/telegramSearch";
import type { SearchResult } from "../../search/model/searchTypes";
import { MenuDialog } from "./MenuDialog";

function getResultKindLabel(result: SearchResult) {
  switch (result.kind) {
    case "direct":
      return "Direct";
    case "group":
      return "Group";
    case "channel":
      return "Channel";
    case "message":
      return "Message";
  }
}

function getResultDescription(result: SearchResult) {
  if (result.kind === "message") {
    return result.text || "Open matching message";
  }
  if (result.username) {
    return `@${result.username}`;
  }
  return result.channelKey;
}

export default function SearchDialog() {
  const closeMenu = useSetAtom(closeMenuAtom);
  const setFeedItems = useSetAtom(feedItemsAtom);
  const setNotificationFocus = useSetAtom(notificationFocusAtom);
  const pushToast = useSetAtom(pushToastAtom);
  const { ensureTelegramConnected } = useContext(AppContext);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") {
      setResults([]);
      setError("");
      setIsLoading(false);
      return;
    }

    let isActive = true;
    setIsLoading(true);
    setError("");

    searchTelegram(trimmed, ensureTelegramConnected)
      .then((nextResults) => {
        if (isActive) {
          setResults(nextResults);
        }
      })
      .catch(() => {
        if (isActive) {
          setResults([]);
          setError("Search failed.");
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [ensureTelegramConnected, query]);

  async function handleSelect(result: SearchResult) {
    try {
      const item = await resolveTelegramFeedItem(
        result.entity,
        ensureTelegramConnected,
        result.kind === "message" ? result.messageId : undefined,
      );
      setFeedItems((currentItems) =>
        currentItems.some((entry) => entry.id === item.id) ? currentItems : [item, ...currentItems],
      );
      setNotificationFocus({
        channelKey: item.channelKey,
        itemId: item.id,
        view: "thread",
      });
      closeMenu();
    } catch {
      pushToast("Unsupported link.");
    }
  }

  return (
    <MenuDialog title="Search" onClose={closeMenu}>
      <label htmlFor="menu-search-query">Search Telegram</label>
      <input
        id="menu-search-query"
        type="search"
        name="query"
        placeholder="Search channels and messages"
        autoComplete="off"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {isLoading && <p aria-live="polite">Searching…</p>}
      {error && <p>{error}</p>}
      {!isLoading && !error && query.trim() !== "" && results.length === 0 && (
        <p>No results.</p>
      )}
      {query.trim() === "" && <p>Search results will appear here.</p>}
      {results.length > 0 && (
        <div role="list" aria-label="Search results">
          {results.map((result) => (
            <div key={`${result.kind}:${result.id}`} role="listitem">
              <button
                type="button"
                aria-label={`Open ${result.title}`}
                onClick={() => {
                  void handleSelect(result);
                }}
              >
                <strong>{result.title}</strong>
                <span>{getResultKindLabel(result)}</span>
                <span>{getResultDescription(result)}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </MenuDialog>
  );
}
