# WishList Share — How to Run

## 1. Start the Flask server

```bash
cd ~/wishlist-app/server
.venv/bin/python3 src/app.py
```

The server runs at **http://127.0.0.1:5000**
All data is saved in plain text at `server/data/database.json`

---

## 2. Open the website

Browsers block `fetch()` from `file://` URLs, so you need a local HTTP server.

**Option A — VS Code Live Server (easiest):**
1. Install the "Live Server" extension in VS Code
2. Open the `~/wishlist-app/website/` folder in VS Code
3. Right-click `index.html` → **"Open with Live Server"**
4. Opens at `http://127.0.0.1:5500`

**Option B — Python:**
```bash
cd ~/wishlist-app/website
python3 -m http.server 5500
# then open http://127.0.0.1:5500 in your browser
```

---

## 3. Install the Chrome extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **"Load unpacked"**
4. Select the folder `~/wishlist-app/extension`
5. The 🛒 icon appears in your toolbar — pin it for easy access

---

## 4. Test the full flow

1. Register an account on the website (`http://127.0.0.1:5500`)
2. Click the 🛒 extension icon → **Login** tab → enter your credentials
3. Go to any **Amazon** or **AliExpress** product page
4. Click the extension icon → the product is auto-detected → click **"Save to My List"**
5. On order confirmation pages a floating **"Save to WishList Share"** banner also appears
6. To share a past purchase manually: extension icon → **"Share Past Purchase"** tab → paste the URL
7. Visit your **Dashboard** to see all saved items, toggle public/private, or delete
8. Add friends on the **Friends** page by entering their username
9. Share your public profile link: `http://127.0.0.1:5500/profile.html?user=YOUR_USERNAME`

---

## API endpoints (for reference / testing with curl)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout

GET    /api/users/me
GET    /api/users/<username>

POST   /api/purchases              (add item)
GET    /api/purchases              (my full list)
DELETE /api/purchases/<id>
PATCH  /api/purchases/<id>/visibility   (toggle public/private)
GET    /api/purchases/user/<username>   (another user's public list)

GET    /api/friends
GET    /api/friends/feed           (combined feed from all friends)
GET    /api/friends/requests       (pending incoming requests)
POST   /api/friends/request        body: { "username": "..." }
POST   /api/friends/accept         body: { "requester_id": "..." }
POST   /api/friends/reject         body: { "requester_id": "..." }
DELETE /api/friends/<friend_id>
```

Quick test with curl:
```bash
# Register
curl -X POST http://127.0.0.1:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@test.com","password":"secret"}'

# Login — copy the token from the response
curl -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@test.com","password":"secret"}'

# Add a purchase (replace TOKEN)
curl -X POST http://127.0.0.1:5000/api/purchases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"item_name":"Cool Gadget","product_url":"https://amazon.com/dp/example","platform":"amazon","price":"$29.99","is_public":true}'
```
