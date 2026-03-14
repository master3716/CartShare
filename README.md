# 🐱 ShoppyCat

ShoppyCat is a social purchase-sharing app. Share what you're buying with friends, see what they're buying, and discover products through your social circle.

## What ShoppyCat Is

ShoppyCat lets you save items you buy from online stores, share them with friends, and discover what your friends are buying. It's not a wishlist — it's a live feed of real purchases and buying intent from people you know.

## Core Features

- **Browser Extension** — Detects products on Amazon, AliExpress, Temu, SHEIN, and Etsy automatically. One click saves an item to your list. Also captures order confirmation pages as purchases.
- **Website Dashboard** — View and manage your saved items, toggle each one public or private, and see your friends' purchases.
- **Friend Feed** — A social feed of what friends have recently bought. Click an item to track engagement or shop the same product.
- **"Me Too!" Button** — Signal that you're also buying the same item. See how many friends are buying it and click the counter to see who.
- **Item Comments** — Leave comments on any friend's public purchase directly in the feed.
- **Collections** — Save a friend's item into a personal named category (e.g. "Tech", "Gift Ideas"). Viewable in your Collections page alongside collaborative boards.
- **Collaborative Collections** — Create shared boards where you and invited friends can all add items together. Add items directly from the feed's save popover. Owner can require approval before member-added items appear. Owner can approve, reject, or remove any item. Live polling keeps the view up to date in real time.
- **Notifications Center** — In-app notification feed for friend requests, accepted requests, comments on your items, and "Me Too!" marks. Bell icon with unread badge in the nav.
- **Public Profiles** — Every user has a shareable profile URL showing their public purchases.
- **Friend System** — Send, accept, or reject friend requests. View a combined feed of all friends' activity.
- **Password Encryption** — All passwords are hashed with bcrypt at registration. Existing accounts are migrated automatically on server start.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python / Flask |
| Frontend | Vanilla HTML / CSS / JS |
| Extension | Chrome (Manifest V3) |
| Database | MongoDB (production), JSON file (local) |
| Hosting | Render (backend), Cloudflare Workers (frontend) |
| Auth | Token-based, supports simultaneous website + extension sessions |

## Supported Stores

Auto-detects products on: **Amazon**, **AliExpress**, **Temu**, **SHEIN**, **Etsy**

---

## Future Plans

### Claude's Ideas

- **Browser Support Expansion** — Firefox and Safari extension versions.

### Our Ideas

> Ideas we're planning to implement next.
