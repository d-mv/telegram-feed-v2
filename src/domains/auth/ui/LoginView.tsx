import { useMemo, useState } from 'react'
import type { AuthClient } from '../model/authTypes'
import { createMockAuth } from '../model/mockAuth'

type LoginViewProps = {
  auth?: AuthClient
  onAuthenticated?: () => void
}

export function LoginView({ auth, onAuthenticated }: LoginViewProps) {
  const [codeSent, setCodeSent] = useState(false)
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false)
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isSubmittingCode, setIsSubmittingCode] = useState(false)
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [error, setError] = useState('')

  const fallbackAuth = useMemo(() => createMockAuth(), [])
  const authClient = auth ?? fallbackAuth

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

  function handleReset() {
    setCodeSent(false)
    setNeedsTwoFactor(false)
    setCode('')
    setPassword('')
    setError('')
    setIsSending(false)
    setIsSubmittingCode(false)
    setIsSubmittingPassword(false)
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <header className="login-header">
          <p className="login-eyebrow">Telegram Feed</p>
          <h1>Sign in to keep the river moving.</h1>
          <p className="login-subtitle">
            Phone login only. We never auto-load media or autoplay video.
          </p>
        </header>
        <form className="login-form">
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
                <button className="button button-ghost" type="button" onClick={handleReset}>
                  Reset
                </button>
              </div>
            </>
          )}
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
