import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { AuthClient } from './domains/auth/model/authTypes'
import App from './App'

test('renders login view', () => {
  const auth: AuthClient = {
    sendCode: vi.fn().mockResolvedValue({ ok: true }),
    submitCode: vi.fn().mockResolvedValue({ status: 'logged_in' }),
    submitPassword: vi.fn().mockResolvedValue({ status: 'logged_in' }),
  }

  render(<App auth={auth} />)

  expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
})

test('switches to feed after login', async () => {
  const user = userEvent.setup()
  const auth: AuthClient = {
    sendCode: vi.fn().mockResolvedValue({ ok: true }),
    submitCode: vi.fn().mockResolvedValue({ status: 'logged_in' }),
    submitPassword: vi.fn().mockResolvedValue({ status: 'logged_in' }),
  }

  render(<App auth={auth} />)

  await user.type(screen.getByLabelText(/phone/i), '+123456789')
  await user.click(screen.getByRole('button', { name: /send code/i }))
  await user.type(screen.getByLabelText(/code/i), '12345')
  await user.click(screen.getByRole('button', { name: /submit code/i }))

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /your feed is ready/i })).toBeInTheDocument()
  })
})
