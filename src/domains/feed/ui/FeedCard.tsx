import type { FeedItem } from '../model/mockFeed'
import { FeedCardMedia } from './FeedCardMedia'

type FeedCardProps = {
	item: FeedItem
	onFocus: (item: FeedItem) => void
}

export function FeedCard({ item, onFocus }: FeedCardProps) {
	return (
		<article
			className="feed-card"
			role="button"
			tabIndex={0}
			onClick={() => onFocus(item)}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault()
					onFocus(item)
				}
			}}
		>
			<div className="feed-card-body">
				<div className="feed-card-header">
					<p className="feed-card-sender">
						{item.type === 'dm' ? item.senderName : item.chatName}
					</p>
				</div>
				<span className="feed-card-time">{item.timestamp}</span>
				<p className="feed-card-text">{item.text}</p>
				<FeedCardMedia item={item} />
				{item.type === 'dm' && (
					<div className="feed-card-reactions">
						{item.reactions.map((reaction) => (
							<span key={reaction.emoji} className="feed-card-reaction">
								{reaction.emoji} {reaction.count}
							</span>
						))}
					</div>
				)}
			</div>
		</article>
	)
}
