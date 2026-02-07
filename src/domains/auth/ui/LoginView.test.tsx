import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { AuthClient } from '../model/authTypes'
import { LoginView } from './LoginView'

function createDeferred<T>() {
  let resolve: ((value: T) => void) | undefined
  let reject: ((reason?: unknown) => void) | undefined
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve
    reject = innerReject
  })
  if (!resolve || !reject) {
    throw new Error('Deferred not initialized')
  }
  return { promise, resolve, reject }
}

function createAuthMock(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    sendCode: vi.fn().mockResolvedValue({ ok: true }),
    submitCode: vi.fn().mockResolvedValue({ status: 'logged_in' }),
    submitPassword: vi.fn().mockResolvedValue({ status: 'logged_in' }),
    requestQrLogin: vi.fn().mockResolvedValue({ status: 'pending' }),
    checkQrLogin: vi.fn().mockResolvedValue({ status: 'pending' }),
    ...overrides,
  }
}

test('shows OTP input after sending code', async () => {
  const user = userEvent.setup()
  const auth = createAuthMock()

  render(<LoginView auth={auth} />)

  expect(screen.queryByLabelText(/code/i)).toBeNull()

  await user.type(screen.getByLabelText(/phone/i), '+123456789')
  await user.click(screen.getByRole('button', { name: /send code/i }))

  expect(screen.getByLabelText(/code/i)).toBeInTheDocument()
})

test('shows 2FA password only after submit when required', async () => {
  const user = userEvent.setup()
  const auth = createAuthMock({
    submitCode: vi.fn().mockResolvedValue({ status: 'needs_2fa' }),
  })

  render(<LoginView auth={auth} />)

  expect(screen.queryByLabelText(/password/i)).toBeNull()

  await user.type(screen.getByLabelText(/phone/i), '+123456789')
  await user.click(screen.getByRole('button', { name: /send code/i }))
  await user.type(screen.getByLabelText(/code/i), '12345')
  await user.click(screen.getByRole('button', { name: /submit code/i }))

  expect(await screen.findByLabelText(/password/i)).toBeInTheDocument()
})

test('disables send code when phone is empty', async () => {
  const user = userEvent.setup()
  const auth = createAuthMock()

  render(<LoginView auth={auth} />)

  const sendCodeButton = screen.getByRole('button', { name: /send code/i })
  expect(sendCodeButton).toBeDisabled()

  await user.type(screen.getByLabelText(/phone/i), '+123456789')
  expect(sendCodeButton).toBeEnabled()
})

test('reset hides OTP field', async () => {
  const user = userEvent.setup()
  const auth = createAuthMock()

  render(<LoginView auth={auth} />)

  await user.type(screen.getByLabelText(/phone/i), '+123456789')
  await user.click(screen.getByRole('button', { name: /send code/i }))

  expect(screen.getByLabelText(/code/i)).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: /reset/i }))

  expect(screen.queryByLabelText(/code/i)).toBeNull()
})

test('calls onAuthenticated after successful code submit', async () => {
  const user = userEvent.setup()
  const onAuthenticated = vi.fn()
  const auth = createAuthMock()

  render(<LoginView auth={auth} onAuthenticated={onAuthenticated} />)

  await user.type(screen.getByLabelText(/phone/i), '+123456789')
  await user.click(screen.getByRole('button', { name: /send code/i }))
  await user.type(screen.getByLabelText(/code/i), '12345')
  await user.click(screen.getByRole('button', { name: /submit code/i }))

  await waitFor(() => {
    expect(onAuthenticated).toHaveBeenCalledTimes(1)
  })
})

test('shows loading state while sending code', async () => {
  const user = userEvent.setup()
  const deferred = createDeferred<{ ok: true }>()
  const auth = createAuthMock({
    sendCode: vi.fn().mockReturnValue(deferred.promise),
  })

  render(<LoginView auth={auth} />)

  await user.type(screen.getByLabelText(/phone/i), '+123456789')
  await user.click(screen.getByRole('button', { name: /send code/i }))

  expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled()

  await act(async () => {
    deferred.resolve({ ok: true })
    await deferred.promise
  })
})

test('disables submit code when code is empty', async () => {
  const user = userEvent.setup()
  const auth = createAuthMock()

  render(<LoginView auth={auth} />)

  await user.type(screen.getByLabelText(/phone/i), '+123456789')
  await user.click(screen.getByRole('button', { name: /send code/i }))

  const submitCodeButton = screen.getByRole('button', { name: /submit code/i })
  expect(submitCodeButton).toBeDisabled()

  await user.type(screen.getByLabelText(/code/i), '12345')
  expect(submitCodeButton).toBeEnabled()
})

test('shows error when send code fails', async () => {
  const user = userEvent.setup()
  const auth = createAuthMock({
    sendCode: vi.fn().mockRejectedValue(new Error('Nope')),
  })

  render(<LoginView auth={auth} />)

  await user.type(screen.getByLabelText(/phone/i), '+123456789')
  await user.click(screen.getByRole('button', { name: /send code/i }))

  expect(await screen.findByText(/could not send code/i)).toBeInTheDocument()
})
