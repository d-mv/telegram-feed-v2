import { useContext, useEffect, useState } from "react";
import { Button } from "../../../shared/ui/Button/Button";
import type { FeedItem } from "../../../types";
import { AppContext } from "../../app/AppContext";
import { leaveFeedChannel } from "../../search/infra/telegramMembership";
import styles from "./Chat.module.css";
import { ChatThread } from "./ChatThread";

type ChatProps = {
  item: FeedItem;
  onClose: () => void;
};

export function Chat({ item, onClose }: ChatProps) {
  const title = item.chatName;
  const { ensureTelegramConnected, onClearChannelState, onManualRefresh, onSendMessage } = useContext(AppContext);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [sentMessages, setSentMessages] = useState<FeedItem[]>([]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSend() {
    const next = draft.trim();
    if (next === "" || isSending) {
      return;
    }
    const optimisticMessage: FeedItem =
      item.type === "dm"
        ? {
            id: `sent-${Date.now()}`,
            type: "dm",
            channelKey: item.channelKey,
            chatName: item.chatName,
            senderName: "You",
            timestamp: "Just now",
            text: next,
            commentsCount: 0,
            reactions: [],
            isFocused: false,
          }
        : {
            id: `sent-${Date.now()}`,
            type: "group",
            channelKey: item.channelKey,
            chatName: item.chatName,
            senderName: "You",
            timestamp: "Just now",
            text: next,
            commentsCount: 0,
            isFocused: false,
          };
    setIsSending(true);
    setError("");
    setSentMessages((current) => [...current, optimisticMessage]);
    try {
      const sentMessage = await onSendMessage(item, next);
      if (sentMessage) {
        setSentMessages((current) =>
          current.map((message) => (message.id === optimisticMessage.id ? sentMessage : message)),
        );
      }
      setDraft("");
    } catch {
      setSentMessages((current) => current.filter((message) => message.id !== optimisticMessage.id));
      setError("Could not send message.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleLeave() {
    if (isLeaving || !window.confirm(`Leave ${title}?`)) {
      return;
    }

    setIsLeaving(true);
    setIsMenuOpen(false);
    setError("");
    try {
      await leaveFeedChannel(item, ensureTelegramConnected);
      onClearChannelState?.(item.channelKey ?? "");
      await Promise.resolve(onManualRefresh());
      onClose();
    } catch {
      setError("Could not leave chat.");
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <button className={styles.backdrop} type="button" onClick={onClose}>
        <span className={styles.srOnly}>Close</span>
      </button>
      <section className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <div className={styles.headerActions}>
            <div className={styles.menuWrap}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="More actions"
                style={{ border: "none", background: "transparent" }}
                onClick={() => setIsMenuOpen((current) => !current)}
              >
                <span className={styles.dot} />
                <span className={styles.dot} />
                <span className={styles.dot} />
              </button>
              {isMenuOpen && (
                <div className={styles.menu} role="menu" style={{ zIndex: 4 }}>
                  <button
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    onClick={() => {
                      void handleLeave();
                    }}
                    disabled={isLeaving}
                  >
                    {isLeaving ? "Leaving..." : "Leave"}
                  </button>
                </div>
              )}
            </div>
            <Button
              variant="image"
              type="button"
              onClick={onClose}
              imgSrc="/icons/close_dark.svg"
              imgAlt="Close"
            />
          </div>
        </header>
        <div className={styles.body}>
          <ChatThread item={item} sentMessages={sentMessages} />
        </div>
        <footer className={styles.composer}>
          {error !== "" && <p className={styles.error}>{error}</p>}
          <input
            className={styles.composerInput}
            type="text"
            placeholder="Write a reply..."
            aria-label="Write a reply"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSend();
              }
            }}
            disabled={isSending}
          />
          <Button
            variant="primary"
            type="button"
            className={styles.sendButton}
            onClick={() => void handleSend()}
            disabled={isSending || draft.trim() === ""}
          >
            {isSending ? "Sending..." : "Send"}
          </Button>
        </footer>
      </section>
    </div>
  );
}
