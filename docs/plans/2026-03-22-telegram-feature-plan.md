# Telegram Feed Feature Plan

## Scope

Active product tasks:

1. Support for formatting
2. Add search for channels
3. Join channel
4. Open local/deep link
5. Support for forwarded messages

Deferred product tasks:

1. How we can optimize?
2. Move TG to backend

## Assumptions

- The app remains frontend-only and continues using the browser Telegram client.
- We should reuse existing feed, thread, notification focus, and channel state instead of introducing a second navigation model.
- Shared infrastructure is acceptable when it directly reduces duplication across search, join, forwarded-source opening, and deep-link handling.
- "One task at a time" means one Kairos top-level task is completed, verified, committed, pushed, and closed before moving to the next.

## Delivery Order

1. Open local/deep link
   verify: local and Telegram links resolve to the expected app target or unsupported-link toast
2. Support for forwarded messages
   verify: forwarded metadata renders in feed and thread, anonymous forwarding is handled, resolvable sources open through shared routing
3. Support for formatting
   verify: supported Telegram entities render correctly, Telegram links route internally, external links stay external, code blocks fall back cleanly
4. Add search for channels
   verify: authenticated user can open search dialog, query Telegram, see blended typed results, and open a result target
5. Join channel
   verify: search or link targets show preview/join state when not subscribed, join opens immediately, leave is available from thread menu and removes the chat from feed

## Shared Infrastructure

### Target routing

Introduce one internal target-routing flow that can:

- open a channel focused on the latest message
- open a thread/message target
- resolve app-local URLs
- resolve supported Telegram links (`t.me`, `tg://`, message permalinks)
- reject unsupported or unauthenticated targets with a toast

This routing layer will be reused by:

- deep-link parsing on load
- search result selection
- join preview/open actions
- forwarded-source clicks
- Telegram-link clicks inside rendered message entities

### Toasts

Add a minimal app-level toast system only if no existing mechanism exists. It should support:

- unsupported link errors
- unauthenticated deep-link rejection
- other lightweight routing/search errors that do not justify blocking UI

### Thread header actions

Replace the text close action in the thread header with:

- `X` close button
- vertical-dots menu trigger

The menu only needs `Leave` now, but the structure should allow additional items later without redesign.

## Per-Task Design Notes

### 1. Open local/deep link

- Extend current notification-focus URL handling into a single inbound link parser.
- Support app-local patterns such as `/open?channel=...`, `/thread?itemId=...`, and existing focus query params.
- Support supported Telegram links and permalinks in v1.
- Register `navigator.registerProtocolHandler` when available and degrade silently when unavailable.
- If the user is unauthenticated, show a toast and stop.

### 2. Support for forwarded messages

- Keep forwarded data source-driven from Telegram message objects.
- Render forwarded header variants:
  - `Forwarded from Channel`
  - `Forwarded from Author via Channel`
  - anonymous author portion as `From anonymous`
- Add a left-border visual treatment in feed and thread.
- Use shared target routing when the forward source is resolvable; otherwise render disabled text.

### 3. Support for formatting

- Render supported Telegram entities from Telegram message metadata, not heuristic parsing.
- Supported entity set for v1:
  - bold
  - italic
  - underline
  - strikethrough
  - inline code
  - pre/code block
  - text URL
  - URL
- Telegram links route internally through shared target routing.
- External links remain normal external links.
- Code blocks use client-side highlighting when possible; unknown languages fall back to plain preformatted text.
- Malformed entities render best-effort rather than failing closed.

### 4. Add search for channels

- Add an authenticated-only menu entry that opens a modal/dialog.
- Query Telegram for a blended list of chats/channels and messages.
- Show a type label per result (`Message`, `Channel`, `Group`, `Direct`).
- Selecting a message result opens the containing target and scrolls to the message.
- Selecting an unsubscribed public target opens preview/join flow instead of jumping directly.
- No recent-search storage in v1.

### 5. Join channel

- Reuse search results and supported links as entry points.
- Show preview-before-join when Telegram provides preview data.
- If already subscribed, primary action is `Open`.
- After join, open immediately and leave notifications unchanged.
- Add `Leave` to the thread menu with confirmation.
- Leaving removes the chat from feed immediately and clears related persisted feed/notification settings.

## TDD Workflow

For each top-level task:

1. Add or extend focused tests for the missing behavior.
   verify: run targeted test command and confirm the new expectation fails for the intended reason
2. Implement the minimal production code to satisfy the failing test set.
   verify: rerun targeted tests until green
3. Refactor only if needed to remove duplication introduced by the fix.
   verify: rerun targeted tests after refactor
4. Run broader verification for the task boundary.
   verify: `npm test`, `npm run lint`, `npm run build`
5. Commit the task as a single coherent unit and push the branch.
6. Mark the corresponding Kairos top-level task done.

## Deployment Gate

After all five active tasks are complete:

1. Run full verification:
   - `npm test`
   - `npm run lint`
   - `npm run build`
2. Deploy using the existing Fly.io configuration.
   verify: deployment command exits successfully and app health checks pass if available
3. Mark any deployment-specific Kairos work complete.
