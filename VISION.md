# ShoppyCat — Vision

## What ShoppyCat Is

ShoppyCat is a social purchase-sharing app. It lets you save items you've bought or are buying from online stores, share them with friends, and discover what your friends are buying. It is **not a wishlist app** — it's about sharing real buying intent and recommendations with people you know.

## Core Experience (Implemented)

- **Browser Extension** — Detects products on Amazon, AliExpress, Temu, SHEIN, and Etsy automatically. One click saves an item to your list. Multi-category tagging with auto-detection. Available for Chrome and Firefox (Manifest V3, version 1.3.0).
- **My List** — Feed-style view of your own items. Inline management per card: visibility toggle (public/private), multi-category tag editor, and delete.
- **Multi-Category Tagging** — Items can belong to multiple categories simultaneously (e.g. a coffee machine → Electronics + Home & Kitchen). Auto-detected from item name, editable at any time. Categories: Electronics, Fashion, Home & Kitchen, Baby & Kids, Beauty & Health, Sports, Books & Media, Toys & Games, Food & Grocery, Pets, Other.
- **Friend Feed** — A social feed of what friends have recently bought. Filter by category. Live stats polling every 10s (click count, Me Too).
- **"Me Too!" Button** — Signal you're also buying the same item. Shows a counter of how many friends are buying it; click to see who.
- **Item Comments** — Friends can leave comments on any public purchase item directly in the feed. Comment authors can delete their own.
- **Collections** — Save a friend's item into a personal named collection. Collaborative collections let you and invited friends build shared boards together with optional approval workflow. Live polling keeps boards in sync.
- **Notifications Center** — In-app notification feed with bell icon and unread badge. Toast popups when new notifications arrive without opening the bell. Events: friend request received/accepted, comment on your item, Me Too on your item.
- **Public Profiles** — Every user has a shareable profile URL showing their public purchases.
- **Friend System** — Send, accept, or reject friend requests. Combined feed of all friends' activity.
- **Password Encryption** — All passwords hashed with bcrypt at registration.

## Tech Stack

- **Backend:** Python / Flask, hosted on Fly.io (`shoppycat-api.fly.dev`). Auto-stop enabled — machine sleeps when idle to stay within free tier.
- **Frontend:** React 18 + Vite + Tailwind CSS, hosted on Cloudflare Workers (`shoppycat.org`). Dark glass-morphism UI with animated background.
- **Extension:** Chrome + Firefox (Manifest V3), built from single source via `extension/build.sh`.
- **Database:** MongoDB in production, JSON file locally.
- **Auth:** Token-based, supports simultaneous website + extension sessions.

## Supported Platforms

Currently auto-detects products on:
- Amazon (multiple regions: .com, .co.uk, .de, .fr, .co.jp, .ca, .com.au)
- AliExpress
- Temu
- SHEIN
- Etsy

---

## Future Plans

> Items are added here as ideas and moved up into "Core Experience" once implemented.

### Claude's Ideas

- **Safari Extension** — Safari version for iOS/macOS users.
  - *Your feedback:* —

- **Price Drop Alerts** — Track the price of saved items over time. Notify when an item drops below a threshold.
  - *Your feedback:* not a wishlist app — sharing items you recommend friends to buy.

- **Mobile App** — Native iOS and Android app.
  - *Your feedback:* not for now.

### Your Ideas

> Add your ideas here!
