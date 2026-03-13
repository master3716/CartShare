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

async function loadMyPurchases() {
  const grid = document.getElementById("my-purchases-grid");
  const spinner = document.getElementById("my-purchases-spinner");
  const empty = document.getElementById("my-purchases-empty");

  grid.innerHTML = "";
  spinner.classList.remove("hidden");

  const result = await Api.getMyPurchases();
  spinner.classList.add("hidden");

  if (!result.ok) {
    grid.innerHTML = `<p class="msg msg-error">${result.data?.error || "Failed to load purchases."}</p>`;
    return;
  }

  const purchases = result.data;
  if (!purchases.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  purchases.forEach((p) => {
    const card = buildPurchaseCard(p, true);
    grid.appendChild(card);
  });

  // Wire action buttons
  grid.querySelectorAll(".btn-toggle-visibility").forEach((btn) => {
    btn.addEventListener("click", () => handleToggleVisibility(btn.dataset.id));
  });
  grid.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", () => handleDelete(btn.dataset.id));
  });
}

// ------------------------------------------------------------------
// Load and render the friends' feed
// ------------------------------------------------------------------

async function loadFriendsFeed() {
  const grid = document.getElementById("feed-grid");
  const spinner = document.getElementById("feed-spinner");
  const empty = document.getElementById("feed-empty");

  grid.innerHTML = "";
  spinner.classList.remove("hidden");

  const result = await Api.getFriendsFeed();
  spinner.classList.add("hidden");

  if (!result.ok) {
    grid.innerHTML = `<p class="msg msg-error">${result.data?.error || "Failed to load feed."}</p>`;
    return;
  }

  const feed = result.data;
  if (!feed.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  feed.forEach((item) => {
    const card = buildPurchaseCard(item, false, item.friend_username);
    grid.appendChild(card);
  });
}

// ------------------------------------------------------------------
// Load and render My Collections
// ------------------------------------------------------------------

async function loadMyCollections() {
  const container = document.getElementById("collections-container");
  const spinner = document.getElementById("collections-spinner");
  const empty = document.getElementById("collections-empty");

  spinner.classList.remove("hidden");

  const result = await Api.getSavedItems();
  spinner.classList.add("hidden");

  if (!result.ok || !result.data.length) {
    empty.classList.remove("hidden");
    return;
  }

  // Group items by category
  const byCategory = {};
  for (const saved of result.data) {
    if (!byCategory[saved.category]) byCategory[saved.category] = [];
    byCategory[saved.category].push(saved);
  }

  for (const [category, items] of Object.entries(byCategory)) {
    const section = document.createElement("div");
    section.className = "collection-category";
    section.innerHTML = `<h3 class="collection-category-title">📁 ${escapeHtml(category)}</h3>`;

    const grid = document.createElement("div");
    grid.className = "purchase-grid";

    for (const saved of items) {
      const p = saved.purchase;
      if (!p) continue;
      const card = buildPurchaseCard(p, false);

      // Add remove-from-collection button
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-ghost btn-sm";
      removeBtn.style = "margin-top:6px;font-size:11px;color:#999;";
      removeBtn.textContent = "✕ Remove from collection";
      removeBtn.addEventListener("click", async () => {
        await Api.deleteSavedItem(saved.id);
        card.remove();
        if (!grid.children.length) section.remove();
        if (!container.children.length) empty.classList.remove("hidden");
      });
      card.querySelector(".purchase-card-body").appendChild(removeBtn);
      grid.appendChild(card);
    }

    section.appendChild(grid);
    container.appendChild(section);
  }
}

// ------------------------------------------------------------------
// Action handlers
// ------------------------------------------------------------------

async function handleToggleVisibility(purchaseId) {
  const result = await Api.toggleVisibility(purchaseId);
  if (result.ok) {
    await loadMyPurchases();   // re-render to show updated badge
  } else {
    alert(result.data?.error || "Failed to update.");
  }
}

async function handleDelete(purchaseId) {
  if (!confirm("Delete this purchase? This cannot be undone.")) return;
  const result = await Api.deletePurchase(purchaseId);
  if (result.ok) {
    await loadMyPurchases();
  } else {
    alert(result.data?.error || "Failed to delete.");
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
  await Promise.all([loadMyPurchases(), loadFriendsFeed(), loadMyCollections()]);
})();
