import { Api, TelegramClient } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { computeCheck } from 'telegram/Password'
import type { AuthClient } from '../model/authTypes'

type TelegramAuthConfig = {
	apiId: number
	apiHash: string
	session?: string
	logger?: Pick<Console, 'info' | 'warn' | 'error'>
}

export function createTelegramAuth(config: TelegramAuthConfig): AuthClient {
	const logger = config.logger ?? console
	const session = new StringSession(config.session ?? '')
	const client = new TelegramClient(session, config.apiId, config.apiHash, {
		connectionRetries: 5,
	})

	let connected = false
	let phoneNumber = ''
	let phoneCodeHash = ''
	let passwordHint = ''

	function getLogoutToken() {
		return 'telegram-feed'
	}

	async function ensureConnected() {
		if (connected) {
			return
		}
		logger.info('[TelegramAuth] connecting client')
		await client.connect()
		connected = true
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
				phoneCodeHash = result.phoneCodeHash
				logger.info('[TelegramAuth] sent code type', result.type?.className)
				if (result.nextType) {
					logger.info(
						'[TelegramAuth] next code type',
						result.nextType.className,
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
	}
}
