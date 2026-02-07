import clsx from 'clsx'
import type { PropsWithChildren } from 'react'
import styles from './Header.module.css'

type Props = {
  timestamp: string
  className: string
}

export function Header({
  children,
  timestamp,
  className,
}: PropsWithChildren<Props>) {
  return (
    <div className={clsx(styles.container, className)}>
      <h2 className={styles.header}>{children}</h2>
      <span className={styles.timestamp}>{timestamp}</span>
    </div>
  )
}
