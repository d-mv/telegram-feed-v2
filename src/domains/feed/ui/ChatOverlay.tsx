import { useEffect } from 'react'
import type { FeedItem } from '../model/mockFeed'

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
		<div className="chat-overlay" role="dialog" aria-modal="true">
			<button className="chat-overlay-backdrop" type="button" onClick={onClose}>
				<span className="sr-only">Close</span>
			</button>
			<section className="chat-overlay-panel">
				<header className="chat-overlay-header">
					<div>
						<p className="chat-overlay-eyebrow">Chat</p>
						<h2>{title}</h2>
					</div>
					<button className="button button-ghost" type="button" onClick={onClose}>
						Close
					</button>
				</header>
				<div className="chat-overlay-body">
					<div className="chat-message">
						<span className="chat-message-author">
							{item.type === 'dm' ? item.senderName : item.chatName}
						</span>
						<p>{item.text}</p>
					</div>
					<div className="chat-message chat-message-muted">
						<span className="chat-message-author">System</span>
						<p>Mock thread. Real messages will appear here.</p>
					</div>
				</div>
				<footer className="chat-overlay-composer">
					<input
						type="text"
						placeholder="Write a reply..."
						aria-label="Write a reply"
					/>
					<button className="button button-primary" type="button">
						Send
					</button>
				</footer>
			</section>
		</div>
	)
}
