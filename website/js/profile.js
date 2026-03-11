/**
 * website/js/profile.js
 * ----------------------
 * Logic for profile.html — the PUBLIC profile page.
 *
 * This page is the shareable link. It shows only PUBLIC purchases
 * for any user specified in the URL query string:
 *   profile.html?user=alice
 *
 * No authentication required to VIEW this page.
 * If the visitor is logged in, they also see an "Add Friend" button.
 */

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ------------------------------------------------------------------
// Read the ?user= query parameter
// ------------------------------------------------------------------

function getTargetUsername() {
  const params = new URLSearchParams(window.location.search);
  return params.get("user") || "";
}

// ------------------------------------------------------------------
// Render purchases
// ------------------------------------------------------------------

function buildPublicCard(purchase) {
  const card = document.createElement("div");
  card.className = "purchase-card";

  const imgHtml = purchase.image_url
    ? `<img class="purchase-card-img" src="${escapeHtml(purchase.image_url)}" alt="" />`
    : `<div class="purchase-card-img-placeholder">${purchase.platform === "amazon" ? "📦" : "🛍️"}</div>`;

  card.innerHTML = `
    ${imgHtml}
    <div class="purchase-card-body">
      <p class="purchase-card-name">${escapeHtml(purchase.item_name)}</p>
      ${purchase.price ? `<p class="purchase-card-price">${escapeHtml(purchase.price)}</p>` : ""}
      <div class="purchase-card-meta">
        <span class="badge badge-${purchase.platform}">${purchase.platform}</span>
      </div>
      ${purchase.notes ? `<p style="font-size:11px;color:#666;margin-top:4px;">${escapeHtml(purchase.notes)}</p>` : ""}
    </div>
    <div class="purchase-card-actions">
      <a href="${escapeHtml(purchase.product_url)}" target="_blank" class="btn btn-primary btn-sm">
        🛒 Buy Now
      </a>
    </div>
  `;
  return card;
}

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------

(async function init() {
  const targetUsername = getTargetUsername();
  if (!targetUsername) {
    document.getElementById("profile-content").innerHTML =
      `<p class="msg msg-error">No user specified in URL. Use profile.html?user=username</p>`;
    return;
  }

  // Update page title
  document.title = `@${targetUsername}'s List — WishList Share`;

  // Show avatar initial and username
  document.getElementById("profile-initial").textContent =
    targetUsername[0].toUpperCase();
  document.getElementById("profile-username").textContent = `@${escapeHtml(targetUsername)}`;

  // If the visitor is logged in, show the Add Friend button.
  const currentUser = Auth.currentUser();
  if (currentUser && currentUser.username !== targetUsername) {
    const addFriendBtn = document.getElementById("btn-add-friend");
    addFriendBtn.classList.remove("hidden");
    addFriendBtn.addEventListener("click", async () => {
      addFriendBtn.disabled = true;
      addFriendBtn.textContent = "Sending…";
      const result = await Api.sendFriendRequest(targetUsername);
      if (result.ok) {
        addFriendBtn.textContent = "✅ Request Sent";
      } else {
        addFriendBtn.textContent = result.data?.error || "Failed";
        addFriendBtn.disabled = false;
      }
    });
  }

  // Load this user's public purchases
  const grid = document.getElementById("purchases-grid");
  const spinner = document.getElementById("purchases-spinner");
  const empty = document.getElementById("purchases-empty");

  spinner.classList.remove("hidden");

  const result = await Api.getUserPurchases(targetUsername);
  spinner.classList.add("hidden");

  if (!result.ok) {
    grid.innerHTML = `<p class="msg msg-error">${result.data?.error || "User not found."}</p>`;
    return;
  }

  const purchases = result.data;
  if (!purchases.length) {
    empty.classList.remove("hidden");
    return;
  }

  purchases.forEach((p) => grid.appendChild(buildPublicCard(p)));
})();
