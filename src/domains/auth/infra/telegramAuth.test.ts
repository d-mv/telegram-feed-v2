import { vi } from 'vitest'

let requireTwoFactor = false

const { FakeTelegramClient } = vi.hoisted(() => {
  class FakeTelegramClient {
    start = vi.fn(
      async (params: {
        phoneNumber: () => Promise<string>
        phoneCode: () => Promise<string>
        password: () => Promise<string>
        onError?: (error: unknown) => void
      }) => {
        try {
          await params.phoneNumber()
          await params.phoneCode()
          if (requireTwoFactor) {
            await params.password()
          }
        } catch (error) {
          params.onError?.(error)
        }
      },
    )
  }

  return { FakeTelegramClient }
})

vi.mock('telegram', () => ({
  TelegramClient: FakeTelegramClient,
}))

vi.mock('telegram/sessions', () => ({
  StringSession: class {},
}))

import { createTelegramAuth } from './telegramAuth'

test('submitCode returns logged_in when no 2fa required', async () => {
  requireTwoFactor = false
  const auth = createTelegramAuth({ apiId: 123, apiHash: 'hash' })

  await auth.sendCode('+123456789')
  const result = await auth.submitCode('12345')

  expect(result).toEqual({ status: 'logged_in' })
})

test('submitCode returns needs_2fa and submitPassword completes login', async () => {
  requireTwoFactor = true
  const auth = createTelegramAuth({ apiId: 123, apiHash: 'hash' })

  await auth.sendCode('+123456789')
  const result = await auth.submitCode('12345')

  expect(result).toEqual({ status: 'needs_2fa' })

  const passwordResult = await auth.submitPassword('password')
  expect(passwordResult).toEqual({ status: 'logged_in' })
})
