import clsx from 'clsx'
import type { PropsWithChildren } from 'react'
import { linkifyText } from './linkify'
import styles from './Text.module.css'

type Props = {
  className?: string
}

export function Text({ children, className }: PropsWithChildren<Props>) {
  if (!children) return null

  if (typeof children !== 'string') {
    return <p className={clsx(styles.container, className)}>{children}</p>
  }

  const segments = linkifyText(children)

  return (
    <p className={clsx(styles.container, className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={`text-${index}`}>{segment.value}</span>
        }

        return (
          <a
            key={`link-${index}`}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {segment.value}
          </a>
        )
      })}
    </p>
  )
}
