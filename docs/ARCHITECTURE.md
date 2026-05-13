# Telegram Feed v2 Architecture

This document provides a detailed technical overview of the Telegram Feed v2 application, its components, 3rd-party integrations, and deployment strategy.

## 1. System Overview

Telegram Feed v2 is a specialized Telegram client designed as a "river of news" feed. It focuses on consolidating messages from multiple channels into a single, cohesive reading experience, departing from the traditional chat-list abstraction.

The application is a **frontend-only** (Single Page Application / PWA) that communicates directly with Telegram's MTProto servers via the browser.

### High-Level System Context

```mermaid
C4Context
    title System Context Diagram for Telegram Feed v2

    Person(user, "User", "A person reading their Telegram feed.")
    System(app, "Telegram Feed Web App", "React-based SPA/PWA providing the river-of-news interface.")
    System_Ext(telegram, "Telegram MTProto API", "Telegram's core servers for message delivery and authentication.")
    System_Ext(logger, "Logger API", "Remote ingestion service for errors and warnings.")

    Rel(user, app, "Uses", "Browser/HTTPS")
    Rel(app, telegram, "Communicates with", "MTProto/WebSockets", "Direct browser-to-server connection")
    Rel(app, logger, "Ingests logs to", "HTTPS/JSON", "Async remote logging")
```

---

## 2. Technical Stack

| Category | Technology |
| :--- | :--- |
| **Framework** | React 19 |
| **Build Tool** | Vite (Rolldown) |
| **State Management** | Jotai (Atoms) |
| **UI Components** | Ant Design (v6) |
| **Telegram API** | `telegram` (Browser MTProto client) |
| **Local Storage** | IndexedDB (via custom DAL) |
| **Avatar Carousel** | Embla Carousel |
| **PWA** | Service Worker with auto-update |
| **Formatter** | Biome |
| **Linter** | oxlint |
| **Deployment** | Contabo VPS (Docker + SSH) |
| **Containerization** | Docker |

---

## 3. Application Architecture

The application follows a domain-driven structure, isolating concerns like authentication, data access (DAL), and the core feed logic.

### Internal Container Diagram

```mermaid
C4Container
    title Container Diagram - Web Application Internals

    Container_Boundary(spa, "Web Application") {
        Component(auth, "Auth Domain", "React/Hooks", "Handles TG login (QR/Phone) and session management.")
        Component(feed, "Feed Domain", "React/Jotai", "Orchestrates message fetching, filtering, and threading.")
        Component(menu, "Menu Domain", "React/Jotai", "Channel filters, notifications, settings, and search dialog.")
        Component(search, "Search Infra", "JS/MTProto", "Search logic and membership queries (UI lives in Menu Domain).")
        Component(dal, "DAL (Data Access Layer)", "IndexedDB", "Persists sessions and caches message metadata locally.")
        Component(ui, "Shared UI Components", "React/AntD", "Reusable atoms: Avatar, Button, Header, Loading, Media, Text, Toast, etc.")
    }

    System_Ext(telegram, "Telegram Servers", "MTProto")

    Rel(auth, telegram, "Authenticates", "MTProto")
    Rel(feed, telegram, "Fetches Messages", "MTProto")
    Rel(auth, dal, "Saves Session", "JS API")
    Rel(feed, dal, "Caches Data", "JS API")
```

### Sequence: Authentication & Feed Initialization

This diagram illustrates how the app resumes a session and starts fetching the feed.

```mermaid
sequenceDiagram
    participant User
    participant App
    participant DAL as IndexedDB
    participant TG as Telegram API

    User->>App: Opens Application
    App->>DAL: Check for active Session String
    alt Session Exists
        DAL-->>App: Return Session String
        App->>TG: Connect & Validate Session
        TG-->>App: Authorized
        App->>TG: Fetch Channels & Dialogs
        App->>TG: Fetch Latest Messages
        TG-->>App: Message Stream
        App->>User: Render Feed
    else No Session
        App->>User: Redirect to Login (QR/Phone)
    end
```

### Theme System

The app detects the OS preference (`prefers-color-scheme`) and applies Ant Design's `darkAlgorithm` or `defaultAlgorithm` accordingly. The base font size is fixed at `16px` via `ConfigProvider`. Theme changes propagate to `document.body` styles via a `GlobalStyles` component.

---

## 4. 3rd-Party Services & APIs

### Telegram MTProto API
The primary service. Unlike the Bot API, this app uses the Client API, allowing it to act on behalf of a real user.
- **Protocol:** MTProto over WebSockets.
- **Authentication:** Supported via Phone Number (+ SMS/2FA) or QR Code.
- **Identifiers:** Requires `VITE_TELEGRAM_API_ID` and `VITE_TELEGRAM_API_HASH` obtained from [my.telegram.org](https://my.telegram.org).

### Logger API
Remote logging service for tracking runtime warnings and errors in non-development environments.
- **Endpoint:** `https://logger-api.fly.dev/ingest`
- **Authentication:** Token-based via `x-ingest-key`.

---

## 5. Deployment Details

### Infrastructure

The app is hosted on a **Contabo VPS** (`167.86.70.240`) and served at `telegram-feed.mlnkv.net`. Deployment is done manually over SSH: the Docker image is built and the container is updated on the server.

### Docker Strategy
The app uses a **multi-stage Docker build** to keep the production image lean:
1. **Build Stage:** Uses `node:22-alpine` to install dependencies and run `vite build`.
2. **Production Stage:** Uses `pierrezemb/gostatic` (approx. 5MB) to serve the `dist/` folder on port 8080.

### Environment Variables
Required at build time (for Vite):
- `VITE_TELEGRAM_API_ID`: Your Telegram App ID.
- `VITE_TELEGRAM_API_HASH`: Your Telegram App Hash.

---

## 6. Local Development

To run the project locally:

1. **Setup Env:** Create a `.env` file with your Telegram credentials.
2. **Install:** `npm install`
3. **Dev Server:** `npm run dev`
4. **Testing:** `npm test` to run Vitest suite.
