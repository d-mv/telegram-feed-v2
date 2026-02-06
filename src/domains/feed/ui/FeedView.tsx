import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FeedItem } from '../model/mockFeed'
import { getMockFeedBatch, getMockLiveItem } from '../model/mockFeed'
import { ChatOverlay } from './ChatOverlay'
import styles from './FeedView.module.css'
import { FeedHeader } from './FeedHeader'
import { FeedList } from './FeedList'
import { ScrollTopButton } from './ScrollTopButton'

const PAGE_SIZE = 10
const TOTAL_ITEMS = 60

type FeedViewProps = {
	items?: FeedItem[]
}

export function FeedView({ items: providedItems }: FeedViewProps) {
	const allItems = useMemo(() => getMockFeedBatch(TOTAL_ITEMS), [])
	const initialStart = Math.max(0, allItems.length - PAGE_SIZE)
	const [items, setItems] = useState<FeedItem[]>(() =>
		providedItems ?? allItems.slice(initialStart),
	)
	const [cursor, setCursor] = useState(
		providedItems ? 0 : initialStart,
	)
	const [focusedItem, setFocusedItem] = useState<FeedItem | null>(null)
	const [showScrollTop, setShowScrollTop] = useState(false)
	const [isLoadingOlder, setIsLoadingOlder] = useState(false)
	const topSentinelRef = useRef<HTMLDivElement | null>(null)
	const pendingPrependRef = useRef<{ height: number; adjust: boolean } | null>(
		null,
	)

	function prependItems(nextItems: FeedItem[], adjustScroll: boolean) {
		if (nextItems.length === 0) {
			return
		}
		const prevHeight = document.documentElement.scrollHeight
		pendingPrependRef.current = { height: prevHeight, adjust: adjustScroll }
		setItems((current) => [...nextItems, ...current])
	}

	function prependMore() {
		if (cursor <= 0) {
			return
		}
		const nextCursor = Math.max(0, cursor - PAGE_SIZE)
		setIsLoadingOlder(true)
		prependItems(allItems.slice(nextCursor, cursor), true)
		setCursor(nextCursor)
	}

	useLayoutEffect(() => {
		if (!pendingPrependRef.current) {
			return
		}
		const { height, adjust } = pendingPrependRef.current
		pendingPrependRef.current = null
		if (adjust) {
			const newHeight = document.documentElement.scrollHeight
			const delta = newHeight - height
			if (delta > 0) {
				window.scrollBy({ top: delta, behavior: 'auto' })
			}
		}
		setIsLoadingOlder(false)
	}, [items])

	useEffect(() => {
		function handleScroll() {
			setShowScrollTop(window.scrollY > 400)
		}

		handleScroll()
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	useEffect(() => {
		if (providedItems) {
			return
		}
		const target = topSentinelRef.current
		if (!target) {
			return
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) {
					prependMore()
				}
			},
			{ rootMargin: '120px 0px 0px 0px' },
		)
		observer.observe(target)
		return () => observer.disconnect()
	}, [cursor, allItems, providedItems])

	useEffect(() => {
		if (providedItems) {
			return
		}
		const interval = window.setInterval(() => {
			const shouldKeepScroll = window.scrollY > 80
			const nextItem = getMockLiveItem()
			prependItems([nextItem], shouldKeepScroll)
		}, 12000)

		return () => window.clearInterval(interval)
	}, [providedItems])

	return (
		<section className={styles.feedShell}>
			<FeedHeader />
			<FeedList
				items={items}
				isLoadingOlder={isLoadingOlder}
				topSentinelRef={topSentinelRef}
				onFocus={setFocusedItem}
			/>
			{focusedItem && (
				<ChatOverlay item={focusedItem} onClose={() => setFocusedItem(null)} />
			)}
			{showScrollTop && (
				<ScrollTopButton
					onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
				/>
			)}
		</section>
	)
}
