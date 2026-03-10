import type { AuthClient } from '../model/authTypes'
import { ensureClientConnected, initializeTelegramClient } from './telegramClient'
import { createPhoneAuth } from './telegramPhoneAuth'
import { createQrAuth } from './telegramQrAuth'
import type { TelegramAuthConfig } from './telegramAuth.types'

export function createTelegramAuth(config: TelegramAuthConfig): AuthClient {
  const logger = config.logger ?? console
  const { client, session } = initializeTelegramClient(config)

  const ensureConnected = () => ensureClientConnected(client, logger)
  const phoneAuth = createPhoneAuth(client, session, config, ensureConnected)
  const qrAuth = createQrAuth(client, session, config, ensureConnected)

  return {
    ...phoneAuth,
    ...qrAuth,
    ensureTelegramConnected: async () => {
      await ensureConnected()
      return client
    },
  }
}
