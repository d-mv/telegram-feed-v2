import clsx from "clsx";
import { path } from "ramda";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Api } from "telegram";
import { CommentsIcon } from "../../../shared/ui/CommentsIcon/CommentsIcon";
import { Header } from "../../../shared/ui/Header/Header";
import { Media } from "../../../shared/ui/Media/Media";
import { Text } from "../../../shared/ui/Text/Text";
import { UnreadIcon } from "../../../shared/ui/UnreadIcon/UnreadIcon";
import type { FeedItem } from "../../../types";
import { ensureTelegramConnected } from "../../auth/infra/telegramAuth";
import {
  getMediaPreview,
  getMessageCommentsCount,
  mergeAlbumFeedItems,
  toRelativeTime,
} from "../infra/telegramFeed";
import { groupConsecutiveMediaOnlyItems } from "./groupConsecutiveMediaOnlyItems";
import styles from "./ChatThread.module.css";

type ChatThreadProps = {
  item: FeedItem;
  onMarkReadThrough?: (readMessageIds: string[]) => void;
};

type ThreadComment = {
  id: string;
  senderName: string;
  text: string;
  timestamp: string;
};

function getImageGridColumns(count: number): number {
  if (count <= 2) {
    return count;
  }
  if (count <= 4) {
    return count;
  }
  if (count <= 6) {
    return 3;
  }
  return 4;
}

function getGalleryItems(item: FeedItem): FeedItem[] {
  if (!item.mediaItems || item.mediaItems.length <= 1) {
    return [];
  }
  return item.mediaItems.map((media, index) => ({
    ...item,
    id: `${item.id}:media:${index}`,
    media,
    mediaItems: undefined,
  }));
}

function getGroupedGalleryItems(items: FeedItem[]): FeedItem[] {
  return items.flatMap((item) => {
    const galleryItems = getGalleryItems(item);
    if (galleryItems.length > 1) {
      return galleryItems;
    }
    return [item];
  });
}

function getSenderLabel(message: Api.Message, fallback: string) {
  const sender = (message as Api.Message & { sender?: unknown }).sender;
  if (sender && typeof sender === "object") {
    if ("title" in sender && typeof sender.title === "string") {
      return sender.title;
    }
    if ("firstName" in sender && typeof sender.firstName === "string") {
      const lastName =
        "lastName" in sender && typeof sender.lastName === "string" ? sender.lastName : "";
      return `${sender.firstName} ${lastName}`.trim();
    }
    if ("username" in sender && typeof sender.username === "string") {
      return sender.username;
    }
  }
  return fallback;
}

function getMessageReadKey(message: FeedItem): string {
  const sourceId = (message.sourceMessage as { id?: unknown } | undefined)?.id;
  if (typeof sourceId === "number" || typeof sourceId === "string") {
    return String(sourceId);
  }
  return message.id;
}

export function ChatThread({ item, onMarkReadThrough }: ChatThreadProps) {
  const [messages, setMessages] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showJump, setShowJump] = useState(false);
  const [commentsByMessage, setCommentsByMessage] = useState<Record<string, ThreadComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const focusedRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const sourceMessage = item.sourceMessage as Api.Message | undefined;
  const focusId = sourceMessage?.id;

  const fallbackMessage = useMemo<FeedItem[]>(() => {
    const message = {
      id: item.id,
      type: item.type,
      chatName: item.chatName,

      senderName: item.type === "dm" ? item.senderName : item.chatName,
      text: item.text,
      timestamp: item.timestamp,
      commentsCount: item.commentsCount,
      media: item.media,
      mediaItems: item.mediaItems,
      isFocused: true,
      isRead: item.isRead,
    };

    if (item.type !== "dm")
      return [
        {
          ...message,
          reactions: path(["reactions"], item),
        } as FeedItem,
      ];

    return [message as FeedItem];
  }, [item]);

  useEffect(() => {
    if (!sourceMessage) {
      setMessages(fallbackMessage);
      return;
    }
    let active = true;
    setIsLoading(true);
    setError("");
    ensureTelegramConnected()
      .then(async (client) => {
        const inputChat = sourceMessage.getInputChat
          ? await sourceMessage.getInputChat()
          : (sourceMessage as Api.Message & { inputChat?: unknown }).inputChat;
        const history = await client.getMessages(inputChat ?? undefined, {
          limit: 40,
        });
        const normalized = history
          .filter((message): message is Api.Message => message instanceof Api.Message)
          .reverse()
          .map((message) => {
            const senderName = getSenderLabel(message, item.chatName);
            const timestamp = message.date ? toRelativeTime(message.date) : "";
            return {
              id: String(message.id),
              senderName,
              text: message.message ?? "",
              timestamp,
              media: getMediaPreview(message),
              commentsCount: getMessageCommentsCount(message),
              sourceMessage: message,
              mediaGroupKey:
                typeof (message as Api.Message & { groupedId?: unknown }).groupedId === "bigint" ||
                typeof (message as Api.Message & { groupedId?: unknown }).groupedId === "number" ||
                typeof (message as Api.Message & { groupedId?: unknown }).groupedId === "string"
                  ? String((message as Api.Message & { groupedId?: unknown }).groupedId)
                  : undefined,
              isFocused: focusId ? message.id === focusId : false,
              isRead: false,
              reactions: path(["reactions"], message),
              type: message.toId instanceof Api.PeerUser ? "dm" : "group",
              chatName: message.toId instanceof Api.PeerUser ? senderName : item.chatName,
            } as FeedItem;
          });
        if (active) {
          setMessages(mergeAlbumFeedItems(normalized));
        }
      })
      .catch((err) => {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : "Failed to load thread";
        setError(message);
        setMessages(fallbackMessage);
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [fallbackMessage, focusId, item.chatName, sourceMessage]);

  useEffect(() => {
    if (!focusedRef.current) return;

    const node = focusedRef.current;
    node.scrollIntoView({ block: "center" });
    node.focus({ preventScroll: true });
  }, [messages]);

  const handleScroll = useCallback(() => {
    const container = threadRef.current;

    if (!container) return;

    const remaining = container.scrollHeight - container.scrollTop - container.clientHeight;
    setShowJump(remaining > 80);
  }, []);

  useEffect(() => {
    const container = threadRef.current;

    if (!container) return;

    handleScroll();

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  function handleJumpToLatest() {
    const container = threadRef.current;
    if (!container) {
      return;
    }
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }

  async function loadComments(message: FeedItem) {
    if (commentsByMessage[message.id] || commentsLoading[message.id]) {
      return;
    }
    const source = message.sourceMessage;
    if (!(source instanceof Api.Message)) {
      setCommentsByMessage((current) => ({ ...current, [message.id]: [] }));
      return;
    }
    setCommentsLoading((current) => ({ ...current, [message.id]: true }));
    try {
      const client = await ensureTelegramConnected();
      const inputChat = source.getInputChat
        ? await source.getInputChat()
        : (source as Api.Message & { inputChat?: unknown }).inputChat;
      const comments = await client.getMessages(inputChat ?? undefined, {
        limit: 30,
        replyTo: source.id,
      });
      const normalized = comments
        .filter((comment): comment is Api.Message => comment instanceof Api.Message)
        .reverse()
        .map((comment) => ({
          id: String(comment.id),
          senderName: getSenderLabel(comment, message.chatName),
          text: comment.message ?? "",
          timestamp: comment.date ? toRelativeTime(comment.date) : "",
        }));
      setCommentsByMessage((current) => ({ ...current, [message.id]: normalized }));
    } catch {
      setCommentsByMessage((current) => ({ ...current, [message.id]: [] }));
    } finally {
      setCommentsLoading((current) => ({ ...current, [message.id]: false }));
    }
  }

  function markReadThroughIndex(targetIndex: number) {
    setMessages((current) =>
      current.map((message, index) => {
        if (index > targetIndex || message.isRead === true) {
          return message;
        }
        return { ...message, isRead: true };
      }),
    );

    const readKeys = messages
      .slice(0, targetIndex + 1)
      .map(getMessageReadKey)
      .filter((key, index, all) => all.indexOf(key) === index);
    if (readKeys.length > 0) {
      onMarkReadThrough?.(readKeys);
    }
  }

  function renderComments(message: FeedItem) {
    if ((message.commentsCount ?? 0) <= 0) {
      return null;
    }

    return (
      <details
        className={styles.commentsAccordion}
        onToggle={(event) => {
          if (event.currentTarget.open) {
            void loadComments(message);
          }
        }}
      >
        <summary className={styles.commentsSummary} aria-label="Comments">
          <CommentsIcon />
        </summary>
        <div className={styles.commentsPanel}>
          {commentsLoading[message.id] && <p className={styles.commentsLoading}>Loading comments...</p>}
          {!commentsLoading[message.id] && (commentsByMessage[message.id]?.length ?? 0) === 0 && (
            <p className={styles.commentsEmpty}>No comments.</p>
          )}
          {!commentsLoading[message.id] &&
            (commentsByMessage[message.id] ?? []).map((comment) => (
              <div key={comment.id} className={styles.comment}>
                <p className={styles.commentHeader}>
                  <span>{comment.senderName}</span>
                  <span>{comment.timestamp}</span>
                </p>
                <p className={styles.commentText}>{comment.text || "…"}</p>
              </div>
            ))}
        </div>
      </details>
    );
  }

  const messageGroups = useMemo(() => groupConsecutiveMediaOnlyItems(messages), [messages]);

  return (
    <div className={clsx(styles.thread, (messages.length === 0 || isLoading) && styles.empty)}>
      {isLoading && <p className={styles.loading}>Loading thread...</p>}
      {error !== "" && <p className={styles.error}>{error}</p>}
      <div className={styles.threadList} ref={threadRef}>
        {messageGroups.map((group) => {
          const representative = group[0];
          const galleryItems = group.length > 1 ? getGroupedGalleryItems(group) : getGalleryItems(representative);
          const targetMessage = group[group.length - 1];
          const targetIndex = messages.findIndex((entry) => entry.id === targetMessage.id);
          const isGroupedRun = group.length > 1;
          const isGrouped = galleryItems.length > 1;
          const hasGroupedImages =
            isGrouped && galleryItems.every((message) => message.media?.meta.type === "image");
          const imageGridColumns = hasGroupedImages ? getImageGridColumns(galleryItems.length) : undefined;
          const isUnread = isGrouped
            ? galleryItems.some((message) => message.isRead !== true)
            : representative.isRead !== true;
          const isFocusedGroup = group.some((message) => message.isFocused);

          return (
            <div
              key={representative.id}
              className={`${styles.message} ${isFocusedGroup ? styles.messageFocused : ""}`}
              ref={isFocusedGroup ? focusedRef : null}
              role="button"
              tabIndex={0}
              onClick={() => {
                if (targetIndex >= 0) {
                  markReadThroughIndex(targetIndex);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (targetIndex >= 0) {
                    markReadThroughIndex(targetIndex);
                  }
                }
              }}
            >
              <Header isThread message={representative} className={styles.header}>
                {representative.senderName}
              </Header>
              {isUnread && (
                <span className={styles.unreadIndicator} aria-label="Unread message">
                  <UnreadIcon />
                </span>
              )}
              {(!isGroupedRun || representative.text !== "") && (
                <Text className={styles.text}>{representative.text}</Text>
              )}
              {isGrouped ? (
                <div
                  className={hasGroupedImages ? styles.messageMediaGrid : styles.messageMediaStack}
                  data-media-group-layout={hasGroupedImages ? "image-grid" : "stack"}
                  style={
                    hasGroupedImages
                      ? ({ "--media-group-columns": String(imageGridColumns) } as CSSProperties)
                      : undefined
                  }
                >
                  {galleryItems.map((message) => {
                    const mediaIndex = messages.findIndex((entry) => entry.id === message.id);
                    return (
                      <div
                        key={message.id}
                        className={hasGroupedImages ? styles.messageMediaGridTile : styles.messageMediaItem}
                        data-media-group-tile="true"
                      >
                        {message.media && (
                          <Media
                            item={{
                              id: message.id,
                              type: item.type,
                              chatName: item.chatName,
                              senderName: message.senderName || "",
                              timestamp: message.timestamp,
                              text: message.text,
                              media: message.media,
                              reactions: [],
                              sourceMessage: message.sourceMessage,
                              isFocused: message.isFocused,
                              isRead: message.isRead,
                            }}
                            grayscale={false}
                            aspectRatioOverride={hasGroupedImages ? "1 / 1" : undefined}
                            onVideoPlay={() => {
                              if (mediaIndex >= 0) {
                                markReadThroughIndex(mediaIndex);
                                return;
                              }
                              if (targetIndex >= 0) {
                                markReadThroughIndex(targetIndex);
                              }
                            }}
                          />
                        )}
                        {renderComments(message)}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <>
                  {representative.media && (
                    <Media
                      item={{
                        id: representative.id,
                        type: item.type,
                        chatName: item.chatName,
                        senderName: representative.senderName || "",
                        timestamp: representative.timestamp,
                        text: representative.text,
                        media: representative.media,
                        reactions: [],
                        sourceMessage: representative.sourceMessage,
                        isFocused: representative.isFocused,
                        isRead: representative.isRead,
                      }}
                      grayscale={false}
                      onVideoPlay={() => {
                        if (targetIndex >= 0) {
                          markReadThroughIndex(targetIndex);
                        }
                      }}
                    />
                  )}
                  {renderComments(representative)}
                </>
              )}
            </div>
          );
        })}
        {showJump && (
          <button
            type="button"
            className={styles.jumpButton}
            onClick={handleJumpToLatest}
            aria-label="Jump to latest"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className={styles.jumpIcon}
            >
              <path d="M12 5v14" />
              <path d="m19 12-7 7-7-7" />
              <path d="M5 5h14" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
