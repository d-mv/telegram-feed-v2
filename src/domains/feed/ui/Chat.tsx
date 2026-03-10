import { useContext, useEffect, useState } from "react";
import { Button } from "../../../shared/ui/Button/Button";
import type { FeedItem } from "../../../types";
import { AppContext } from "../../app/AppContext";
import styles from "./Chat.module.css";
import { ChatThread } from "./ChatThread";

type ChatProps = {
  item: FeedItem;
  onClose: () => void;
};

export function Chat({ item, onClose }: ChatProps) {
  const title = item.type === "dm" ? item.chatName : item.chatName;
  const { onSendMessage } = useContext(AppContext);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
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

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <button className={styles.backdrop} type="button" onClick={onClose}>
        <span className={styles.srOnly}>Close</span>
      </button>
      <section className={styles.panel}>
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <Button variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
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
