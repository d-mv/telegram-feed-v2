import { Provider } from 'jotai/react'
import { createStore } from 'jotai/vanilla'
import { act, render, screen } from '@testing-library/react'
import { feedItemsAtom } from '../../../atoms/feedItems.atom'
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
