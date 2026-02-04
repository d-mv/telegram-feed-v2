# Telegram Feed - Design

## Summary
A mobile-first web app that replaces the traditional chat list with a single, chronological “river of news.” The app is a pure client-side SPA with MTProto running in the browser. Authentication is via Telegram phone login and persists across refresh using IndexedDB. The UI is minimal, information-dense, and inspired by shadcn UI, implemented with CSS Modules. Light/dark theme follows system preference only. Images and video previews are greyscaled in the feed; videos do not auto-load or auto-play.

## Goals
- Provide a fast, chronological feed of messages across chats/groups/channels.
- Optimize for reading and quick actions (react, reply, save).
- Keep infrastructure minimal (no backend).
- Maintain mobile-first UX with a single-column layout.

## Non-Goals (v1)
- Search or filtering.
- Multi-column desktop layouts.
- Background sync or push notifications.
- Manual theme toggle.

## UX & Visual System
- **Layout**: Single feed view. No top-level navigation. A single floating action button opens a radial/stacked menu for navigation and settings.
- **Cards**: Compact, info-dense cards showing chat/sender, timestamp, message text, and inline media.
- **Actions**: React, reply (inline), save (bookmark).
- **Saved**: Accessible only from the action menu.
- **Themes**: System-driven light/dark via `prefers-color-scheme`. No manual toggle.
- **Style direction**: shadcn-inspired minimal UI, neutral surfaces, subtle borders, restrained shadows, compact typography.
- **Media**: All images in the feed are greyscaled. Videos do not auto-load or auto-play; their previews are also greyscaled.

## Architecture
- **Frontend-only SPA** with MTProto client in-browser.
- **Core modules**:
  - `auth`: phone/OTP login, session persistence.
  - `mtproto`: connection, updates, history fetch.
  - `dal`: thin storage interface.
  - `feed`: aggregation + ordering.
  - `ui`: components and interactions.

## Data Flow
- On login, `mtproto` connects and fetches history in batches.
- Updates are streamed into `feed` in chronological order (newest at top).
- UI consumes state via context selectors to keep re-renders localized.
- Actions:
  - React: optimistic update + MTProto call.
  - Reply: inline composer under the card + MTProto send.
  - Save: toggles a saved flag persisted to storage.

## Storage (DAL)
Thin interface to allow swapping backend later:
- `getSession` / `setSession`
- `getFeedCache` / `setFeedCache`
- `getSaved` / `setSaved`
- `getDrafts` / `setDrafts`

Initial implementation: IndexedDB (no heavy ORM). Later: backend-backed DAL with same interface.

## Tech Stack
- **Framework**: React + TypeScript
- **Build**: Vite
- **State**: React context + `use-context-selector` style memoization
- **Styling**: CSS Modules (no Tailwind)
- **Storage**: IndexedDB

## Deployment
- Static assets on a CDN (Vercel static/Cloudflare Pages/Netlify).
- Config via build-time env vars (Telegram app ID/hash).

## Risks & Tradeoffs
- MTProto credentials exposed in browser.
- Client-side session storage increases risk if device is compromised.
- No backend means no push notifications and limited background updates.
- Mobile browser background limitations affect real-time updates.

## Success Criteria
- User can login, refresh the page, and remain logged in.
- Feed loads messages chronologically from multiple chats.
- React, reply, and save work end-to-end.
- Media is always greyscaled; videos never auto-play.
- UI renders correctly in both light/dark system themes.
