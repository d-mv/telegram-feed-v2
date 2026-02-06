import type { Dal } from './types'

const DB_NAME = 'telegram-feed'
const DB_VERSION = 1
const STORE_NAME = 'kv'

type DbValue = unknown

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION)

		request.onupgradeneeded = () => {
			const db = request.result
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME)
			}
		}

		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error)
	})
}

async function withStore<T>(
	mode: IDBTransactionMode,
	action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
	const db = await openDb()
	return new Promise((resolve, reject) => {
		const transaction = db.transaction(STORE_NAME, mode)
		const store = transaction.objectStore(STORE_NAME)
		const request = action(store)

		request.onsuccess = () => resolve(request.result)
		request.onerror = () => reject(request.error)
	})
}

async function getValue(key: string): Promise<DbValue | undefined> {
	const result = await withStore('readonly', (store) => store.get(key))
	return result === undefined ? undefined : (result as DbValue)
}

async function setValue(key: string, value: DbValue): Promise<void> {
	await withStore('readwrite', (store) => store.put(value, key))
}

export function createIndexedDbDal(): Dal {
	return {
		getSession: () => getValue('session'),
		setSession: (session) => setValue('session', session),
		getFeedCache: () => getValue('feed'),
		setFeedCache: (feed) => setValue('feed', feed),
		getSaved: () => getValue('saved'),
		setSaved: (saved) => setValue('saved', saved),
		getDrafts: () => getValue('drafts'),
		setDrafts: (drafts) => setValue('drafts', drafts),
		getMedia: async (key) => {
			const value = await getValue(`media:${key}`)
			return value instanceof Blob ? value : undefined
		},
		setMedia: (key, blob) => setValue(`media:${key}`, blob),
	}
}
