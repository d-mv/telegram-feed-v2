import userEvent from '@testing-library/user-event'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FeedItem } from '../../../types'
import { downloadMediaForItem, getCachedMediaUrl } from '../../../domains/feed/infra/telegramFeed'
import { Media } from './Media'

vi.mock('../../../domains/feed/infra/telegramFeed', () => ({
  downloadMediaForItem: vi.fn(),
  downloadThumbnailForItem: vi.fn().mockResolvedValue(undefined),
  getCachedMediaUrl: vi.fn().mockResolvedValue(undefined),
}))

describe('Media video controls', () => {
  it('uses a dedicated controls container class instead of the media root container class', async () => {
    vi.mocked(getCachedMediaUrl).mockResolvedValueOnce('blob:test')

    const item: FeedItem = {
      id: 'video-1',
      type: 'group',
      chatName: 'Test',
      timestamp: 'now',
      text: 'video',
      media: {
        meta: {
          type: 'video',
          width: 640,
          height: 360,
          sizeBytes: 1024,
        },
        url: 'https://example.com/poster.jpg',
        alt: 'preview',
      },
    }

    const { container } = render(<Media item={item} />)

    const mediaContainer = container.querySelector('[data-media-type="video"]')
    const playButton = await screen.findByRole('button', { name: 'Play' })
    const controlsContainer = playButton.parentElement

    expect(mediaContainer).toBeTruthy()
    expect(controlsContainer).toBeTruthy()
    expect(controlsContainer?.className).not.toBe(mediaContainer?.className)
  })

  it('updates video download progress when total is provided', async () => {
    let progressHandler: ((downloaded: number, total: number) => void) | undefined
    let resolveDownload: ((value: string | undefined) => void) | undefined

    vi.mocked(downloadMediaForItem).mockImplementationOnce((_, onProgress) => {
      progressHandler = onProgress
      return new Promise<string | undefined>((resolve) => {
        resolveDownload = resolve
      })
    })

    const item: FeedItem = {
      id: 'video-2',
      type: 'group',
      chatName: 'Test',
      timestamp: 'now',
      text: 'video',
      media: {
        meta: {
          type: 'video',
          width: 640,
          height: 360,
          sizeBytes: 1000,
        },
        url: 'https://example.com/poster.jpg',
        alt: 'preview',
      },
    }

    const user = userEvent.setup()
    render(<Media item={item} />)
    await user.click(screen.getByRole('button', { name: /download/i }))

    act(() => {
      progressHandler?.(500, 1000)
    })
    expect(await screen.findByText('50%')).toBeInTheDocument()
    await act(async () => {
      resolveDownload?.('blob:test')
    })
  })

  it('renders icon-only download button with accessible label', () => {
    const item: FeedItem = {
      id: 'video-3',
      type: 'group',
      chatName: 'Test',
      timestamp: 'now',
      text: 'video',
      media: {
        meta: {
          type: 'video',
          width: 640,
          height: 360,
          sizeBytes: 1000,
        },
        url: 'https://example.com/poster.jpg',
        alt: 'preview',
      },
    }

    render(<Media item={item} />)

    const button = screen.getByRole('button', { name: /download/i })
    expect(button).toBeInTheDocument()
    expect(button).not.toHaveTextContent(/download/i)
  })

  it('renders grayscale by default and allows full color when disabled', () => {
    const item: FeedItem = {
      id: 'image-1',
      type: 'group',
      chatName: 'Test',
      timestamp: 'now',
      text: 'image',
      media: {
        meta: {
          type: 'image',
          width: 640,
          height: 360,
          sizeBytes: 1000,
        },
        url: 'https://example.com/poster.jpg',
        alt: 'preview',
      },
    }

    const { container, rerender } = render(<Media item={item} />)
    expect((container.firstChild as HTMLElement).className).toMatch(/grayscale/)

    rerender(<Media item={item} grayscale={false} />)
    expect((container.firstChild as HTMLElement).className).not.toMatch(/grayscale/)
  })

  it('renders attachment card for non-image/video media', () => {
    const item: FeedItem = {
      id: 'file-1',
      type: 'group',
      chatName: 'Docs',
      timestamp: 'now',
      text: 'file',
      media: {
        meta: {
          type: 'file',
          width: 0,
          height: 0,
          sizeBytes: 2048,
          mimeType: 'application/pdf',
          fileName: 'spec.pdf',
        },
        alt: 'file',
      },
    }

    render(<Media item={item} />)

    expect(screen.getByText('spec.pdf')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()
    expect(document.querySelector('svg')).toBeTruthy()
  })

  it('renders named video documents as videos', async () => {
    vi.mocked(getCachedMediaUrl).mockResolvedValueOnce('blob:test')

    const item: FeedItem = {
      id: 'file-2',
      type: 'group',
      chatName: 'Docs',
      timestamp: 'now',
      text: 'file',
      media: {
        meta: {
          type: 'video',
          width: 640,
          height: 360,
          sizeBytes: 4096,
          mimeType: 'video/mp4',
          fileName: 'clip.mp4',
        },
        url: 'https://example.com/poster.jpg',
        alt: 'file',
      },
    }

    render(<Media item={item} />)

    expect(await screen.findByLabelText('Video media')).toBeInTheDocument()
    expect(screen.queryByText('clip.mp4')).not.toBeInTheDocument()
  })
})
