import clsx from 'clsx'
import type { PropsWithChildren } from 'react'
import styles from './Text.module.css'

type Props = {
  className?: string
}

export function Text({ children, className }: PropsWithChildren<Props>) {
  if (!children) return null

  return <p className={clsx(styles.container, className)}>{children}</p>
}
