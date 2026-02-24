import { render, screen } from '@testing-library/react'
import type { FeedItem } from '../model/mockFeed'
import { FeedView } from './FeedView'

const defaultProps = {
  notificationSettings: {},
  hasEnabledNotifications: false,
  notificationPermission: 'default' as NotificationPermission,
  onToggleChannelNotification: () => {},
  onRequestNotificationPermission: () => {},
  onDisableNotifications: () => {},
}

test('renders feed placeholder', () => {
  render(<FeedView {...defaultProps} />)

  expect(
    screen.getByRole('heading', { name: /your feed is ready/i }),
  ).toBeInTheDocument()
})

test('updates visible messages when items prop changes', () => {
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

  const { rerender } = render(<FeedView {...defaultProps} items={first} />)
  expect(screen.getByText('First message')).toBeInTheDocument()

  rerender(<FeedView {...defaultProps} items={second} />)
  expect(screen.getByText('Second message')).toBeInTheDocument()
})
