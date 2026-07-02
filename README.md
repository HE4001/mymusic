# MyMusic — Cloudflare Pages Music Player

A music player built on Cloudflare Pages with Backblaze B2 storage, optimized for Windows desktop and iOS mobile.

## Architecture

```
Cloudflare Pages
├── Pages Functions (API)     → B2 presigned URLs
├── Static frontend           → Dual-platform UI
└── KV Namespace              → URL cache
        │
        ▼
Backblaze B2 (Object Storage)
└── Audio files only
```

## Project Structure

```
├── src/
│   ├── index.html             # SPA shell (desktop + iOS layouts)
│   ├── _middleware.ts         # Pages Function middleware (CORS)
│   ├── css/                   # 6 stylesheets
│   ├── js/                    # 8 modules
│   └── functions/             # Backend API
│       ├── b2.ts              # B2 client (auth + presign)
│       ├── types.ts           # TypeScript interfaces
│       └── api/stream/[id].ts # Stream endpoint
├── public/                    # Static assets (icons, manifest, SW)
├── scripts/
│   └── build.mjs              # Build + B2 sync script
├── wrangler.toml              # Pages configuration
└── package.json
```

## Quick Start

### 1. Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`npm install -g wrangler`)
- [Backblaze B2](https://www.backblaze.com/cloud-storage) account with a bucket

### 2. Setup

```bash
# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Create Pages project
wrangler pages project create mymusic --production-branch main

# Create KV namespace for URL caching
wrangler kv namespace create URL_CACHE

# Update wrangler.toml with the KV namespace ID
```

### 3. Configure B2 Credentials

Set secrets (never commit these):
```bash
wrangler secret put B2_ACCESS_KEY_ID    # Your B2 Application Key ID
wrangler secret put B2_SECRET_ACCESS_KEY # Your B2 Application Key
```

Set variables in Cloudflare Dashboard → Pages → mymusic → Settings → Environment Variables:
| Variable | Value |
|----------|-------|
| `B2_ENDPOINT` | `https://s3.us-west-002.backblazeb2.com` |
| `B2_BUCKET` | `your-bucket-name` |
| `B2_REGION` | `us-west-002` |
| `PRESIGN_EXPIRY` | `3600` |

### 4. Upload Songs to B2

```bash
# Using B2 CLI
b2 authorize-account
b2 upload-file --noProgress your-bucket songs/Artist - Song.mp3
```

### 5. Sync & Build

```bash
# Scan B2 bucket and update song manifest
B2_ACCESS_KEY_ID=xxx B2_SECRET_ACCESS_KEY=xxx npm run sync-manifest

# Build for deployment
npm run build
```

### 6. Deploy

```bash
# First deploy
wrangler pages deploy dist

# Connect to GitHub for auto-deploy
# Then just git push!
```

## Platform-Specific Features

### Windows Desktop
- Three-column layout (sidebar + playlist + now-playing)
- Keyboard shortcuts (Space, arrows, Ctrl+K, etc.)
- Mouse hover interactions
- Right-click context menu
- Progress bar seek (click + drag)
- Volume slider (hover to expand)

### iOS Mobile
- Single-column list view
- Mini player (bottom bar)
- Full-screen player (swipe up)
- Touch gestures (swipe left/right for prev/next)
- Lock screen Media Session controls
- Action sheet (long press)
- Safe area support (notch)

## Configuration

### Pages Variables (non-sensitive)
```toml
# wrangler.toml [vars]
B2_ENDPOINT = "https://s3.us-west-002.backblazeb2.com"
B2_BUCKET = "my-music"
B2_REGION = "us-west-002"
PRESIGN_EXPIRY = "3600"       # Stream URL TTL (seconds)
APP_NAME = "MyMusic"
```

### Pages Secrets (sensitive)
```bash
wrangler secret put B2_ACCESS_KEY_ID
wrangler secret put B2_SECRET_ACCESS_KEY
```

## Development

```bash
# Local dev server
npm run dev

# Type checking
npm run types:check
```

## Adding Songs

Since songs are fixed, update the manifest:

```bash
# 1. Upload new files to B2
b2 upload-file --noProgress your-bucket songs/New Song.mp3

# 2. Rescan and rebuild
B2_ACCESS_KEY_ID=xxx B2_SECRET_ACCESS_KEY=xxx npm run sync-manifest
npm run build
wrangler pages deploy dist
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Hosting | Cloudflare Pages |
| Runtime | Pages Functions (Workers) |
| Storage | Backblaze B2 |
| Cache | Cloudflare KV |
| Frontend | Vanilla HTML/CSS/JS (no framework) |
| PWA | Service Worker + Manifest |

## License

MIT
