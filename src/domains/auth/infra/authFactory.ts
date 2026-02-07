import type { AuthClient } from '../model/authTypes'
import { createTelegramAuth } from './telegramAuth'

type AuthEnv = Pick<
  ImportMetaEnv,
  'VITE_TELEGRAM_API_ID' | 'VITE_TELEGRAM_API_HASH'
>

type AuthOptions = {
  session?: string
  onSession?: (session: string) => void
}

export function createAuthFromEnv(
  env: AuthEnv = import.meta.env,
  options: AuthOptions = {},
): AuthClient {
  const apiId = Number(env.VITE_TELEGRAM_API_ID)
  const apiHash = env.VITE_TELEGRAM_API_HASH

  if (!apiId || !apiHash) {
    throw new Error('Missing Telegram env vars')
  }

  return createTelegramAuth({
    apiId,
    apiHash,
    session: options.session,
    onSession: options.onSession,
  })
}
