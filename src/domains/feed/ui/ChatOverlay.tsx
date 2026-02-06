import { useEffect } from 'react'
import type { FeedItem } from '../model/mockFeed'
import { Button } from '../../../ui/Button'
import styles from './ChatOverlay.module.css'

type ChatOverlayProps = {
	item: FeedItem
	onClose: () => void
}

export function ChatOverlay({ item, onClose }: ChatOverlayProps) {
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
						<p className={styles.eyebrow}>Chat</p>
						<h2 className={styles.title}>{title}</h2>
					</div>
					<Button variant="ghost" type="button" onClick={onClose}>
						Close
					</Button>
				</header>
				<div className={styles.body}>
					<div className={styles.message}>
						<span className={styles.messageAuthor}>
							{item.type === 'dm' ? item.senderName : item.chatName}
						</span>
						<p>{item.text}</p>
					</div>
					<div className={`${styles.message} ${styles.messageMuted}`}>
						<span className={styles.messageAuthor}>System</span>
						<p>Mock thread. Real messages will appear here.</p>
					</div>
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
