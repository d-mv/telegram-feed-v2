import { Provider } from 'jotai/react'
import { createStore } from 'jotai/vanilla'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { feedItemsAtom } from '../../../atoms/feedItems.atom'
import { feedFilterSettingsAtom } from '../../../atoms/feedFilters.atom'
import type { FeedItem } from '../model/mockFeed'
import { FeedView } from './FeedView'

function renderWithStore(store = createStore()) {
  return render(
    <Provider store={store}>
      <FeedView />
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
      <FeedView />
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

test('marks target message and all previous ones as read when video starts', async () => {
  const store = createStore()
  act(() => {
    store.set(feedItemsAtom, [
      {
        id: 'group-9-1',
        channelKey: 'group:9',
        type: 'group',
        chatName: 'Team',
        timestamp: 'now',
        text: 'First',
        isRead: false,
      },
      {
        id: 'group-9-2',
        channelKey: 'group:9',
        type: 'group',
        chatName: 'Team',
        timestamp: 'now',
        text: 'Second',
        isRead: false,
        media: {
          meta: {
            type: 'video',
            width: 640,
            height: 360,
            sizeBytes: 1024,
            mimeType: 'video/mp4',
          },
          url: 'https://example.com/preview.jpg',
          alt: 'video',
        },
      },
    ])
  })

  renderWithStore(store)

  expect(screen.getAllByLabelText('Unread message')).toHaveLength(2)
  const videos = screen.getAllByLabelText('Video media')
  fireEvent.play(videos[0] as HTMLVideoElement)

  await waitFor(() => {
    expect(screen.queryByLabelText('Unread message')).not.toBeInTheDocument()
  })
})

test('keeps other feeds unread when marking read in one feed', async () => {
  const store = createStore()
  act(() => {
    store.set(feedItemsAtom, [
      {
        id: 'group-1-1',
        channelKey: 'group:1',
        type: 'group',
        chatName: 'Feed A',
        timestamp: 'now',
        text: 'A1',
        isRead: false,
      },
      {
        id: 'group-2-1',
        channelKey: 'group:2',
        type: 'group',
        chatName: 'Feed B',
        timestamp: 'now',
        text: 'B1',
        isRead: false,
      },
      {
        id: 'group-1-2',
        channelKey: 'group:1',
        type: 'group',
        chatName: 'Feed A',
        timestamp: 'now',
        text: 'A2',
        isRead: false,
        media: {
          meta: {
            type: 'video',
            width: 640,
            height: 360,
            sizeBytes: 1024,
            mimeType: 'video/mp4',
          },
          url: 'https://example.com/preview.jpg',
          alt: 'video',
        },
      },
    ])
  })

  renderWithStore(store)

  expect(screen.getAllByLabelText('Unread message')).toHaveLength(3)
  const videos = screen.getAllByLabelText('Video media')
  fireEvent.play(videos[0] as HTMLVideoElement)

  await waitFor(() => {
    expect(screen.getByText('B1')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Unread message')).toHaveLength(1)
  })
})
