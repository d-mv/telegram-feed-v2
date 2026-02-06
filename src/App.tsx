import { useEffect, useMemo, useState } from 'react'
import { createAuthFromEnv } from './domains/auth/infra/authFactory'
import type { AuthClient } from './domains/auth/model/authTypes'
import { LoginView } from './domains/auth/ui/LoginView'
import { FeedView } from './domains/feed/ui/FeedView'
import type { FeedItem } from './domains/feed/model/mockFeed'
import { fetchRecentFeed } from './domains/feed/infra/telegramFeed'
import { createIndexedDbDal } from './domains/dal/indexedDbDal'
import { ensureTelegramConnected } from './domains/auth/infra/telegramAuth'
import styles from './App.module.css'

type AppProps = {
	auth?: AuthClient
}

function App({ auth }: AppProps) {
	const [isAuthenticated, setIsAuthenticated] = useState(false)
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [feedError, setFeedError] = useState('')
	const [isLoadingFeed, setIsLoadingFeed] = useState(false)
	const [authClient, setAuthClient] = useState<AuthClient | null>(auth ?? null)
	const [isAuthLoading, setIsAuthLoading] = useState(auth ? false : true)
	const dal = useMemo(() => createIndexedDbDal(), [])

	useEffect(() => {
		if (auth) {
			setAuthClient(auth)
			setIsAuthLoading(false)
			return
		}
		dal
			.getSession()
			.then((session) => {
				const sessionValue = typeof session === 'string' ? session : undefined
				const client = createAuthFromEnv(import.meta.env, {
					session: sessionValue,
					onSession: (nextSession) => {
						dal.setSession(nextSession).catch(() => {})
					},
				})
				setAuthClient(client)
			})
			.catch(() => {
				const client = createAuthFromEnv(import.meta.env, {
					onSession: (nextSession) => {
						dal.setSession(nextSession).catch(() => {})
					},
				})
				setAuthClient(client)
			})
			.finally(() => {
				setIsAuthLoading(false)
			})
	}, [auth, dal])

	useEffect(() => {
		if (!authClient || isAuthenticated) {
			return
		}
		let cancelled = false
		ensureTelegramConnected()
			.then((client) => client.checkAuthorization())
			.then((authorized) => {
				if (!cancelled && authorized) {
					setIsAuthenticated(true)
				}
			})
			.catch(() => {})
		return () => {
			cancelled = true
		}
	}, [authClient, isAuthenticated])
	useEffect(() => {
		if (!isAuthenticated) {
			return
		}
		setIsLoadingFeed(true)
		setFeedError('')
		dal
			.getFeedCache()
			.then((cached) => {
				if (Array.isArray(cached)) {
					setFeedItems(cached as FeedItem[])
				}
			})
			.catch(() => {})

		fetchRecentFeed({ perChat: 10, maxAgeDays: 7 })
			.then((items) => {
				setFeedItems(items)
				const cacheItems = items.map(({ sourceMessage, ...rest }) => rest)
				return dal.setFeedCache(cacheItems)
			})
			.catch((error) => {
				const message =
					typeof error === 'object' && error && 'message' in error
						? String((error as { message?: string }).message)
						: 'Failed to load feed'
				setFeedError(message)
			})
			.finally(() => {
				setIsLoadingFeed(false)
			})
	}, [isAuthenticated])

	if (isAuthenticated) {
		if (isLoadingFeed) {
			return <div className={styles.feedLoading}>Loading feed...</div>
		}
		if (feedError) {
			return <div className={styles.feedLoading}>Feed error: {feedError}</div>
		}
		if (feedItems.length === 0) {
			return (
				<div className={styles.feedEmpty}>
					<p className={styles.feedEmptyTitle}>No recent messages.</p>
					<p className={styles.feedEmptySubtitle}>
						This feed only shows messages from the last 7 days.
					</p>
				</div>
			)
		}
		return <FeedView items={feedItems} />
	}

	if (isAuthLoading || !authClient) {
		return <div className={styles.feedLoading}>Preparing session...</div>
	}

	return (
		<LoginView
			auth={authClient}
			onAuthenticated={() => setIsAuthenticated(true)}
		/>
	)
}

export default App
