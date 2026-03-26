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
  clearAvatarCaches,
  downloadThumbnailForItem,
  downloadMediaForItem,
  fetchRecentFeed,
  getAvatarPhotoGallery,
  getAvatarPhotoUrl,
  getCachedMediaUrl,
  getMessageCommentsCount,
  getMediaPreview,
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

    const items = await fetchRecentFeed({ perChat: 10, maxAgeDays: 7 }, ensureTelegramConnectedMock)

    expect(items).toHaveLength(2)
    expect(items[0]?.id).toBe('dm-101-1')
    expect(items[0]?.type).toBe('dm')
    expect(items[1]?.id).toBe('group-202-4')
    expect(items[1]?.type).toBe('group')
  })

  test('merges grouped image albums into a single feed item', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const dialogGroup = {
      id: 202,
      isUser: false,
      title: 'Team',
      entity: {},
    }

    const firstPhoto = new Api.Photo({
      id: 41,
      sizes: [{ w: 300, h: 200, size: 800 }],
    })
    const secondPhoto = new Api.Photo({
      id: 42,
      sizes: [{ w: 320, h: 240, size: 900 }],
    })

    const client = {
      getMe: vi.fn().mockResolvedValue({ id: 1 }),
      getDialogs: vi.fn().mockResolvedValue([dialogGroup]),
      getMessages: vi.fn().mockResolvedValue([
        new Api.Message({
          id: 11,
          date: nowSeconds - 60,
          message: '',
          out: false,
          groupedId: 999n,
          getSender: vi.fn().mockResolvedValue({ firstName: 'Alice' }),
          media: new Api.MessageMediaPhoto({ photo: secondPhoto }),
        }),
        new Api.Message({
          id: 10,
          date: nowSeconds - 61,
          message: 'Album caption',
          out: false,
          groupedId: 999n,
          getSender: vi.fn().mockResolvedValue({ firstName: 'Alice' }),
          media: new Api.MessageMediaPhoto({ photo: firstPhoto }),
        }),
      ]),
    }

    ensureTelegramConnectedMock.mockResolvedValue(client)

    const items = await fetchRecentFeed({ perChat: 10, maxAgeDays: 7 }, ensureTelegramConnectedMock)

    expect(items).toHaveLength(1)
    expect(items[0]?.text).toBe('Album caption')
    expect(items[0]?.senderName).toBe('Alice')
    expect(items[0]?.mediaItems).toHaveLength(2)
    expect(items[0]?.mediaItems?.map((media) => media.key)).toEqual(['photo-42', 'photo-41'])
  })

  test('fetches dialogs concurrently instead of blocking on each chat in sequence', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const firstResolve = vi.fn()
    let releaseFirstDialog: (() => void) | null = null
    const dialogUser = {
      id: 101,
      isUser: true,
      name: 'Alice',
      entity: { id: 'first' },
    }
    const dialogGroup = {
      id: 202,
      isUser: false,
      title: 'Team',
      entity: { id: 'second' },
    }
    const client = {
      getMe: vi.fn().mockResolvedValue({ id: 1 }),
      getDialogs: vi.fn().mockResolvedValue([dialogUser, dialogGroup]),
      getMessages: vi.fn().mockImplementation((entity: { id: string }) => {
        if (entity.id === 'first') {
          return new Promise((resolve) => {
            releaseFirstDialog = () => {
              firstResolve()
              resolve([
                new Api.Message({
                  id: 1,
                  date: nowSeconds - 60,
                  message: 'hi',
                  out: false,
                  fromId: { userId: 2 },
                }),
              ])
            }
          })
        }
        return Promise.resolve([
          new Api.Message({
            id: 2,
            date: nowSeconds - 30,
            message: 'group',
            out: false,
          }),
        ])
      }),
    }

    ensureTelegramConnectedMock.mockResolvedValue(client)

    const itemsPromise = fetchRecentFeed({ perChat: 10, maxAgeDays: 7 }, ensureTelegramConnectedMock)

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    expect(client.getMessages).toHaveBeenCalledTimes(2)
    expect(firstResolve).not.toHaveBeenCalled()

    releaseFirstDialog?.()
    const items = await itemsPromise

    expect(items).toHaveLength(2)
  })

  test('does not resolve sender entities for direct messages', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const getSender = vi.fn().mockResolvedValue({ firstName: 'Ignored' })
    const dialogUser = {
      id: 101,
      isUser: true,
      name: 'Alice',
      entity: {},
    }
    const client = {
      getMe: vi.fn().mockResolvedValue({ id: 1 }),
      getDialogs: vi.fn().mockResolvedValue([dialogUser]),
      getMessages: vi.fn().mockResolvedValue([
        new Api.Message({
          id: 1,
          date: nowSeconds - 60,
          message: 'hi',
          out: false,
          fromId: { userId: 2 },
          getSender,
        }),
      ]),
    }

    ensureTelegramConnectedMock.mockResolvedValue(client)

    const items = await fetchRecentFeed({ perChat: 10, maxAgeDays: 7 }, ensureTelegramConnectedMock)

    expect(items).toHaveLength(1)
    expect(items[0]?.senderName).toBe('Alice')
    expect(getSender).not.toHaveBeenCalled()
  })

  test('fetches only messages newer than the cached latest item for each chat', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const dialogUser = {
      id: 101,
      isUser: true,
      name: 'Alice',
      entity: { id: 'first' },
    }
    const dialogGroup = {
      id: 202,
      isUser: false,
      title: 'Team',
      entity: { id: 'second' },
    }
    const client = {
      getMe: vi.fn().mockResolvedValue({ id: 1 }),
      getDialogs: vi.fn().mockResolvedValue([dialogUser, dialogGroup]),
      getMessages: vi
        .fn()
        .mockResolvedValueOnce([
          new Api.Message({
            id: 11,
            date: nowSeconds - 30,
            message: 'new dm',
            out: false,
            fromId: { userId: 2 },
          }),
        ])
        .mockResolvedValueOnce([
          new Api.Message({
            id: 9,
            date: nowSeconds - 40,
            message: 'new group',
            out: false,
          }),
        ]),
    }

    ensureTelegramConnectedMock.mockResolvedValue(client)

    const items = await fetchRecentFeed(
      {
        perChat: 10,
        maxAgeDays: 7,
        latestMessageIdsByChat: {
          'dm:101': 10,
          'group:202': 8,
        },
      },
      ensureTelegramConnectedMock,
    )

    expect(client.getMessages).toHaveBeenNthCalledWith(
      1,
      dialogUser.entity,
      expect.objectContaining({
        minId: 10,
        maxId: 2147483647,
        limit: undefined,
      }),
    )
    expect(client.getMessages).toHaveBeenNthCalledWith(
      2,
      dialogGroup.entity,
      expect.objectContaining({
        minId: 8,
        maxId: 2147483647,
        limit: undefined,
      }),
    )
    expect(items).toHaveLength(2)
    expect(items[0]?.id).toBe('dm-101-11')
    expect(items[1]?.id).toBe('group-202-9')
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

    const first = await getAvatarPhotoUrl({ id: 1 }, 'avatar:test', ensureTelegramConnectedMock)
    const second = await getAvatarPhotoUrl({ id: 1 }, 'avatar:test', ensureTelegramConnectedMock)

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

    const url = await getAvatarPhotoUrl({ id: 2 }, 'avatar:profile', ensureTelegramConnectedMock)
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

    const gallery = await getAvatarPhotoGallery({ id: 2 }, 'avatar:gallery', ensureTelegramConnectedMock)
    const empty = await getAvatarPhotoGallery(undefined, 'avatar:none', ensureTelegramConnectedMock)

    expect(gallery).toEqual(['blob:mock'])
    expect(empty).toEqual([])
  })

  test('clears cached avatar object urls', async () => {
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(URL, 'createObjectURL')
      .mockReturnValueOnce('blob:gallery-1')
      .mockReturnValueOnce('blob:gallery-2')
      .mockReturnValueOnce('blob:profile')

    const client = {
      invoke: vi.fn().mockResolvedValue({
        photos: [new Api.Photo({ id: 1 }), new Api.Photo({ id: 2 })],
      }),
      downloadMedia: vi
        .fn()
        .mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
        .mockResolvedValueOnce(new Uint8Array([4, 5, 6])),
      downloadProfilePhoto: vi.fn().mockResolvedValue(new Uint8Array([7, 8, 9])),
    }
    ensureTelegramConnectedMock.mockResolvedValue(client)

    await getAvatarPhotoGallery({ id: 1 }, 'avatar:gallery-clear', ensureTelegramConnectedMock)
    await getAvatarPhotoUrl({ id: 2 }, 'avatar:profile-clear', ensureTelegramConnectedMock)

    clearAvatarCaches()

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:gallery-1')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:gallery-2')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:profile')
  })
})

describe('message helpers', () => {
  test('extracts message comments count', () => {
    expect(getMessageCommentsCount(new Api.Message({ replies: { replies: 3 } }))).toBe(3)
    expect(getMessageCommentsCount(new Api.Message({ replies: { replies: 2n } }))).toBe(2)
    expect(getMessageCommentsCount(new Api.Message({}))).toBe(0)
  })

  test('sends messages with trimmed text and throws for invalid source', async () => {
    const sendMessage = vi.fn().mockResolvedValue(
      new Api.Message({
        id: 99,
        date: 1_707_000_000,
        message: 'hi',
        out: true,
      }),
    )
    ensureTelegramConnectedMock.mockResolvedValue({ sendMessage })

    const result = await sendMessageToFeedItem(
      {
        id: 'group-1',
        type: 'group',
        channelKey: 'group:1',
        chatName: 'Team',
        senderName: 'Team',
        timestamp: 'now',
        text: '',
        sourceMessage: new Api.Message({
          getInputChat: vi.fn().mockResolvedValue('chat'),
        }),
        isFocused: false,
      },
      '  hi  ',
      ensureTelegramConnectedMock,
    )
    expect(sendMessage).toHaveBeenCalledWith('chat', { message: 'hi' })
    expect(result).toMatchObject({
      id: '99',
      channelKey: 'group:1',
      type: 'group',
      chatName: 'Team',
      senderName: 'You',
      text: 'hi',
    })

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
        ensureTelegramConnectedMock,
      ),
    ).rejects.toThrow('Cannot send message for this conversation')
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

    await downloadMediaForItem(item, ensureTelegramConnectedMock, progress)

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
    }, ensureTelegramConnectedMock)

    expect(cached).toBe('blob:mock')
    expect(none).toBeUndefined()
  })

  test('stores downloaded media without refetching blob urls', async () => {
    const setMedia = vi.fn().mockResolvedValue(undefined)
    createIndexedDbDalMock.mockReturnValue({
      getMedia: vi.fn().mockResolvedValue(undefined),
      setMedia,
    })
    const client = {
      downloadMedia: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    }
    ensureTelegramConnectedMock.mockResolvedValue(client)

    const url = await downloadMediaForItem({
      id: 'group-3',
      type: 'group',
      chatName: 'Team',
      timestamp: 'now',
      text: 'file',
      media: {
        key: 'key-3',
        meta: { type: 'file', width: 0, height: 0, sizeBytes: 3, mimeType: 'application/pdf' },
        alt: 'file',
      },
      sourceMessage: new Api.Message({ id: 3 }),
      isFocused: false,
    }, ensureTelegramConnectedMock)

    expect(url).toBe('blob:mock')
    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(setMedia).toHaveBeenCalledWith('key-3', expect.any(Blob))
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
      ensureTelegramConnectedMock,
    )

    expect(noThumb).toBeUndefined()
  })
})
