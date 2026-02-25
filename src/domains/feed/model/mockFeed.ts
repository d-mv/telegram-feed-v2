type MediaMeta = {
  type: 'image' | 'video'
  width: number
  height: number
  sizeBytes: number
  mimeType?: string
}

type MediaPreview = {
  meta: MediaMeta
  url?: string
  alt: string
  key?: string
}

type Reaction = {
  emoji: string
  count: number
}

export type FeedItem =
  | {
      id: string
      channelKey?: string
      type: 'dm'
      chatName: string
      senderName: string
      timestamp: string
      text: string
      media?: MediaPreview
      reactions: Reaction[]
      sourceMessage?: unknown
    }
  | {
      id: string
      channelKey?: string
      type: 'group'
      chatName: string
      timestamp: string
      text: string
      media?: MediaPreview
      sourceMessage?: unknown
    }

const baseMockFeed: FeedItem[] = [
  {
    id: 'dm-1',
    type: 'dm',
    chatName: 'Elena',
    senderName: 'Elena',
    timestamp: '2 min ago',
    text: 'Did you see the layout draft? I added a tighter card stack.',
    reactions: [
      { emoji: '👍', count: 2 },
      { emoji: '🔥', count: 1 },
    ],
    media: {
      meta: {
        type: 'image',
        width: 800,
        height: 500,
        sizeBytes: 280000,
      },
      url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80',
      alt: 'Forest',
    },
  },
  {
    id: 'group-1',
    type: 'group',
    chatName: 'Design Sync',
    timestamp: '12 min ago',
    text: 'New build is up. Please verify the dark theme contrast.',
  },
  {
    id: 'dm-2',
    type: 'dm',
    chatName: 'Vlad',
    senderName: 'Vlad',
    timestamp: '25 min ago',
    text: 'Let’s keep the feed minimal. I love the new typography.',
    reactions: [{ emoji: '✅', count: 3 }],
  },
  {
    id: 'group-2',
    type: 'group',
    chatName: 'Product Updates',
    timestamp: '1 hr ago',
    text: 'Shipping status: onboarding, login, and session persistence are done.',
    media: {
      meta: {
        type: 'video',
        width: 800,
        height: 500,
        sizeBytes: 920000,
        mimeType: 'video/mp4',
      },
      url: 'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=800&q=80',
      alt: 'Desk',
    },
  },
]

export function getMockFeed(): FeedItem[] {
  return baseMockFeed
}

export function getMockFeedBatch(count: number): FeedItem[] {
  const result: FeedItem[] = []
  for (let index = 0; index < count; index += 1) {
    const seed = baseMockFeed[index % baseMockFeed.length]
    const suffix = count - index
    if (seed.type === 'dm') {
      result.push({
        ...seed,
        id: `${seed.id}-${suffix}`,
        timestamp: `${suffix * 3} min ago`,
        text: `${seed.text} (#${suffix})`,
      })
    } else {
      result.push({
        ...seed,
        id: `${seed.id}-${suffix}`,
        timestamp: `${suffix * 4} min ago`,
        text: `${seed.text} (#${suffix})`,
      })
    }
  }
  return result.reverse()
}

let liveCounter = 0

export function getMockLiveItem(): FeedItem {
  liveCounter += 1
  const seed = baseMockFeed[liveCounter % baseMockFeed.length]
  if (seed.type === 'dm') {
    return {
      ...seed,
      id: `live-dm-${liveCounter}`,
      timestamp: 'Just now',
      text: `${seed.text} (live #${liveCounter})`,
    }
  }
  return {
    ...seed,
    id: `live-group-${liveCounter}`,
    timestamp: 'Just now',
    text: `${seed.text} (live #${liveCounter})`,
  }
}
