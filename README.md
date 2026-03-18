# 🐱 ShoppyCat

ShoppyCat is a social purchase-sharing app. Share what you're buying with friends, see what they're buying, and discover products through your social circle.

## What ShoppyCat Is

ShoppyCat lets you save items you buy from online stores, share them with friends, and discover what your friends are buying. It's not a wishlist — it's a live feed of real purchases and buying intent from people you know.

## Core Features

- **Browser Extension** — Detects products on Amazon, AliExpress, Temu, SHEIN, and Etsy automatically. One click saves an item to your list. Available for **Chrome and Firefox**.
- **Multi-Category Tagging** — Items can belong to multiple categories (e.g. a coffee machine is both Electronics and Home & Kitchen). Categories are auto-detected from the item name and can be edited at any time.
- **My List** — Feed-style view of your own items with visibility toggle (public/private), category tag editing, and delete — all inline per card.
- **Friend Feed** — A social feed of what friends have recently bought. Filter by category. Stats update every 10 seconds live.
- **"Me Too!" Button** — Signal that you're also buying the same item. See who else is buying it.
- **Item Comments** — Leave comments on any friend's public purchase directly in the feed.
- **Collections** — Save a friend's item into a personal named category. Collaborative collections let you and invited friends build shared boards together.
- **Notifications Center** — Bell icon with unread badge. Toasts appear in real time when new notifications arrive. Events: friend requests, accepted requests, comments, and Me Too marks.
- **Public Profiles** — Every user has a shareable profile URL showing their public purchases.
- **Friend System** — Send, accept, or reject friend requests. Combined feed of all friends' activity.
- **Password Encryption** — All passwords hashed with bcrypt.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python / Flask, hosted on Fly.io (auto-stop, sleeps when idle) |
| Frontend | React 18 + Vite + Tailwind CSS, hosted on Cloudflare Workers |
| Extension | Chrome + Firefox (Manifest V3), version 1.3.0 |
| Database | MongoDB (production), JSON file (local) |
| Auth | Token-based, supports simultaneous website + extension sessions |

## Supported Stores

Auto-detects products on: **Amazon**, **AliExpress**, **Temu**, **SHEIN**, **Etsy**

## Extension

Two builds from the same source:
- `extension/shoppycat-chrome.zip` — Chrome Web Store
- `extension/shoppycat-firefox.zip` — Firefox Add-ons (AMO)

To rebuild both after changes:
```bash
cd extension && python3 build.sh
```

---

## Future Plans

### Claude's Ideas

- **Safari Extension** — Safari version for iOS/macOS users.

### Our Ideas

> Ideas we're planning to implement next.
