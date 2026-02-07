import { useEffect } from 'react'
import { Button } from '../../../shared/ui/Button/Button'
import type { FeedItem } from '../model/mockFeed'
import styles from './Chat.module.css'
import { ChatThread } from './ChatThread'

type ChatProps = {
  item: FeedItem
  onClose: () => void
}

export function Chat({ item, onClose }: ChatProps) {
  const title = item.type === 'dm' ? item.chatName : item.chatName

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <button className={styles.backdrop} type="button" onClick={onClose}>
        <span className={styles.srOnly}>Close</span>
      </button>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>{title}</h2>
          </div>
          <Button variant="ghost" type="button" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className={styles.body}>
          <ChatThread item={item} />
        </div>
        <footer className={styles.composer}>
          <input
            className={styles.composerInput}
            type="text"
            placeholder="Write a reply..."
            aria-label="Write a reply"
          />
          <Button variant="primary" type="button">
            Send
          </Button>
        </footer>
      </section>
    </div>
  )
}
