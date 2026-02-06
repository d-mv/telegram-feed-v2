import type { ButtonHTMLAttributes } from 'react'
import styles from './Button.module.css'

type ButtonVariant = 'default' | 'primary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant
}

export function Button({ variant = 'default', className, ...props }: ButtonProps) {
	const classNames = [styles.button]
	if (variant === 'primary') {
		classNames.push(styles.primary)
	}
	if (variant === 'ghost') {
		classNames.push(styles.ghost)
	}
	if (className) {
		classNames.push(className)
	}

	return <button {...props} className={classNames.join(' ')} />
}
