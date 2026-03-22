export type Dal = {
  getSession: () => Promise<unknown | undefined>
  setSession: (session: unknown) => Promise<void>
  getNotificationSettings: () => Promise<unknown | undefined>
  setNotificationSettings: (settings: unknown) => Promise<void>
  getFeedFilterSettings: () => Promise<unknown | undefined>
  setFeedFilterSettings: (settings: unknown) => Promise<void>
  getAvatarVisibilitySettings: () => Promise<unknown | undefined>
  setAvatarVisibilitySettings: (settings: unknown) => Promise<void>
  getFeedCache: () => Promise<unknown | undefined>
  setFeedCache: (feed: unknown) => Promise<void>
  getMedia: (key: string) => Promise<Blob | undefined>
  setMedia: (key: string, blob: Blob) => Promise<void>
  clearCache: () => Promise<void>
}
