import type { AuthClient } from '../model/authTypes'
import { getTelegramAuthEnv } from './authEnv'
import { createTelegramAuth } from './telegramAuth'

type AuthOptions = {
  session?: string
  onSession?: (session: string) => void
}

export function createAuthFromEnv(
  env: ImportMetaEnv = import.meta.env,
  options: AuthOptions = {},
): AuthClient {
  const { apiId, apiHash } = getTelegramAuthEnv(env)

  return createTelegramAuth({
    apiId,
    apiHash,
    session: options.session,
    onSession: options.onSession,
  })
}
