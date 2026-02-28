import { Api, TelegramClient } from 'telegram'
import { computeCheck } from 'telegram/Password'
import { StringSession } from 'telegram/sessions'
import type {
  AuthClient,
  QrLoginResult,
  QrLoginToken,
} from '../model/authTypes'

type TelegramAuthConfig = {
  apiId: number
  apiHash: string
  session?: string
  logger?: Pick<Console, 'info' | 'warn' | 'error'>
  onSession?: (session: string) => void
}

let sharedClient: TelegramClient | null = null
let connectPromise: Promise<void> | null = null
let connected = false

export function createTelegramAuth(config: TelegramAuthConfig): AuthClient {
  const logger = config.logger ?? console
  const session = new StringSession(config.session ?? '')
  const client = new TelegramClient(session, config.apiId, config.apiHash, {
    connectionRetries: 5,
  })
  sharedClient = client
  connected = false
  connectPromise = null

  let phoneNumber = ''
  let phoneCodeHash = ''
  let passwordHint = ''
  let currentQrToken: Uint8Array | null = null

  function getLogoutToken() {
    return 'telegram-feed'
  }

  function toBase64Url(bytes: Uint8Array) {
    let binary = ''
    for (const value of bytes) {
      binary += String.fromCharCode(value)
    }
    const base64 = btoa(binary)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  }

  function buildQrToken(token: Uint8Array, expires: number): QrLoginToken {
    const loginUrl = `tg://login?token=${toBase64Url(token)}`
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
      loginUrl,
    )}`

    return { token, expires, loginUrl, qrImageUrl }
  }

  async function getPasswordHint(): Promise<string> {
    try {
      const pwd = await client.invoke(new Api.account.GetPassword())
      if (typeof pwd.hint === 'string') {
        return pwd.hint
      }
    } catch (error) {
      logger.error('[TelegramAuth] failed to fetch 2fa hint', error)
    }

    return ''
  }

  async function handleLoginTokenSuccess(): Promise<QrLoginResult> {
    logger.info('[TelegramAuth] logged in')
    config.onSession?.(session.save())
    return { status: 'logged_in' }
  }

  async function handleExportLoginTokenResult(
    result: unknown,
  ): Promise<QrLoginResult> {
    if (result instanceof Api.auth.LoginToken) {
      currentQrToken = result.token
      return {
        status: 'token',
        token: buildQrToken(result.token, result.expires),
      }
    }

    if (
      result instanceof Api.auth.LoginTokenSuccess &&
      result.authorization instanceof Api.auth.Authorization
    ) {
      return handleLoginTokenSuccess()
    }

    if (result instanceof Api.auth.LoginTokenMigrateTo) {
      const switcher = client as TelegramClient & {
        _switchDC: (dcId: number) => Promise<void> | void
      }
      await switcher._switchDC(result.dcId)
      const migrated = await client.invoke(
        new Api.auth.ImportLoginToken({ token: result.token }),
      )
      if (
        migrated instanceof Api.auth.LoginTokenSuccess &&
        migrated.authorization instanceof Api.auth.Authorization
      ) {
        return handleLoginTokenSuccess()
      }
      throw new Error(`Unexpected QR result ${migrated.className}`)
    }

    throw new Error('Unexpected QR login result')
  }

  function startConnect() {
    if (!connectPromise) {
      logger.info('[TelegramAuth] connecting client')
      connectPromise = client
        .connect()
        .then(() => {
          connected = true
        })
        .catch((error) => {
          connectPromise = null
          throw error
        })
    }
    return connectPromise
  }

  async function ensureConnected() {
    if (connected) {
      return
    }
    await startConnect()
  }

  return {
    async sendCode(phone: string) {
      await ensureConnected()
      logger.info('[TelegramAuth] sending code')
      phoneNumber = phone
      try {
        const result = await client.invoke(
          new Api.auth.SendCode({
            phoneNumber,
            apiId: config.apiId,
            apiHash: config.apiHash,
            settings: new Api.CodeSettings({
              currentNumber: true,
              allowAppHash: true,
              allowMissedCall: true,
              logoutTokens: [getLogoutToken()],
            }),
          }),
        )
        const sentCode = result as Api.auth.SentCode
        phoneCodeHash = sentCode.phoneCodeHash
        logger.info('[TelegramAuth] sent code type', sentCode.type?.className)
        if (sentCode.nextType) {
          logger.info(
            '[TelegramAuth] next code type',
            sentCode.nextType.className,
          )
        }
        return { ok: true }
      } catch (error) {
        logger.error('[TelegramAuth] send code failed', error)
        const message =
          typeof error === 'object' && error && 'errorMessage' in error
            ? String((error as { errorMessage?: string }).errorMessage)
            : error instanceof Error
              ? error.message
              : 'Failed to send code'
        throw new Error(message)
      }
    },
    async submitCode(code: string) {
      await ensureConnected()
      logger.info('[TelegramAuth] submitting code')
      if (!phoneNumber || !phoneCodeHash) {
        throw new Error('Missing phone code hash. Send code first.')
      }
      try {
        await client.invoke(
          new Api.auth.SignIn({
            phoneNumber,
            phoneCodeHash,
            phoneCode: code,
          }),
        )
        logger.info('[TelegramAuth] logged in')
        config.onSession?.(session.save())
        return { status: 'logged_in' }
      } catch (error) {
        const errorMessage =
          typeof error === 'object' && error && 'errorMessage' in error
            ? String((error as { errorMessage?: string }).errorMessage)
            : ''
        if (errorMessage.toUpperCase() === 'SESSION_PASSWORD_NEEDED') {
          logger.info('[TelegramAuth] 2fa required')
          try {
            const pwd = await client.invoke(new Api.account.GetPassword())
            passwordHint = typeof pwd.hint === 'string' ? pwd.hint : ''
            if (passwordHint) {
              logger.info('[TelegramAuth] 2fa hint received')
            }
          } catch (hintError) {
            logger.error('[TelegramAuth] failed to fetch 2fa hint', hintError)
          }
          return { status: 'needs_2fa', hint: passwordHint }
        }
        logger.error('[TelegramAuth] submit code failed', error)
        const message =
          errorMessage ||
          (error instanceof Error ? error.message : 'Failed to submit code')
        throw new Error(message)
      }
    },
    async submitPassword(password: string) {
      await ensureConnected()
      logger.info('[TelegramAuth] submitting password')
      try {
        const pwd = await client.invoke(new Api.account.GetPassword())
        const check = await computeCheck(pwd, password)
        await client.invoke(new Api.auth.CheckPassword({ password: check }))
        logger.info('[TelegramAuth] logged in')
        config.onSession?.(session.save())
        return { status: 'logged_in' }
      } catch (error) {
        logger.error('[TelegramAuth] submit password failed', error)
        const message =
          typeof error === 'object' && error && 'errorMessage' in error
            ? String((error as { errorMessage?: string }).errorMessage)
            : error instanceof Error
              ? error.message
              : 'Failed to submit password'
        throw new Error(message)
      }
    },
    async requestQrLogin() {
      await ensureConnected()
      logger.info('[TelegramAuth] exporting QR token')
      try {
        const result = await client.invoke(
          new Api.auth.ExportLoginToken({
            apiId: config.apiId,
            apiHash: config.apiHash,
            exceptIds: [],
          }),
        )
        return await handleExportLoginTokenResult(result)
      } catch (error) {
        let errorMessage = ''
        if (typeof error === 'object' && error && 'errorMessage' in error) {
          errorMessage = String(
            (error as { errorMessage?: string }).errorMessage,
          )
        }
        if (errorMessage.toUpperCase() === 'SESSION_PASSWORD_NEEDED') {
          const hint = await getPasswordHint()
          return { status: 'needs_2fa', hint }
        }
        logger.error('[TelegramAuth] export QR token failed', error)
        throw error
      }
    },
    async checkQrLogin() {
      await ensureConnected()
      try {
        const result = await client.invoke(
          new Api.auth.ExportLoginToken({
            apiId: config.apiId,
            apiHash: config.apiHash,
            exceptIds: [],
          }),
        )
        if (result instanceof Api.auth.LoginToken) {
          const next = buildQrToken(result.token, result.expires)
          if (currentQrToken) {
            let isSame = currentQrToken.length === result.token.length
            if (isSame) {
              for (let i = 0; i < currentQrToken.length; i += 1) {
                if (currentQrToken[i] !== result.token[i]) {
                  isSame = false
                  break
                }
              }
            }
            if (isSame) {
              return { status: 'pending' }
            }
          }
          currentQrToken = result.token
          return { status: 'token', token: next }
        }
        return await handleExportLoginTokenResult(result)
      } catch (error) {
        let errorMessage = ''
        if (typeof error === 'object' && error && 'errorMessage' in error) {
          errorMessage = String(
            (error as { errorMessage?: string }).errorMessage,
          )
        }
        if (errorMessage.toUpperCase() === 'SESSION_PASSWORD_NEEDED') {
          const hint = await getPasswordHint()
          return { status: 'needs_2fa', hint }
        }
        logger.error('[TelegramAuth] check QR login failed', error)
        throw error
      }
    },
  }
}

export async function ensureTelegramConnected(): Promise<TelegramClient> {
  const client = getTelegramClient()
  if (connectPromise) {
    await connectPromise
    return client
  }
  connectPromise = client
    .connect()
    .then(() => {
      connected = true
    })
    .catch((error) => {
      connectPromise = null
      throw error
    })
  await connectPromise
  return client
}

export function getTelegramClient(): TelegramClient {
  if (!sharedClient) {
    throw new Error('Telegram client not initialized')
  }
  return sharedClient
}
