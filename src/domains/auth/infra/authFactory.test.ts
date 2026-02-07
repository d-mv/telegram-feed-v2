import { vi } from 'vitest'
import { createAuthFromEnv } from './authFactory'

vi.mock('./telegramAuth', () => ({
  createTelegramAuth: vi.fn(() => ({
    sendCode: vi.fn(),
    submitCode: vi.fn(),
    submitPassword: vi.fn(),
    requestQrLogin: vi.fn(),
    checkQrLogin: vi.fn(),
  })),
}))

const { createTelegramAuth } = await import('./telegramAuth')

test('creates telegram auth from env', () => {
  const env = {
    VITE_TELEGRAM_API_ID: '123',
    VITE_TELEGRAM_API_HASH: 'hash',
  } as ImportMetaEnv

  createAuthFromEnv(env)

  expect(createTelegramAuth).toHaveBeenCalledWith({
    apiId: 123,
    apiHash: 'hash',
  })
})

test('throws when env vars missing', () => {
  const env = {} as ImportMetaEnv

  expect(() => createAuthFromEnv(env)).toThrow(/missing telegram env/i)
})
