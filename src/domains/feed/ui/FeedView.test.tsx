import { Provider } from 'jotai/react'
import { createStore } from 'jotai/vanilla'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { feedItemsAtom } from '../../../atoms/feedItems.atom'
import { feedFilterSettingsAtom } from '../../../atoms/feedFilters.atom'
import { notificationFocusAtom } from '../../../atoms/notificationFocus.atom'
import { AppContext } from '../../app/AppContext'
import type { FeedItem } from '../model/mockFeed'
import { FeedView } from './FeedView'

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
})

function renderWithStore(store = createStore()) {
  return render(
    <Provider store={store}>
      <AppContext.Provider
        value={{
          dal: {
            getSession: vi.fn(),
            setSession: vi.fn(),
            getNotificationSettings: vi.fn(),
            setNotificationSettings: vi.fn(),
            getFeedFilterSettings: vi.fn(),
            setFeedFilterSettings: vi.fn(),
            getAvatarVisibilitySettings: vi.fn(),
            setAvatarVisibilitySettings: vi.fn(),
            getFeedCache: vi.fn(),
            setFeedCache: vi.fn(),
            getSaved: vi.fn(),
            setSaved: vi.fn(),
            getDrafts: vi.fn(),
            setDrafts: vi.fn(),
            getMedia: vi.fn(),
            setMedia: vi.fn(),
            clearCache: vi.fn(),
          },
          onManualRefresh: vi.fn(),
          onSendMessage: vi.fn().mockResolvedValue(undefined),
          ensureTelegramConnected: vi.fn().mockResolvedValue({}),
          avatarVisibility: { feed: true, thread: true, notifications: true },
          onSetAvatarVisibility: vi.fn(),
          onToggleChannelNotification: vi.fn(),
          onToggleChannelFilter: vi.fn(),
          onRequestNotificationPermission: vi.fn(),
          onDisableNotifications: vi.fn(),
          onEnableAllFeedFilters: vi.fn(),
        }}
      >
        <FeedView />
      </AppContext.Provider>
    </Provider>,
  )
}

test('renders feed placeholder', () => {
  renderWithStore()

  expect(
    screen.getByRole('heading', { name: /your feed is ready/i }),
  ).toBeInTheDocument()
})

test('updates visible messages when feed atom changes', () => {
  const first: FeedItem[] = [
    {
      id: 'dm-first',
      type: 'dm',
      chatName: 'A',
      senderName: 'A',
      timestamp: 'now',
      text: 'First message',
      reactions: [],
    },
  ]

  const second: FeedItem[] = [
    {
      id: 'dm-second',
      type: 'dm',
      chatName: 'B',
      senderName: 'B',
      timestamp: 'now',
      text: 'Second message',
      reactions: [],
    },
  ]

  const store = createStore()
  act(() => {
    store.set(feedItemsAtom, first)
  })
  const { rerender } = renderWithStore(store)
  expect(screen.getByText('First message')).toBeInTheDocument()

  act(() => {
    store.set(feedItemsAtom, second)
  })
  rerender(
    <Provider store={store}>
      <AppContext.Provider
        value={{
          dal: {
            getSession: vi.fn(),
            setSession: vi.fn(),
            getNotificationSettings: vi.fn(),
            setNotificationSettings: vi.fn(),
            getFeedFilterSettings: vi.fn(),
            setFeedFilterSettings: vi.fn(),
            getAvatarVisibilitySettings: vi.fn(),
            setAvatarVisibilitySettings: vi.fn(),
            getFeedCache: vi.fn(),
            setFeedCache: vi.fn(),
            getSaved: vi.fn(),
            setSaved: vi.fn(),
            getDrafts: vi.fn(),
            setDrafts: vi.fn(),
            getMedia: vi.fn(),
            setMedia: vi.fn(),
            clearCache: vi.fn(),
          },
          onManualRefresh: vi.fn(),
          onSendMessage: vi.fn().mockResolvedValue(undefined),
          ensureTelegramConnected: vi.fn().mockResolvedValue({}),
          avatarVisibility: { feed: true, thread: true, notifications: true },
          onSetAvatarVisibility: vi.fn(),
          onToggleChannelNotification: vi.fn(),
          onToggleChannelFilter: vi.fn(),
          onRequestNotificationPermission: vi.fn(),
          onDisableNotifications: vi.fn(),
          onEnableAllFeedFilters: vi.fn(),
        }}
      >
        <FeedView />
      </AppContext.Provider>
    </Provider>,
  )
  expect(screen.getByText('Second message')).toBeInTheDocument()
})

test('hides messages from channels switched off in feed filters', () => {
  const store = createStore()
  act(() => {
    store.set(feedItemsAtom, [
      {
        id: 'dm-100-1',
        channelKey: 'dm:100',
        type: 'dm',
        chatName: 'Alice',
        senderName: 'Alice',
        timestamp: 'now',
        text: 'Visible',
        reactions: [],
      },
      {
        id: 'group-200-1',
        channelKey: 'group:200',
        type: 'group',
        chatName: 'Team',
        timestamp: 'now',
        text: 'Hidden',
      },
    ])
    store.set(feedFilterSettingsAtom, { 'group:200': false })
  })

  renderWithStore(store)

  expect(screen.getByText('Visible')).toBeInTheDocument()
  expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
})

test('groups consecutive media-only messages from the same sender in the feed', () => {
  const store = createStore()
  act(() => {
    store.set(feedItemsAtom, [
      {
        id: 'dm-1-1',
        channelKey: 'dm:1',
        type: 'dm',
        chatName: 'Alice',
        senderName: 'Alice',
        timestamp: 'now',
        text: '',
        reactions: [],
        media: {
          meta: {
            type: 'image',
            width: 640,
            height: 360,
            sizeBytes: 1024,
            mimeType: 'image/jpeg',
          },
          url: 'https://example.com/a.jpg',
          alt: 'first',
        },
      },
      {
        id: 'dm-1-2',
        channelKey: 'dm:1',
        type: 'dm',
        chatName: 'Alice',
        senderName: 'Alice',
        timestamp: 'now',
        text: '',
        reactions: [],
        media: {
          meta: {
            type: 'image',
            width: 640,
            height: 360,
            sizeBytes: 1024,
            mimeType: 'image/jpeg',
          },
          url: 'https://example.com/b.jpg',
          alt: 'second',
        },
      },
    ])
  })

  renderWithStore(store)

  expect(screen.getAllByRole('img')).toHaveLength(2)
  expect(screen.getAllByText('Alice')).toHaveLength(1)
})

test('groups a media-only multi-image message with adjacent media-only messages in the feed', () => {
  const store = createStore()
  act(() => {
    store.set(feedItemsAtom, [
      {
        id: 'dm-1-1',
        channelKey: 'dm:1',
        type: 'dm',
        chatName: 'Alice',
        senderName: 'Alice',
        timestamp: 'now',
        text: '',
        reactions: [],
        media: {
          meta: {
            type: 'image',
            width: 640,
            height: 360,
            sizeBytes: 1024,
            mimeType: 'image/jpeg',
          },
          url: 'https://example.com/a.jpg',
          alt: 'first',
        },
        mediaItems: [
          {
            meta: {
              type: 'image',
              width: 640,
              height: 360,
              sizeBytes: 1024,
              mimeType: 'image/jpeg',
            },
            url: 'https://example.com/a.jpg',
            alt: 'first',
          },
          {
            meta: {
              type: 'image',
              width: 640,
              height: 360,
              sizeBytes: 1024,
              mimeType: 'image/jpeg',
            },
            url: 'https://example.com/b.jpg',
            alt: 'second',
          },
        ],
      },
      {
        id: 'dm-1-2',
        channelKey: 'dm:1',
        type: 'dm',
        chatName: 'Alice',
        senderName: 'Alice',
        timestamp: 'now',
        text: '',
        reactions: [],
        media: {
          meta: {
            type: 'image',
            width: 640,
            height: 360,
            sizeBytes: 1024,
            mimeType: 'image/jpeg',
          },
          url: 'https://example.com/c.jpg',
          alt: 'third',
        },
      },
    ])
  })

  const { container } = renderWithStore(store)

  expect(screen.getAllByText('Alice')).toHaveLength(1)
  expect(container.querySelectorAll('[data-media-group-tile="true"]')).toHaveLength(3)
})

test('focuses notification target in feed when feed is open', async () => {
  const store = createStore()
  act(() => {
    store.set(feedItemsAtom, [
      {
        id: 'dm-1-1',
        channelKey: 'dm:1',
        type: 'dm',
        chatName: 'Alice',
        senderName: 'Alice',
        timestamp: 'now',
        text: 'Target',
        reactions: [],
      },
    ])
    store.set(notificationFocusAtom, { itemId: 'dm-1-1', channelKey: 'dm:1' })
  })

  const { container } = renderWithStore(store)
  const card = container.querySelector('[data-feed-item-id="dm-1-1"]') as HTMLElement

  await waitFor(() => {
    expect(document.activeElement).toBe(card)
  })
})

test('closes wrong open thread and focuses target in feed for notification click', async () => {
  const user = userEvent.setup()
  const store = createStore()
  act(() => {
    store.set(feedItemsAtom, [
      {
        id: 'dm-1-1',
        channelKey: 'dm:1',
        type: 'dm',
        chatName: 'Alice',
        senderName: 'Alice',
        timestamp: 'now',
        text: 'Alice message',
        reactions: [],
      },
      {
        id: 'group-2-1',
        channelKey: 'group:2',
        type: 'group',
        chatName: 'Team',
        senderName: 'Team',
        timestamp: 'now',
        text: 'Team message',
      },
    ])
  })

  const { container } = renderWithStore(store)
  await user.click(screen.getByText('Alice message'))
  expect(screen.getByRole('dialog')).toBeInTheDocument()

  act(() => {
    store.set(notificationFocusAtom, { itemId: 'group-2-1', channelKey: 'group:2' })
  })

  const targetCard = container.querySelector('[data-feed-item-id="group-2-1"]') as HTMLElement
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(targetCard)
  })
})

test('keeps thread open and focuses target there when notification is for the open channel', async () => {
  const user = userEvent.setup()
  const store = createStore()
  act(() => {
    store.set(feedItemsAtom, [
      {
        id: 'dm-1-1',
        channelKey: 'dm:1',
        type: 'dm',
        chatName: 'Alice',
        senderName: 'Alice',
        timestamp: 'now',
        text: 'First thread message',
        reactions: [],
      },
      {
        id: 'dm-1-2',
        channelKey: 'dm:1',
        type: 'dm',
        chatName: 'Alice',
        senderName: 'Alice',
        timestamp: 'now',
        text: 'Second thread message',
        reactions: [],
      },
    ])
  })

  renderWithStore(store)
  await user.click(screen.getByText('First thread message'))

  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText('First thread message')).toBeInTheDocument()

  act(() => {
    store.set(notificationFocusAtom, { itemId: 'dm-1-2', channelKey: 'dm:1' })
  })

  await waitFor(() => {
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByText('Second thread message')).toBeInTheDocument()
  })
})
