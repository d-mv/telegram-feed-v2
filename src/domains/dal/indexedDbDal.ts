import type { Dal } from "./types";

const DB_NAME = "telegram-feed";
const DB_VERSION = 1;
const STORE_NAME = "kv";

type DbValue = unknown;

export function createIndexedDbDal(): Dal {
	let dbPromise: Promise<IDBDatabase> | null = null;

	function openDb(): Promise<IDBDatabase> {
		if (!dbPromise) {
			dbPromise = new Promise((resolve, reject) => {
				const request = indexedDB.open(DB_NAME, DB_VERSION);

				request.onupgradeneeded = () => {
					const db = request.result;
					if (!db.objectStoreNames.contains(STORE_NAME)) {
						db.createObjectStore(STORE_NAME);
					}
				};

				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error);
			});
		}
		return dbPromise;
	}

	async function withStore<T>(
		mode: IDBTransactionMode,
		action: (store: IDBObjectStore) => IDBRequest<T>,
	): Promise<T> {
		const db = await openDb();
		return new Promise((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, mode);
			const store = transaction.objectStore(STORE_NAME);
			const request = action(store);

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async function getValue(key: string): Promise<DbValue | undefined> {
		const result = await withStore("readonly", (store) => store.get(key));
		return result === undefined ? undefined : (result as DbValue);
	}

	async function setValue(key: string, value: DbValue): Promise<void> {
		await withStore("readwrite", (store) => store.put(value, key));
	}

	async function doClearCache(): Promise<void> {
		const db = await openDb();
		await new Promise<void>((resolve, reject) => {
			const transaction = db.transaction(STORE_NAME, "readwrite");
			const store = transaction.objectStore(STORE_NAME);
			const request = store.openCursor();

			request.onsuccess = () => {
				const cursor = request.result;
				if (!cursor) {
					resolve();
					return;
				}
				const key = String(cursor.key);
				if (key !== "session") {
					cursor.delete();
				}
				cursor.continue();
			};
			request.onerror = () => reject(request.error);
			transaction.onerror = () => reject(transaction.error);
		});
	}

	return {
		getSession: () => getValue("session"),
		setSession: (session) => setValue("session", session),
		getNotificationSettings: () => getValue("notification-settings"),
		setNotificationSettings: (settings) =>
			setValue("notification-settings", settings),
		getFeedFilterSettings: () => getValue("feed-filter-settings"),
		setFeedFilterSettings: (settings) =>
			setValue("feed-filter-settings", settings),
		getAvatarVisibilitySettings: () => getValue("avatar-visibility-settings"),
		setAvatarVisibilitySettings: (settings) =>
			setValue("avatar-visibility-settings", settings),
		getFeedCache: () => getValue("feed"),
		setFeedCache: (feed) => setValue("feed", feed),
		getMedia: async (key) => {
			const value = await getValue(`media:${key}`);
			return value instanceof Blob ? value : undefined;
		},
		setMedia: (key, blob) => setValue(`media:${key}`, blob),
		clearCache: () => doClearCache(),
	};
}
