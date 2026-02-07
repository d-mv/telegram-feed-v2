import { Button } from '../../../shared/ui/Button/Button'
import styles from './LoginView.module.css'

type PhoneLoginFieldsProps = {
  phone: string
  code: string
  codeSent: boolean
  isSending: boolean
  isSubmittingCode: boolean
  onPhoneChange: (value: string) => void
  onCodeChange: (value: string) => void
  onSendCode: () => void
  onSubmitCode: () => void
  onReset: () => void
}

export function PhoneLoginFields({
  phone,
  code,
  codeSent,
  isSending,
  isSubmittingCode,
  onPhoneChange,
  onCodeChange,
  onSendCode,
  onSubmitCode,
  onReset,
}: PhoneLoginFieldsProps) {
  return (
    <>
      <div className={styles.loginField}>
        <label className={styles.loginLabel} htmlFor="login-phone">
          Phone
        </label>
        <input
          id="login-phone"
          name="phone"
          type="tel"
          placeholder="+1 202 555 0118"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          className={styles.loginInput}
        />
      </div>
      <Button
        type="button"
        variant="primary"
        onClick={onSendCode}
        disabled={phone.trim() === '' || isSending}
      >
        {isSending ? 'Sending...' : 'Send code'}
      </Button>
      {codeSent && (
        <>
          <div className={styles.loginField}>
            <label className={styles.loginLabel} htmlFor="login-code">
              Code
            </label>
            <input
              id="login-code"
              name="code"
              type="text"
              inputMode="numeric"
              placeholder="12345"
              value={code}
              onChange={(event) => onCodeChange(event.target.value)}
              className={styles.loginInput}
            />
          </div>
          <div className={styles.loginActions}>
            <Button
              type="button"
              onClick={onSubmitCode}
              disabled={isSubmittingCode || code.trim() === ''}
            >
              {isSubmittingCode ? 'Submitting...' : 'Submit code'}
            </Button>
            <Button type="button" variant="ghost" onClick={onReset}>
              Reset
            </Button>
          </div>
        </>
      )}
    </>
  )
}
