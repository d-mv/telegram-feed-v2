# Storybook & screenshots

The real authenticated UI is gated behind Telegram login, so we render it in
isolation with mock data instead of a live session.

## How it works

- **Mock data**: `src/domains/feed/model/mockFeed.ts` — `getMockFeed()` and
  `getMockFeedBatch(n)` return `FeedItem[]` covering DMs, group posts, a poll,
  reactions, comment counts, single media and a multi-image group.
- **Mock shell**: `src/test/mockApp.tsx` — `MockAppProvider` replicates the
  app's antd theme (the tokens from `src/main.tsx`), hydrates the Jotai atoms
  (`feedItemsAtom`, `isLoadingFeedAtom`) with mock data, and supplies a fully
  stubbed `AppContext` (no-op handlers + a no-op `Dal`).
- **Stories**: `src/domains/feed/ui/FeedView.stories.tsx`.

## Commands

```bash
bun run storybook        # interactive dev server on :6006
bun run build-storybook  # static build -> storybook-static/
bun run screenshots      # build first, then writes PNGs -> screenshots/
```

`bun run screenshots` (`scripts/screenshots.mjs`) serves the static build and
drives Playwright (Chromium) over the story iframes. Edit the `shots` array in
that script to add viewports or stories.

> Note: the app theme hardcodes light base tokens for both the light and dark
> antd algorithms, so there is effectively a single visual theme — there is no
> separate dark screenshot.
