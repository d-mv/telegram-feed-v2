import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const telegramMock = vi.hoisted(() => {
  class Message {
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data)
    }
  }

  class Photo {
    id?: number
    sizes?: unknown[]
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data)
    }
  }

  class Document {
    id?: number
    size?: number
    mimeType?: string
    attributes?: unknown[]
    thumbs?: unknown[]
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data)
    }
  }

  class DocumentAttributeVideo {
    w = 0
    h = 0
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data)
    }
  }

  class DocumentAttributeImageSize {
    w = 0
    h = 0
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data)
    }
  }

  class MessageMediaPhoto {
    className = 'MessageMediaPhoto'
    photo?: Photo
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data)
    }
  }

  class MessageMediaDocument {
    className = 'MessageMediaDocument'
    document?: Document
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data)
    }
  }

  return {
    Message,
    Photo,
    Document,
    DocumentAttributeVideo,
    DocumentAttributeImageSize,
    MessageMediaPhoto,
    MessageMediaDocument,
  }
})

vi.mock('telegram', () => ({
  Api: telegramMock,
}))

const ensureTelegramConnectedMock = vi.hoisted(() => vi.fn())
const createIndexedDbDalMock = vi.hoisted(() => vi.fn())

vi.mock('../../auth/infra/telegramAuth', () => ({
  ensureTelegramConnected: ensureTelegramConnectedMock,
}))

vi.mock('../../dal/indexedDbDal', () => ({
  createIndexedDbDal: createIndexedDbDalMock,
}))

import { Api } from 'telegram'
import {
  downloadMediaForItem,
  fetchRecentFeed,
  getMediaPreview,
  toRelativeTime,
} from './telegramFeed'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-02-08T00:00:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  createIndexedDbDalMock.mockReturnValue({
    getMedia: vi.fn().mockResolvedValue(undefined),
    setMedia: vi.fn().mockResolvedValue(undefined),
  })
})

describe('toRelativeTime', () => {
  test('formats seconds as just now', () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    expect(toRelativeTime(nowSeconds - 12)).toBe('Just now')
  })

  test('formats minutes, hours, and days', () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    expect(toRelativeTime(nowSeconds - 120)).toBe('2 min ago')
    expect(toRelativeTime(nowSeconds - 3 * 3600)).toBe('3 hr ago')
    expect(toRelativeTime(nowSeconds - 2 * 86400)).toBe('2 d ago')
  })
})

describe('getMediaPreview', () => {
  test('builds preview metadata for photos', () => {
    const photo = new Api.Photo({
      id: 42,
      sizes: [
        { w: 100, h: 100, size: 800 },
        { w: 200, h: 150, size: 1400 },
      ],
    })
    const message = new Api.Message({
      id: 10,
      media: new Api.MessageMediaPhoto({ photo }),
    })

    const preview = getMediaPreview(message)

    expect(preview).toEqual({
      meta: {
        type: 'image',
        width: 200,
        height: 150,
        sizeBytes: 1400,
        mimeType: 'image/jpeg',
      },
      alt: 'Photo',
      key: 'photo-42',
    })
  })

  test('builds preview metadata for documents', () => {
    const document = new Api.Document({
      id: 7,
      size: 2048,
      mimeType: 'video/mp4',
      attributes: [new Api.DocumentAttributeVideo({ w: 1280, h: 720 })],
    })
    const message = new Api.Message({
      id: 11,
      media: new Api.MessageMediaDocument({ document }),
    })

    const preview = getMediaPreview(message)

    expect(preview).toEqual({
      meta: {
        type: 'video',
        width: 1280,
        height: 720,
        sizeBytes: 2048,
        mimeType: 'video/mp4',
      },
      alt: 'Media',
      key: 'doc-7',
    })
  })
})

describe('fetchRecentFeed', () => {
  test('filters messages and returns recent items', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const dialogUser = {
      id: 101,
      isUser: true,
      name: 'Alice',
      entity: {},
    }
    const dialogGroup = {
      id: 202,
      isUser: false,
      title: 'Team',
      entity: {},
    }
    const client = {
      getMe: vi.fn().mockResolvedValue({ id: 1 }),
      getDialogs: vi.fn().mockResolvedValue([dialogUser, dialogGroup]),
      getMessages: vi
        .fn()
        .mockResolvedValueOnce([
          new Api.Message({
            id: 1,
            date: nowSeconds - 60,
            message: 'hi',
            out: false,
            fromId: { userId: 2 },
          }),
          new Api.Message({
            id: 2,
            date: nowSeconds - 40,
            message: 'outgoing',
            out: true,
          }),
          new Api.Message({
            id: 3,
            date: nowSeconds - 9 * 86400,
            message: 'old',
            out: false,
          }),
        ])
        .mockResolvedValueOnce([
          new Api.Message({
            id: 4,
            date: nowSeconds - 120,
            message: 'group',
            out: false,
          }),
        ]),
    }

    ensureTelegramConnectedMock.mockResolvedValue(client)

    const items = await fetchRecentFeed({ perChat: 10, maxAgeDays: 7 })

    expect(items).toHaveLength(2)
    expect(items[0]?.id).toBe('dm-101-1')
    expect(items[0]?.type).toBe('dm')
    expect(items[1]?.id).toBe('group-202-4')
    expect(items[1]?.type).toBe('group')
  })
})

describe('downloadMediaForItem', () => {
  test('passes through NativeBigInt progress values to callback', async () => {
    const sourceMessage = new Api.Message({ id: 55 })
    const item = {
      id: 'group-1-55',
      type: 'group' as const,
      chatName: 'Team',
      timestamp: 'now',
      text: 'video',
      media: {
        meta: {
          type: 'video' as const,
          width: 640,
          height: 360,
          sizeBytes: 1000,
          mimeType: 'video/mp4',
        },
        alt: 'Media',
      },
      sourceMessage,
    }
    const progress = vi.fn()
    const client = {
      downloadMedia: vi.fn().mockImplementation((_message, options?: unknown) => {
        const callback = (options as { progressCallback?: (d: unknown, t: unknown) => void })
          ?.progressCallback
        callback?.({ value: 131072n }, { value: 10289371n })
        return undefined
      }),
    }

    ensureTelegramConnectedMock.mockResolvedValue(client)

    await downloadMediaForItem(item, progress)

    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({ value: 131072n }),
      expect.objectContaining({ value: 10289371n }),
    )
  })
})
