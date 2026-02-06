import { useEffect, useMemo, useState } from 'react'
import type { AuthClient, QrLoginResult, QrLoginToken } from '../model/authTypes'
import { createMockAuth } from '../model/mockAuth'
import styles from './LoginView.module.css'
import { LoginToggle } from './LoginToggle'
import { PhoneLoginFields } from './PhoneLoginFields'
import { QrLoginPanel } from './QrLoginPanel'
import { TwoFactorForm } from './TwoFactorForm'

type LoginMode = 'phone' | 'qr'

type LoginViewProps = {
	auth?: AuthClient
	onAuthenticated?: () => void
}

export function LoginView({ auth, onAuthenticated }: LoginViewProps) {
	const [loginMode, setLoginMode] = useState<LoginMode>('phone')
	const [codeSent, setCodeSent] = useState(false)
	const [needsTwoFactor, setNeedsTwoFactor] = useState(false)
	const [phone, setPhone] = useState('')
	const [code, setCode] = useState('')
	const [password, setPassword] = useState('')
	const [passwordHint, setPasswordHint] = useState('')
	const [isSending, setIsSending] = useState(false)
	const [isSubmittingCode, setIsSubmittingCode] = useState(false)
	const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
	const [error, setError] = useState('')
	const [qrToken, setQrToken] = useState<QrLoginToken | null>(null)
	const [qrStatus, setQrStatus] = useState<'idle' | 'loading' | 'waiting'>('idle')
	const [qrError, setQrError] = useState('')

	const fallbackAuth = useMemo(() => createMockAuth(), [])
	const authClient = auth ?? fallbackAuth

	function resetFlow() {
		setCodeSent(false)
		setNeedsTwoFactor(false)
		setCode('')
		setPassword('')
		setPasswordHint('')
		setError('')
		setIsSending(false)
		setIsSubmittingCode(false)
		setIsSubmittingPassword(false)
		setQrToken(null)
		setQrStatus('idle')
		setQrError('')
	}

	function handleModeChange(mode: LoginMode) {
		if (mode === loginMode) {
			return
		}
		setLoginMode(mode)
		resetFlow()
	}

	function handleQrResult(result: QrLoginResult) {
		if (result.status === 'logged_in') {
			onAuthenticated?.()
			return
		}
		if (result.status === 'needs_2fa') {
			setNeedsTwoFactor(true)
			setPasswordHint(result.hint ?? '')
			setQrToken(null)
			setQrStatus('idle')
			return
		}
		if (result.status === 'token') {
			setQrToken(result.token)
			setQrStatus('waiting')
			return
		}
		if (result.status === 'pending') {
			setQrStatus('waiting')
		}
	}

	async function startQrLogin(showError = true) {
		setQrError('')
		setQrStatus('loading')
		setQrToken(null)
		try {
			const result = await authClient.requestQrLogin()
			handleQrResult(result)
		} catch {
			if (showError) {
				setQrError('Could not start QR login. Please try again.')
			}
			setQrStatus('idle')
		}
	}

	async function handleRefreshQr() {
		setNeedsTwoFactor(false)
		setPassword('')
		setPasswordHint('')
		await startQrLogin()
	}

	useEffect(() => {
		if (loginMode !== 'qr') {
			return
		}

		let isActive = true
		let pollId: number | null = null

		startQrLogin(false)

		pollId = window.setInterval(async () => {
			try {
				const result = await authClient.checkQrLogin()
				if (isActive) {
					handleQrResult(result)
				}
			} catch {
				if (isActive) {
					setQrError('QR login failed. Please try again.')
				}
			}
		}, 3000)

		return () => {
			isActive = false
			if (pollId) {
				window.clearInterval(pollId)
			}
		}
	}, [authClient, loginMode])

	async function handleSendCode() {
		setError('')
		setIsSending(true)
		try {
			await authClient.sendCode(phone)
			setCodeSent(true)
		} catch {
			setError('Could not send code. Please try again.')
		} finally {
			setIsSending(false)
		}
	}

	async function handleSubmitCode() {
		setError('')
		setIsSubmittingCode(true)
		try {
			const result = await authClient.submitCode(code)
			if (result.status === 'needs_2fa') {
				setNeedsTwoFactor(true)
				setPasswordHint(result.hint ?? '')
				return
			}
			onAuthenticated?.()
		} catch {
			setError('Could not submit code. Please try again.')
		} finally {
			setIsSubmittingCode(false)
		}
	}

	async function handleSubmitPassword() {
		setError('')
		setIsSubmittingPassword(true)
		try {
			await authClient.submitPassword(password)
			onAuthenticated?.()
		} catch {
			setError('Could not submit password. Please try again.')
		} finally {
			setIsSubmittingPassword(false)
		}
	}

	const expiresAt = qrToken ? qrToken.expires * 1000 : null
	const isQrExpired = Boolean(expiresAt && Date.now() > expiresAt)

	return (
		<div className={styles.loginShell}>
			<div className={styles.loginCard}>
				<header className={styles.loginHeader}>
					<p className={styles.loginEyebrow}>Telegram Feed</p>
					<h1 className={styles.loginTitle}>Sign in to keep the river moving.</h1>
					<p className={styles.loginSubtitle}>
						Phone or QR login. We never auto-load media or autoplay video.
					</p>
				</header>
				<form className={styles.loginForm} onSubmit={(event) => event.preventDefault()}>
					<LoginToggle mode={loginMode} onChange={handleModeChange} />
					{loginMode === 'phone' && (
						<PhoneLoginFields
							phone={phone}
							code={code}
							codeSent={codeSent}
							isSending={isSending}
							isSubmittingCode={isSubmittingCode}
							onPhoneChange={setPhone}
							onCodeChange={setCode}
							onSendCode={handleSendCode}
							onSubmitCode={handleSubmitCode}
							onReset={resetFlow}
						/>
					)}
					{loginMode === 'qr' && (
						<QrLoginPanel
							status={qrStatus}
							token={qrToken}
							error={qrError}
							isExpired={isQrExpired}
							onRefresh={handleRefreshQr}
							onReset={resetFlow}
						/>
					)}
					{needsTwoFactor && (
						<TwoFactorForm
							password={password}
							hint={passwordHint}
							isSubmitting={isSubmittingPassword}
							onPasswordChange={setPassword}
							onSubmit={handleSubmitPassword}
						/>
					)}
					{error !== '' && <p className={styles.loginError}>{error}</p>}
				</form>
			</div>
			<div className={styles.loginPanel}>
				<div>
					<h2 className={styles.loginPanelTitle}>One feed, every channel.</h2>
					<p className={styles.loginPanelText}>
						The login is the only gate. Once you are in, the feed stays fast,
						chronological, and intentionally quiet.
					</p>
				</div>
				<div className={styles.loginPanelFooter}>
					<span>Client-side only</span>
					<span>System theme</span>
					<span>Greyscale media</span>
				</div>
			</div>
		</div>
	)
}
