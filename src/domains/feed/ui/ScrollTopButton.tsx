import styles from './ScrollTopButton.module.css'

type ScrollTopButtonProps = {
	onClick: () => void
}

export function ScrollTopButton({ onClick }: ScrollTopButtonProps) {
	return (
		<button type="button" className={styles.button} onClick={onClick}>
			Up
		</button>
	)
}
