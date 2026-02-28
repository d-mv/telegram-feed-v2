import clsx from "clsx";
import { path } from "ramda";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Api } from "telegram";
import { CommentsIcon } from "../../../shared/ui/CommentsIcon/CommentsIcon";
import { Header } from "../../../shared/ui/Header/Header";
import { Media } from "../../../shared/ui/Media/Media";
import { Text } from "../../../shared/ui/Text/Text";
import { UnreadIcon } from "../../../shared/ui/UnreadIcon/UnreadIcon";
import type { FeedItem } from "../../../types";
import { ensureTelegramConnected } from "../../auth/infra/telegramAuth";
import { getMediaPreview, getMessageCommentsCount, toRelativeTime } from "../infra/telegramFeed";
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
              isFocused: focusId ? message.id === focusId : false,
              isRead: false,
              reactions: path(["reactions"], message),
              type: message.toId instanceof Api.PeerUser ? "dm" : "group",
              chatName: message.toId instanceof Api.PeerUser ? senderName : item.chatName,
            } as FeedItem;
          });
        if (active) {
          setMessages(normalized);
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

  return (
    <div className={clsx(styles.thread, (messages.length === 0 || isLoading) && styles.empty)}>
      {isLoading && <p className={styles.loading}>Loading thread...</p>}
      {error !== "" && <p className={styles.error}>{error}</p>}
      <div className={styles.threadList} ref={threadRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${message.isFocused ? styles.messageFocused : ""}`}
            ref={message.isFocused ? focusedRef : null}
            role="button"
            tabIndex={0}
            onClick={() =>
              markReadThroughIndex(messages.findIndex((item) => item.id === message.id))
            }
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                markReadThroughIndex(messages.findIndex((item) => item.id === message.id));
              }
            }}
          >
            <Header isThread message={message} className={styles.header}>
              {message.senderName}
            </Header>
            {message.isRead !== true && (
              <span className={styles.unreadIndicator} aria-label="Unread message">
                <UnreadIcon />
              </span>
            )}
            <Text className={styles.text}>{message.text}</Text>
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
                onVideoPlay={() => {
                  const targetIndex = messages.findIndex((item) => item.id === message.id);
                  if (targetIndex >= 0) {
                    markReadThroughIndex(targetIndex);
                  }
                }}
              />
            )}
            {(message.commentsCount ?? 0) > 0 && (
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
                  {commentsLoading[message.id] && (
                    <p className={styles.commentsLoading}>Loading comments...</p>
                  )}
                  {!commentsLoading[message.id] &&
                    (commentsByMessage[message.id]?.length ?? 0) === 0 && (
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
            )}
          </div>
        ))}
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
