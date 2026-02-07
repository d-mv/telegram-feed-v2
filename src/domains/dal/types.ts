export type Dal = {
  getSession: () => Promise<unknown | undefined>
  setSession: (session: unknown) => Promise<void>
  getFeedCache: () => Promise<unknown | undefined>
  setFeedCache: (feed: unknown) => Promise<void>
  getSaved: () => Promise<unknown | undefined>
  setSaved: (saved: unknown) => Promise<void>
  getDrafts: () => Promise<unknown | undefined>
  setDrafts: (drafts: unknown) => Promise<void>
  getMedia: (key: string) => Promise<Blob | undefined>
  setMedia: (key: string, blob: Blob) => Promise<void>
  clearCache: () => Promise<void>
}
