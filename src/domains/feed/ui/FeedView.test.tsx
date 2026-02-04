import { render, screen } from '@testing-library/react'
import { FeedView } from './FeedView'

test('renders feed placeholder', () => {
  render(<FeedView />)

  expect(
    screen.getByRole('heading', { name: /your feed is ready/i }),
  ).toBeInTheDocument()
})
