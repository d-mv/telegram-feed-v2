import type { PropsWithChildren } from 'react'
import type { FeedItem } from '../../../types'
import { linkifyText } from './linkify'
import { renderTelegramText } from './renderTelegramText'

type Props = {
  className?: string
  sourceMessage?: FeedItem['sourceMessage']
}

export function Text({ children, className, sourceMessage }: PropsWithChildren<Props>) {
  if (!children) return null

  if (typeof children !== 'string') {
    return <p className={className} style={{ margin: 0 }}>{children}</p>
  }

  const telegramEntities =
    sourceMessage &&
    typeof sourceMessage === 'object' &&
    'entities' in sourceMessage
      ? sourceMessage.entities
      : undefined
  const renderedTelegramText = renderTelegramText(children, telegramEntities)
  if (renderedTelegramText) {
    const hasPreBlock = Array.isArray(telegramEntities)
      && telegramEntities.some(
        (entity) => entity && typeof entity === 'object' && 'className' in entity && entity.className === 'MessageEntityPre',
      )
    if (hasPreBlock) {
      return <div className={className} style={{ margin: 0 }}>{renderedTelegramText}</div>
    }
    return <p className={className} style={{ margin: 0 }}>{renderedTelegramText}</p>
  }

  const segments = linkifyText(children)

  return (
    <p className={className} style={{ margin: 0 }}>
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
