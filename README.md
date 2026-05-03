# ![logo](public/favicon-32.png) Telegram Feed v2

A specialized Telegram client presenting messages as a "river of news", rather than traditional chat lists.

[**Read Detailed Architecture & Documentation (with diagrams) →**](docs/ARCHITECTURE.md)

## Key Features

- **River of News:** Consolidated feed from all your subscribed channels and groups.
- **Thread Support:** View full conversation threads directly in the feed.
- **Realtime Updates:** Direct connection to Telegram MTProto servers via the browser.
- **Cross-Platform:** Responsive web design optimized for desktop and mobile reading.

## Screenshots

![Screenshot](images/login_light.jpg)
![Screenshot](images/login_dark.jpg)
![Screenshot](images/feed.jpg)
![Screenshot](images/thread.jpg)

## Requirements

The app requires a Telegram API ID and Hash from [my.telegram.org](https://my.telegram.org).

Create a `.env` file in the root directory:

```sh
VITE_TELEGRAM_API_ID=your_api_id
VITE_TELEGRAM_API_HASH=your_api_hash
```

## Local Development

```sh
npm install
npm run dev
```

Run tests with `npm test`.

## Deployment

This application is configured for deployment to **Fly.io** via GitHub Actions. See [Fly Deploy Workflow](.github/workflows/fly-deploy.yml) and [fly.toml](fly.toml).