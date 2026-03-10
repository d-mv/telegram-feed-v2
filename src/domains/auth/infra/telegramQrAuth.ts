import { Api, TelegramClient } from 'telegram'
import type { StringSession } from 'telegram/sessions'
import type { AuthClient, QrLoginResult } from '../model/authTypes'
import type { TelegramAuthConfig } from './telegramAuth.types'
import {
  buildQrToken,
  createLoginSuccessHandler,
  getPasswordHint,
  getTelegramErrorMessage,
} from './telegramAuth.utils'

export function createQrAuth(
  client: TelegramClient,
  session: StringSession,
  config: TelegramAuthConfig,
  ensureConnected: () => Promise<void>,
): Pick<AuthClient, 'requestQrLogin' | 'checkQrLogin'> {
  const logger = config.logger ?? console
  const handleLoginSuccess = createLoginSuccessHandler(session, config, logger)
  let currentQrToken: Uint8Array | null = null

  async function handleExportLoginTokenResult(result: unknown): Promise<QrLoginResult> {
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
      return handleLoginSuccess()
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
        return handleLoginSuccess()
      }
      throw new Error(`Unexpected QR result ${migrated.className}`)
    }

    throw new Error('Unexpected QR login result')
  }

  async function handleQrError(error: unknown) {
    const errorMessage = getTelegramErrorMessage(error, '')
    if (errorMessage.toUpperCase() === 'SESSION_PASSWORD_NEEDED') {
      const hint = await getPasswordHint(client, logger)
      return { status: 'needs_2fa', hint } as const
    }
    return null
  }

  return {
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
        const handled = await handleQrError(error)
        if (handled) {
          return handled
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
              for (let index = 0; index < currentQrToken.length; index += 1) {
                if (currentQrToken[index] !== result.token[index]) {
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
        const handled = await handleQrError(error)
        if (handled) {
          return handled
        }
        logger.error('[TelegramAuth] check QR login failed', error)
        throw error
      }
    },
  }
}

