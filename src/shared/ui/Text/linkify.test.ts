import { describe, expect, it } from 'vitest'
import { linkifyText } from './linkify'

describe('linkifyText', () => {
  it('returns plain text segment when no links are present', () => {
    expect(linkifyText('hello world')).toEqual([{ type: 'text', value: 'hello world' }])
  })

  it('parses scheme links and keeps trailing punctuation', () => {
    expect(linkifyText('go to https://example.com/test.')).toEqual([
      { type: 'text', value: 'go to ' },
      { type: 'link', value: 'https://example.com/test', href: 'https://example.com/test' },
      { type: 'text', value: '.' },
    ])
  })

  it('parses www links and prefixes https for href', () => {
    expect(linkifyText('visit www.example.com now')).toEqual([
      { type: 'text', value: 'visit ' },
      { type: 'link', value: 'www.example.com', href: 'https://www.example.com' },
      { type: 'text', value: ' now' },
    ])
  })
})
