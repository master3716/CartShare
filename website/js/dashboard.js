/**
 * website/js/dashboard.js
 * ------------------------
 * Logic for dashboard.html — the main logged-in view.
 *
 * Responsibilities:
 *   - Show the logged-in user's purchases (all, including private ones).
 *   - Allow toggling each purchase between public and private.
 *   - Allow deleting a purchase.
 *   - Show the friends' feed (public purchases from all friends).
 */

// ------------------------------------------------------------------
// Helper: build one purchase card element
// ------------------------------------------------------------------

/**
 * Creates a <div class="purchase-card"> element for a single purchase.
 *
 * @param {object}   purchase  - purchase dict from the API
 * @param {boolean}  isOwner   - true if this card is on the owner's dashboard
 *                               (shows delete + visibility toggle)
 * @param {string}   [friendUsername] - set only when showing a friend's item
 * @returns {HTMLElement}
 */
function buildPurchaseCard(purchase, isOwner, friendUsername) {
  const card = document.createElement("div");
  card.className = "purchase-card";
  card.dataset.id = purchase.id;

  // Image or placeholder emoji
  const imgHtml = purchase.image_url
    ? `<img class="purchase-card-img" src="${escapeHtml(purchase.image_url)}" alt="product image" />`
    : `<div class="purchase-card-img-placeholder">${purchase.platform === "amazon" ? "📦" : "🛍️"}</div>`;

  const badge = purchase.is_public
    ? `<span class="badge badge-public">Public</span>`
    : `<span class="badge badge-private">Private</span>`;

  const platformBadge = `<span class="badge badge-${purchase.platform}">${purchase.platform}</span>`;

  const friendTag = friendUsername
    ? `<p style="font-size:11px;color:#888;margin-top:2px;">by <strong>@${escapeHtml(friendUsername)}</strong></p>`
    : "";

  const ownerActions = isOwner ? `
    <div class="purchase-card-actions">
      <button class="btn btn-ghost btn-sm btn-toggle-visibility"
              data-id="${purchase.id}"
              title="Toggle public/private">
        ${purchase.is_public ? "🔒 Make Private" : "🌐 Make Public"}
      </button>
      <button class="btn btn-danger btn-sm btn-delete"
              data-id="${purchase.id}"
              title="Delete">
        🗑️
      </button>
    </div>
  ` : `
    <div class="purchase-card-actions">
      <a href="${escapeHtml(purchase.product_url)}" target="_blank" class="btn btn-primary btn-sm">
        🛒 Buy Now
      </a>
    </div>
  `;

  card.innerHTML = `
    ${imgHtml}
    <div class="purchase-card-body">
      <p class="purchase-card-name">${escapeHtml(purchase.item_name)}</p>
      ${purchase.price ? `<p class="purchase-card-price">${escapeHtml(purchase.price)}</p>` : ""}
      ${friendTag}
      <div class="purchase-card-meta">
        ${isOwner ? badge : ""}
        ${platformBadge}
      </div>
      ${purchase.notes ? `<p style="font-size:11px;color:#666;margin-top:4px;">${escapeHtml(purchase.notes)}</p>` : ""}
    </div>
    ${ownerActions}
  `;

  return card;
}

/** Basic HTML escaping to prevent XSS from stored product names. */
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ------------------------------------------------------------------
// Load and render the logged-in user's own purchases
// ------------------------------------------------------------------

let _purchasesFirstLoad = true;

function _renderPurchases(grid, empty, purchases) {
  grid.innerHTML = "";
  if (!purchases.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  purchases.forEach(p => grid.appendChild(buildPurchaseCard(p, true)));
  grid.querySelectorAll(".btn-toggle-visibility").forEach(btn =>
    btn.addEventListener("click", () => handleToggleVisibility(btn.dataset.id)));
  grid.querySelectorAll(".btn-delete").forEach(btn =>
    btn.addEventListener("click", () => handleDelete(btn.dataset.id)));
}

async function loadMyPurchases() {
  const grid    = document.getElementById("my-purchases-grid");
  const spinner = document.getElementById("my-purchases-spinner");
  const empty   = document.getElementById("my-purchases-empty");

  // On first load only: show cache immediately so the page feels instant
  if (_purchasesFirstLoad) {
    _purchasesFirstLoad = false;
    const cached = AppCache.get("my_purchases");
    if (cached) {
      spinner.classList.add("hidden");
      _renderPurchases(grid, empty, cached);
    } else {
      grid.innerHTML = "";
      spinner.classList.remove("hidden");
    }
  } else {
    // Revert path — clear and show spinner for accurate fresh data
    grid.innerHTML = "";
    spinner.classList.remove("hidden");
  }

  const result = await Api.getMyPurchases();
  spinner.classList.add("hidden");

  if (!result.ok) {
    if (!grid.children.length)
      grid.innerHTML = `<p class="msg msg-error">${result.data?.error || "Failed to load purchases."}</p>`;
    return;
  }

  const purchases = result.data;
  AppCache.set("my_purchases", purchases);
  _renderPurchases(grid, empty, purchases);
}

// ------------------------------------------------------------------
// Load and render the friends' feed
// ------------------------------------------------------------------

async function loadFriendsFeed() {
  const grid    = document.getElementById("feed-grid");
  const spinner = document.getElementById("feed-spinner");
  const empty   = document.getElementById("feed-empty");

  const cached = AppCache.get("dashboard_feed");
  if (cached) {
    spinner.classList.add("hidden");
    if (cached.length) {
      empty.classList.add("hidden");
      cached.forEach(item => grid.appendChild(buildPurchaseCard(item, false, item.friend_username)));
    } else {
      empty.classList.remove("hidden");
    }
  } else {
    grid.innerHTML = "";
    spinner.classList.remove("hidden");
  }

  const result = await Api.getFriendsFeed();
  spinner.classList.add("hidden");

  if (!result.ok) {
    if (!cached) grid.innerHTML = `<p class="msg msg-error">${result.data?.error || "Failed to load feed."}</p>`;
    return;
  }

  const feed = result.data;
  AppCache.set("dashboard_feed", feed);

  // Re-render only if the content changed
  if (JSON.stringify(feed.map(i => i.id)) === JSON.stringify((cached || []).map(i => i.id))) return;
  grid.innerHTML = "";
  if (!feed.length) { empty.classList.remove("hidden"); return; }
  empty.classList.add("hidden");
  feed.forEach(item => grid.appendChild(buildPurchaseCard(item, false, item.friend_username)));
}

// ------------------------------------------------------------------
// Action handlers
// ------------------------------------------------------------------

async function handleToggleVisibility(purchaseId) {
  const card = document.querySelector(`.purchase-card[data-id="${purchaseId}"]`);
  const toggleBtn = card?.querySelector(".btn-toggle-visibility");
  const badgeEl = card?.querySelector(".badge-public, .badge-private");

  // Optimistic: flip badge and button text immediately
  if (card && toggleBtn && badgeEl) {
    const isPublic = badgeEl.classList.contains("badge-public");
    badgeEl.className = isPublic ? "badge badge-private" : "badge badge-public";
    badgeEl.textContent = isPublic ? "Private" : "Public";
    toggleBtn.textContent = isPublic ? "🌐 Make Public" : "🔒 Make Private";
  }

  const result = await Api.toggleVisibility(purchaseId);
  if (!result.ok) {
    await loadMyPurchases(); // revert
    showToast("Something went wrong, visibility wasn't changed.");
  }
}

async function handleDelete(purchaseId) {
  if (!confirm("Delete this purchase? This cannot be undone.")) return;
  const card = document.querySelector(`.purchase-card[data-id="${purchaseId}"]`);
  card?.remove(); // optimistic
  const result = await Api.deletePurchase(purchaseId);
  if (!result.ok) {
    await loadMyPurchases(); // revert
    showToast("Something went wrong, the purchase wasn't deleted.");
  }
}

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------

(async function init() {
  Auth.requireLogin();

  const user = Auth.currentUser();
  if (user) {
    Auth.setupNavbar(user);
  }

  document.getElementById("btn-logout").addEventListener("click", () => Auth.logout());

  // Load all sections in parallel for speed
  await Promise.all([loadMyPurchases(), loadFriendsFeed()]);
})();
