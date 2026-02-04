import { TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import type { AuthClient } from '../model/authTypes'

type TelegramAuthConfig = {
  apiId: number
  apiHash: string
  session?: string
}

export function createTelegramAuth(config: TelegramAuthConfig): AuthClient {
  const session = new StringSession(config.session ?? '')
  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries: 5,
  })

  let started = false
  let resolvePhone: ((value: string) => void) | undefined
  let resolveCode: ((value: string) => void) | undefined
  let resolvePassword: ((value: string) => void) | undefined
  let resolvePasswordRequested: (() => void) | undefined
  let resolveLoggedIn: (() => void) | undefined
  let rejectLoggedIn: ((error: unknown) => void) | undefined

  const phonePromise = new Promise<string>((resolve) => {
    resolvePhone = resolve
  })
  const codePromise = new Promise<string>((resolve) => {
    resolveCode = resolve
  })
  const passwordPromise = new Promise<string>((resolve) => {
    resolvePassword = resolve
  })
  const passwordRequested = new Promise<void>((resolve) => {
    resolvePasswordRequested = resolve
  })
  const loggedIn = new Promise<void>((resolve, reject) => {
    resolveLoggedIn = resolve
    rejectLoggedIn = reject
  })

  function ensureStart() {
    if (started) {
      return
    }
    started = true

    client
      .start({
        phoneNumber: async () => phonePromise,
        phoneCode: async () => codePromise,
        password: async () => {
          resolvePasswordRequested?.()
          return passwordPromise
        },
        onError: (error) => {
          rejectLoggedIn?.(error)
        },
      })
      .then(() => {
        resolveLoggedIn?.()
      })
      .catch((error) => {
        rejectLoggedIn?.(error)
      })
  }

  return {
    async sendCode(phone: string) {
      ensureStart()
      resolvePhone?.(phone)
      return { ok: true }
    },
    async submitCode(code: string) {
      ensureStart()
      resolveCode?.(code)
      const status = await Promise.race([
        loggedIn.then(() => 'logged_in' as const),
        passwordRequested.then(() => 'needs_2fa' as const),
      ])
      return { status }
    },
    async submitPassword(password: string) {
      ensureStart()
      resolvePassword?.(password)
      await loggedIn
      return { status: 'logged_in' }
    },
  }
}
