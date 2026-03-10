import { describe, expect, test, vi } from 'vitest'

vi.mock('telegram', () => ({
  TelegramClient: class TelegramClient {},
}))

vi.mock('telegram/sessions', () => ({
  StringSession: class StringSession {},
}))

import { ensureClientConnected } from './telegramClient'

describe('ensureClientConnected', () => {
  test('starts separate connection attempts for different clients', async () => {
    let releaseFirstClient: (() => void) | null = null
    const firstClient = {
      connected: false,
      disconnected: true,
      connect: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            releaseFirstClient = resolve
          }),
      ),
    }
    const secondClient = {
      connected: false,
      disconnected: true,
      connect: vi.fn().mockResolvedValue(undefined),
    }
    const logger = { info: vi.fn() }

    const firstConnect = ensureClientConnected(firstClient as never, logger)
    const secondConnect = ensureClientConnected(secondClient as never, logger)

    await Promise.resolve()

    expect(firstClient.connect).toHaveBeenCalledTimes(1)
    expect(secondClient.connect).toHaveBeenCalledTimes(1)

    releaseFirstClient?.()
    await Promise.all([firstConnect, secondConnect])
  })
})
