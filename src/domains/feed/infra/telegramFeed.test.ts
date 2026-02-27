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

  class DocumentAttributeFilename {
    fileName = ''
    constructor(data: Record<string, unknown> = {}) {
      Object.assign(this, data)
    }
  }

  class DocumentAttributeAudio {
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

  class GetUserPhotos {
    constructor(public data: Record<string, unknown> = {}) {}
  }

  return {
    Message,
    Photo,
    Document,
    DocumentAttributeVideo,
    DocumentAttributeImageSize,
    DocumentAttributeFilename,
    DocumentAttributeAudio,
    MessageMediaPhoto,
    MessageMediaDocument,
    photos: {
      GetUserPhotos,
    },
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
  downloadThumbnailForItem,
  downloadMediaForItem,
  fetchRecentFeed,
  getAvatarPhotoGallery,
  getAvatarPhotoUrl,
  getCachedMediaUrl,
  getMessageCommentsCount,
  getMediaPreview,
  markFeedItemReadThrough,
  sendMessageToFeedItem,
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
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    blob: async () => new Blob(['mock']),
  } as Response)
})

afterEach(() => {
  vi.restoreAllMocks()
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
        fileName: '',
      },
      alt: 'Media',
      key: 'doc-7',
    })
  })

  test('builds file preview metadata for generic documents', () => {
    const document = new Api.Document({
      id: 8,
      size: 4096,
      mimeType: 'application/pdf',
      attributes: [new Api.DocumentAttributeFilename({ fileName: 'report.pdf' })],
    })
    const message = new Api.Message({
      id: 12,
      media: new Api.MessageMediaDocument({ document }),
    })

    const preview = getMediaPreview(message)

    expect(preview).toEqual({
      meta: {
        type: 'file',
        width: 0,
        height: 0,
        sizeBytes: 4096,
        mimeType: 'application/pdf',
        fileName: 'report.pdf',
      },
      alt: 'Media',
      key: 'doc-8',
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

describe('avatar helpers', () => {
  test('reads latest avatar from gallery and caches it', async () => {
    const client = {
      invoke: vi.fn().mockResolvedValue({
        photos: [new Api.Photo({ id: 11 }), new Api.Photo({ id: 12 })],
      }),
      downloadMedia: vi
        .fn()
        .mockResolvedValueOnce(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))
        .mockResolvedValueOnce(new Uint8Array([0xff, 0xd8, 0xff])),
      downloadProfilePhoto: vi.fn(),
    }
    ensureTelegramConnectedMock.mockResolvedValue(client)

    const first = await getAvatarPhotoUrl({ id: 1 }, 'avatar:test')
    const second = await getAvatarPhotoUrl({ id: 1 }, 'avatar:test')

    expect(first).toBe('blob:mock')
    expect(second).toBe('blob:mock')
    expect(client.invoke).toHaveBeenCalledTimes(1)
    expect(client.downloadProfilePhoto).not.toHaveBeenCalled()
  })

  test('falls back to profile photo when gallery is empty', async () => {
    const client = {
      invoke: vi.fn().mockResolvedValue({ photos: [] }),
      downloadMedia: vi.fn(),
      downloadProfilePhoto: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }
    ensureTelegramConnectedMock.mockResolvedValue(client)

    const url = await getAvatarPhotoUrl({ id: 2 }, 'avatar:profile')
    expect(url).toBe('blob:mock')
    expect(client.downloadProfilePhoto).toHaveBeenCalled()
  })

  test('returns avatar gallery and handles invalid entity', async () => {
    const client = {
      invoke: vi.fn().mockResolvedValue({
        photos: [new Api.Photo({ id: 22 })],
      }),
      downloadMedia: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }
    ensureTelegramConnectedMock.mockResolvedValue(client)

    const gallery = await getAvatarPhotoGallery({ id: 2 }, 'avatar:gallery')
    const empty = await getAvatarPhotoGallery(undefined, 'avatar:none')

    expect(gallery).toEqual(['blob:mock'])
    expect(empty).toEqual([])
  })
})

describe('message helpers', () => {
  test('extracts message comments count', () => {
    expect(getMessageCommentsCount(new Api.Message({ replies: { replies: 3 } }))).toBe(3)
    expect(getMessageCommentsCount(new Api.Message({ replies: { replies: 2n } }))).toBe(2)
    expect(getMessageCommentsCount(new Api.Message({}))).toBe(0)
  })

  test('sends messages with trimmed text and throws for invalid source', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined)
    ensureTelegramConnectedMock.mockResolvedValue({ sendMessage })

    await sendMessageToFeedItem(
      {
        id: 'group-1',
        type: 'group',
        chatName: 'Team',
        timestamp: 'now',
        text: '',
        sourceMessage: new Api.Message({
          getInputChat: vi.fn().mockResolvedValue('chat'),
        }),
        isFocused: false,
      },
      '  hi  ',
    )
    expect(sendMessage).toHaveBeenCalledWith('chat', { message: 'hi' })

    await expect(
      sendMessageToFeedItem(
        {
          id: 'group-2',
          type: 'group',
          chatName: 'Team',
          timestamp: 'now',
          text: '',
          sourceMessage: {},
          isFocused: false,
        },
        'hello',
      ),
    ).rejects.toThrow('Cannot send message for this conversation')
  })

  test('marks item as read in Telegram for source message id', async () => {
    const markAsRead = vi.fn().mockResolvedValue(true)
    ensureTelegramConnectedMock.mockResolvedValue({ markAsRead })

    await markFeedItemReadThrough({
      id: 'group-1',
      type: 'group',
      chatName: 'Team',
      timestamp: 'now',
      text: 'hello',
      sourceMessage: new Api.Message({
        id: 42,
        getInputChat: vi.fn().mockResolvedValue('chat'),
      }),
      isFocused: false,
    })

    expect(markAsRead).toHaveBeenCalledWith('chat', 42)
  })

  test('skips Telegram read mark when message source is missing', async () => {
    const markAsRead = vi.fn().mockResolvedValue(true)
    ensureTelegramConnectedMock.mockResolvedValue({ markAsRead })

    await markFeedItemReadThrough({
      id: 'group-1',
      type: 'group',
      chatName: 'Team',
      timestamp: 'now',
      text: 'hello',
      isFocused: false,
    })

    expect(markAsRead).not.toHaveBeenCalled()
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

  test('returns undefined for missing media and cached media for existing blob', async () => {
    const dal = {
      getMedia: vi.fn().mockResolvedValueOnce(new Blob(['x'])).mockResolvedValueOnce(undefined),
      setMedia: vi.fn(),
    }
    createIndexedDbDalMock.mockReturnValue(dal)
    ensureTelegramConnectedMock.mockResolvedValue({ downloadMedia: vi.fn() })

    const cached = await getCachedMediaUrl({
      id: 'group-1',
      type: 'group',
      chatName: 'Team',
      timestamp: 'now',
      text: 'x',
      media: {
        key: 'key-1',
        meta: { type: 'file', width: 0, height: 0, sizeBytes: 1, mimeType: 'text/plain' },
        alt: 'x',
      },
      isFocused: false,
    })

    const none = await downloadMediaForItem({
      id: 'group-2',
      type: 'group',
      chatName: 'Team',
      timestamp: 'now',
      text: 'x',
      isFocused: false,
    })

    expect(cached).toBe('blob:mock')
    expect(none).toBeUndefined()
  })

  test('downloads thumbnail and handles no-video-thumb case', async () => {
    const sourceMessage = new Api.Message({
      id: 99,
      media: new Api.MessageMediaDocument({
        document: new Api.Document({ thumbs: [] }),
      }),
    })
    const client = { downloadMedia: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])) }
    ensureTelegramConnectedMock.mockResolvedValue(client)
    createIndexedDbDalMock.mockReturnValue({
      getMedia: vi.fn().mockResolvedValue(undefined),
      setMedia: vi.fn().mockResolvedValue(undefined),
    })

    const noThumb = await downloadThumbnailForItem(
      {
        id: 'group-video',
        type: 'group',
        chatName: 'Team',
        timestamp: 'now',
        text: '',
        media: {
          meta: { type: 'video', width: 640, height: 360, sizeBytes: 10, mimeType: 'video/mp4' },
          alt: 'video',
        },
        sourceMessage,
        isFocused: false,
      },
      320,
    )

    expect(noThumb).toBeUndefined()
  })
})
