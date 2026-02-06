import { useEffect, useMemo, useState } from 'react'
import type { AuthClient, QrLoginResult, QrLoginToken } from '../model/authTypes'
import { createMockAuth } from '../model/mockAuth'

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

	function getToggleClass(mode: LoginMode) {
		let className = 'button'
		if (loginMode === mode) {
			className += ' button-primary'
		} else {
			className += ' button-ghost'
		}
		return className
	}

	function renderPhoneFields() {
		return (
			<>
				<div className="login-field">
					<label htmlFor="login-phone">Phone</label>
					<input
						id="login-phone"
						name="phone"
						type="tel"
						placeholder="+1 202 555 0118"
						value={phone}
						onChange={(event) => setPhone(event.target.value)}
					/>
				</div>
				<button
					className="button button-primary"
					type="button"
					onClick={handleSendCode}
					disabled={phone.trim() === '' || isSending}
				>
					{isSending ? 'Sending...' : 'Send code'}
				</button>
				{codeSent && (
					<>
						<div className="login-field">
							<label htmlFor="login-code">Code</label>
							<input
								id="login-code"
								name="code"
								type="text"
								inputMode="numeric"
								placeholder="12345"
								value={code}
								onChange={(event) => setCode(event.target.value)}
							/>
						</div>
						<div className="login-actions">
							<button
								className="button"
								type="button"
								onClick={handleSubmitCode}
								disabled={isSubmittingCode || code.trim() === ''}
							>
								{isSubmittingCode ? 'Submitting...' : 'Submit code'}
							</button>
							<button
								className="button button-ghost"
								type="button"
								onClick={resetFlow}
							>
								Reset
							</button>
						</div>
					</>
				)}
			</>
		)
	}

	function renderQrFields() {
		const expiresAt = qrToken ? qrToken.expires * 1000 : null
		const isExpired = expiresAt ? Date.now() > expiresAt : false

		return (
			<div className="login-qr">
				{qrStatus === 'loading' && <p>Preparing QR code...</p>}
				{qrToken && (
					<>
						<div className="login-qr-image">
							<img src={qrToken.qrImageUrl} alt="Telegram QR login" />
						</div>
						<div className="login-qr-meta">
							<p>
								Scan with Telegram mobile. Keep the app open while it logs
								in.
							</p>
							{isExpired && <p className="login-hint">QR expired. Refresh.</p>}
						</div>
					</>
				)}
			<div className="login-actions">
				<button
					className="button"
					type="button"
					onClick={handleRefreshQr}
					disabled={qrStatus === 'loading'}
				>
					Refresh QR
				</button>
					<button
						className="button button-ghost"
						type="button"
						onClick={resetFlow}
					>
						Reset
					</button>
				</div>
				{qrError !== '' && <p className="login-error">{qrError}</p>}
			</div>
		)
	}

	return (
		<div className="login-shell">
			<div className="login-card">
				<header className="login-header">
					<p className="login-eyebrow">Telegram Feed</p>
					<h1>Sign in to keep the river moving.</h1>
					<p className="login-subtitle">
						Phone or QR login. We never auto-load media or autoplay video.
					</p>
				</header>
				<form className="login-form" onSubmit={(event) => event.preventDefault()}>
					<div className="login-toggle">
						<button
							className={getToggleClass('phone')}
							type="button"
							onClick={() => handleModeChange('phone')}
						>
							Phone
						</button>
						<button
							className={getToggleClass('qr')}
							type="button"
							onClick={() => handleModeChange('qr')}
						>
							QR Code
						</button>
					</div>
					{loginMode === 'phone' && renderPhoneFields()}
					{loginMode === 'qr' && renderQrFields()}
					{needsTwoFactor && (
						<>
							<div className="login-field">
								<label htmlFor="login-password">Password</label>
								<input
									id="login-password"
									name="password"
									type="password"
									placeholder="2FA password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
								/>
								{passwordHint !== '' && (
									<p className="login-hint">Hint: {passwordHint}</p>
								)}
							</div>
							<button
								className="button"
								type="button"
								onClick={handleSubmitPassword}
								disabled={isSubmittingPassword || password.trim() === ''}
							>
								{isSubmittingPassword ? 'Submitting...' : 'Submit password'}
							</button>
						</>
					)}
					{error !== '' && <p className="login-error">{error}</p>}
				</form>
			</div>
			<div className="login-panel">
				<div>
					<h2>One feed, every channel.</h2>
					<p>
						The login is the only gate. Once you are in, the feed stays fast,
						chronological, and intentionally quiet.
					</p>
				</div>
				<div className="login-panel-footer">
					<span>Client-side only</span>
					<span>System theme</span>
					<span>Greyscale media</span>
				</div>
			</div>
		</div>
	)
}
