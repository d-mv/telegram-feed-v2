import { Provider } from 'jotai/react'
import { createStore } from 'jotai/vanilla'
import { act, render, screen } from '@testing-library/react'
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
