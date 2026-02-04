# Telegram Feed - Implementation Plan

## Scope
Implement a mobile-first, single-column Telegram “river of news” web app (SPA) with MTProto in-browser. Use React + TypeScript + Vite, CSS Modules, context selectors for state, IndexedDB DAL. Support system light/dark theme. Media in feed is greyscaled. Video does not auto-load or auto-play and previews are greyscaled. No search/filter, no backend.

## Assumptions
- MTProto runs fully in the browser (app ID/hash exposed).
- Session persists across refresh in IndexedDB.
- “Stateless” means no server-side storage.

## Milestones

1. **Scaffold + Base App**
- Create Vite React TS app.
- Set up CSS Modules and base layout.
- Add theme tokens and `prefers-color-scheme` support.
- Verification: app builds and renders a blank feed shell.

2. **DAL (IndexedDB) + Interfaces**
- Define thin DAL interface (session, feed cache, saved, drafts).
- Implement IndexedDB DAL.
- Verification: manual test via devtools console to set/get items.

3. **MTProto Client + Auth**
- Implement login flow (phone/OTP).
- Persist session via DAL.
- On reload, restore session and reconnect.
- Verification: login + refresh preserves session.

4. **Feed Model + Store**
- Normalize messages in store.
- Chronological ordering (newest at top).
- Fetch initial history + incremental updates.
- Persist feed cache in DAL.
- Verification: feed shows messages across multiple chats.

5. **UI Components**
- `FeedView`, `FeedItemCard`, `InlineReply`, `ActionMenu`, `SavedDrawer`.
- Context selectors to minimize re-renders.
- Verification: UI renders with mock data, menu works.

6. **Actions (React/Reply/Save)**
- React: optimistic update + MTProto call.
- Reply: inline composer + MTProto send.
- Save: toggle saved flag + DAL persistence.
- Verification: actions work end-to-end with real messages.

7. **Media Rules**
- Greyscale images and video previews in feed.
- Videos do not auto-load or auto-play.
- Verification: media displays with required behavior.

8. **Polish + QA Pass**
- Accessibility checks (focus states, contrast).
- Mobile-first layout and desktop max width.
- Verification: manual QA checklist pass.

## Risks
- MTProto credentials exposed in client.
- Browser background limitations may affect real-time updates.

## Done Criteria
- User can login, refresh, and stay logged in.
- Feed renders chronologically and updates in real-time.
- React/reply/save work reliably.
- Media greyscale + no autoplay enforced.
- Light/dark system themes render correctly.
