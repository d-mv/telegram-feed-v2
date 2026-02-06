import { Button } from '../../../ui/Button'
import styles from './LoginView.module.css'

type LoginMode = 'phone' | 'qr'

type LoginToggleProps = {
	mode: LoginMode
	onChange: (mode: LoginMode) => void
}

export function LoginToggle({ mode, onChange }: LoginToggleProps) {
	return (
		<div className={styles.loginToggle}>
			<Button
				type="button"
				variant={mode === 'phone' ? 'primary' : 'ghost'}
				onClick={() => onChange('phone')}
			>
				Phone
			</Button>
			<Button
				type="button"
				variant={mode === 'qr' ? 'primary' : 'ghost'}
				onClick={() => onChange('qr')}
			>
				QR Code
			</Button>
		</div>
	)
}
