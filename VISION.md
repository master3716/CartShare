# ShoppyCat — Vision

## What ShoppyCat Is

ShoppyCat is a social wishlist and purchase-sharing app. It lets you save items you want or have bought from online stores, share them with friends, and discover what your friends are buying or wishing for.

## Core Experience

- **Browser Extension** — Detects products on Amazon, AliExpress, Temu, and SHEIN automatically. One click saves an item to your list. Also captures order confirmation pages as "purchases".
- **Website Dashboard** — View and manage your saved items, toggle each one public or private, and see a feed of your friends' public purchases.
- **Friend Feed** — A social layer where you can see what friends have recently saved or bought. Clicking an item tracks engagement.
- **Public Profiles** — Every user has a shareable profile URL showing their public wishlist.
- **Friend System** — Send/accept/reject friend requests. View a combined feed of all friends' activity.
- **Password Encryption** — All passwords are hashed with bcrypt. New registrations are automatically encrypted. Old plain-text accounts remain backward-compatible.
- **Item Comments** — Friends can leave comments on any public purchase item directly in the feed. Comment authors can delete their own comments.
- **Gifting Mode** — A friend can claim any public item as "I'm gifting this", hiding it from the item owner's feed so there are no spoilers. The gifter can unclaim at any time.
- **Collections** — Save a friend's purchased item into a personal named category (e.g. "Tech", "Gift Ideas"). Only friends' items can be saved — not your own purchases.

## Tech Stack

- **Backend:** Python / Flask, hosted on Render (`cartshare.onrender.com`)
- **Frontend:** Vanilla HTML/CSS/JS, hosted on Netlify (`shoppycat.org`)
- **Extension:** Chrome extension (Manifest V3), version 1.2.0
- **Database:** MongoDB in production, JSON file locally
- **Auth:** Token-based, supports simultaneous website + extension sessions

## Supported Platforms

Currently auto-detects products on:
- Amazon
- AliExpress
- Temu
- SHEIN

---

## Future Plan

> Items are added here as ideas and moved up into the "Core Experience" section once implemented.

### Claude's Ideas

- **Browser Support Expansion** — Firefox and Safari extension versions.
  - *Your feedback:* definitely would happen in the future, leave it here for now do not implement yet.

### Your Ideas

> Add your ideas here!
