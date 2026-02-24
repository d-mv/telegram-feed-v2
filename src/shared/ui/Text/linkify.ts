export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string }

const LINK_PATTERN = /\b((?:https?:\/\/|www\.)[^\s]+)/gi

function splitTrailingPunctuation(value: string) {
  let link = value
  let trailing = ''

  while (link.length > 0 && /[.,!?;:]/.test(link.at(-1) ?? '')) {
    trailing = `${link.at(-1) ?? ''}${trailing}`
    link = link.slice(0, -1)
  }

  if (link.endsWith(')') && !link.includes('(')) {
    trailing = `)${trailing}`
    link = link.slice(0, -1)
  }

  return { link, trailing }
}

function toHref(value: string) {
  return value.startsWith('www.') ? `https://${value}` : value
}

export function linkifyText(value: string): TextSegment[] {
  const segments: TextSegment[] = []
  let lastIndex = 0
  LINK_PATTERN.lastIndex = 0

  for (const match of value.matchAll(LINK_PATTERN)) {
    const matchValue = match[0]
    const index = match.index ?? -1
    if (index < 0) continue

    if (index > lastIndex) {
      segments.push({ type: 'text', value: value.slice(lastIndex, index) })
    }

    const { link, trailing } = splitTrailingPunctuation(matchValue)
    if (link !== '') {
      segments.push({ type: 'link', value: link, href: toHref(link) })
    }
    if (trailing !== '') {
      segments.push({ type: 'text', value: trailing })
    }

    lastIndex = index + matchValue.length
  }

  if (lastIndex < value.length) {
    segments.push({ type: 'text', value: value.slice(lastIndex) })
  }

  return segments.length === 0 ? [{ type: 'text', value }] : segments
}
