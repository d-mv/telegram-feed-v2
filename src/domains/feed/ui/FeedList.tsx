import type { RefObject } from 'react'
import type { FeedItem } from '../model/mockFeed'
import { FeedCard } from './FeedCard'
import styles from './FeedList.module.css'

type FeedListProps = {
  items: FeedItem[]
  isLoadingOlder: boolean
  topSentinelRef: RefObject<HTMLDivElement>
  onFocus: (item: FeedItem) => void
}

export function FeedList({
  items,
  isLoadingOlder,
  topSentinelRef,
  onFocus,
}: FeedListProps) {
  return (
    <div className={styles.list}>
      <div ref={topSentinelRef} className={styles.sentinel} />
      {isLoadingOlder && (
        <p className={styles.loading} aria-live="polite">
          Loading older...
        </p>
      )}
      {items.map((item) => (
        <FeedCard key={item.id} item={item} onFocus={onFocus} />
      ))}
    </div>
  )
}
