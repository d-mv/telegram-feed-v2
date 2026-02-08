# ![logo](public/favicon-32.png) Telegram Feed v2

This a second effort to entertain idea of having a chat application presenting messages as a "river of news", rather than traditional chats abstraction. First being [Telegram Feed v1](https://github.com/d-mv/telegram-feed).

Implemented were: feed of messages from all chats, ability to view threads, realtime updates from Telegram.

Further development is paused in favour of other projects.

## Screenshots

![Screenshot](images/login_light.jpg)
![Screenshot](images/login_dark.jpg)
![Screenshot](images/feed.jpg)
![Screenshot](images/thread.jpg)

## Requirements

`.env` file with:

```sh
VITE_TELEGRAM_API_ID=...
VITE_TELEGRAM_API_HASH=...
```

## Running the app

```sh
npm install
npm run dev
```