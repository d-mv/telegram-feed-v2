import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import type { TelegramAuthConfig } from './telegramAuth.types'

const connectPromises = new WeakMap<TelegramClient, Promise<unknown>>()

export function initializeTelegramClient(config: TelegramAuthConfig) {
  const session = new StringSession(config.session ?? '')
  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries: 5,
  })
  return { client, session }
}

export async function ensureClientConnected(
  client: TelegramClient,
  logger: Pick<Console, 'info'>,
) {
  if (client.connected && !client.disconnected) {
    return
  }
  const existingPromise = connectPromises.get(client)
  if (!existingPromise) {
    logger.info('[TelegramAuth] connecting client')
    const connectPromise = client.connect().finally(() => {
      connectPromises.delete(client)
    })
    connectPromises.set(client, connectPromise)
  }
  await connectPromises.get(client)
}
