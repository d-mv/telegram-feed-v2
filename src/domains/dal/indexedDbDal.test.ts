import { afterEach, beforeEach, expect, test } from 'vitest'
import { createIndexedDbDal } from './indexedDbDal'

type FakeRequest<T> = {
  result?: T
  onerror?: (() => void) | null
  onsuccess?: ((event: { target: FakeRequest<T> }) => void) | null
  onupgradeneeded?: ((event: { target: FakeRequest<T> }) => void) | null
}

class FakeCursor {
  key: string
  #keys: string[]
  #indexRef: { value: number }
  #store: Map<string, unknown>
  #request: FakeRequest<FakeCursor | null>

  constructor(
    key: string,
    keys: string[],
    indexRef: { value: number },
    store: Map<string, unknown>,
    request: FakeRequest<FakeCursor | null>,
  ) {
    this.key = key
    this.#keys = keys
    this.#indexRef = indexRef
    this.#store = store
    this.#request = request
  }

  delete() {
    this.#store.delete(this.key)
  }

  continue() {
    this.#indexRef.value += 1
    const nextKey = this.#keys[this.#indexRef.value]
    const nextCursor = nextKey
      ? new FakeCursor(
          nextKey,
          this.#keys,
          this.#indexRef,
          this.#store,
          this.#request,
        )
      : null
    this.#request.result = nextCursor
    queueMicrotask(() => {
      this.#request.onsuccess?.({ target: this.#request })
    })
  }
}

class FakeObjectStore {
  #store: Map<string, unknown>

  constructor(store: Map<string, unknown>) {
    this.#store = store
  }

  get(key: string) {
    const request: FakeRequest<unknown> = {}
    request.result = this.#store.get(key)
    queueMicrotask(() => {
      request.onsuccess?.({ target: request })
    })
    return request
  }

  put(value: unknown, key: string) {
    const request: FakeRequest<unknown> = {}
    this.#store.set(key, value)
    request.result = value
    queueMicrotask(() => {
      request.onsuccess?.({ target: request })
    })
    return request
  }

  openCursor() {
    const request: FakeRequest<FakeCursor | null> = {}
    const keys = Array.from(this.#store.keys())
    const indexRef = { value: 0 }
    request.result = keys[0]
      ? new FakeCursor(keys[0], keys, indexRef, this.#store, request)
      : null
    queueMicrotask(() => {
      request.onsuccess?.({ target: request })
    })
    return request
  }
}

class FakeDatabase {
  #stores = new Map<string, Map<string, unknown>>()
  objectStoreNames = {
    contains: (name: string) => this.#stores.has(name),
  }

  createObjectStore(name: string) {
    if (!this.#stores.has(name)) {
      this.#stores.set(name, new Map())
    }
  }

  transaction(name: string) {
    const store = this.#stores.get(name)
    if (!store) {
      throw new Error('Store missing')
    }
    return {
      objectStore: () => new FakeObjectStore(store),
    }
  }
}

class FakeIndexedDb {
  #db = new FakeDatabase()
  open() {
    const request: FakeRequest<FakeDatabase> = {}
    queueMicrotask(() => {
      request.result = this.#db
      if (!this.#db.objectStoreNames.contains('kv')) {
        request.onupgradeneeded?.({ target: request })
      }
      request.onsuccess?.({ target: request })
    })
    return request
  }
}

const originalIndexedDb = globalThis.indexedDB

beforeEach(() => {
  globalThis.indexedDB = new FakeIndexedDb() as unknown as IDBFactory
})

afterEach(() => {
  globalThis.indexedDB = originalIndexedDb
})

test('persists and retrieves session values', async () => {
  const dal = createIndexedDbDal()

  await dal.setSession('session-token')
  const session = await dal.getSession()

  expect(session).toBe('session-token')
})

test('clearCache preserves session and removes other keys', async () => {
  const dal = createIndexedDbDal()

  await dal.setSession('session-token')
  await dal.setFeedCache([{ id: 'feed' }])
  await dal.clearCache()

  expect(await dal.getSession()).toBe('session-token')
  expect(await dal.getFeedCache()).toBeUndefined()
})

test('does not expose unused saved or draft persistence helpers', () => {
  const dal = createIndexedDbDal() as Record<string, unknown>

  expect(dal).not.toHaveProperty('getSaved')
  expect(dal).not.toHaveProperty('setSaved')
  expect(dal).not.toHaveProperty('getDrafts')
  expect(dal).not.toHaveProperty('setDrafts')
})
