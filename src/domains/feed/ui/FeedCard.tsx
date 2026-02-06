import type { FeedItem } from '../model/mockFeed'
import { FeedCardMedia } from './FeedCardMedia'
import styles from './FeedCard.module.css'

type FeedCardProps = {
	item: FeedItem
	onFocus: (item: FeedItem) => void
}

export function FeedCard({ item, onFocus }: FeedCardProps) {
	return (
		<article
			className={styles.feedCard}
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
			<div className={styles.feedCardBody}>
				<div className={styles.feedCardHeader}>
					<p className={styles.feedCardSender}>
						{item.type === 'dm' ? item.senderName : item.chatName}
					</p>
				</div>
				<span className={styles.feedCardTime}>{item.timestamp}</span>
				<p className={styles.feedCardText}>{item.text}</p>
				<FeedCardMedia item={item} />
				{item.type === 'dm' && (
					<div className={styles.feedCardReactions}>
						{item.reactions.map((reaction) => (
							<span key={reaction.emoji} className={styles.feedCardReaction}>
								{reaction.emoji} {reaction.count}
							</span>
						))}
					</div>
				)}
			</div>
		</article>
	)
}
