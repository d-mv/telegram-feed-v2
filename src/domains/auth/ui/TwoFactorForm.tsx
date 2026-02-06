import { Button } from '../../../ui/Button'
import styles from './LoginView.module.css'

type TwoFactorFormProps = {
	password: string
	hint: string
	isSubmitting: boolean
	onPasswordChange: (value: string) => void
	onSubmit: () => void
}

export function TwoFactorForm({
	password,
	hint,
	isSubmitting,
	onPasswordChange,
	onSubmit,
}: TwoFactorFormProps) {
	return (
		<>
			<div className={styles.loginField}>
				<label className={styles.loginLabel} htmlFor="login-password">
					Password
				</label>
				<input
					id="login-password"
					name="password"
					type="password"
					placeholder="2FA password"
					value={password}
					onChange={(event) => onPasswordChange(event.target.value)}
					className={styles.loginInput}
				/>
				{hint !== '' && <p className={styles.loginHint}>Hint: {hint}</p>}
			</div>
			<Button
				type="button"
				onClick={onSubmit}
				disabled={isSubmitting || password.trim() === ''}
			>
				{isSubmitting ? 'Submitting...' : 'Submit password'}
			</Button>
		</>
	)
}
