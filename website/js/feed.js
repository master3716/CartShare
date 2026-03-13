/**
 * feed.js — Social friend feed page
 */

Auth.requireLogin();

const user = Auth.currentUser();
if (user) {
  Auth.setupNavbar(user);
}

document.getElementById("btn-logout").addEventListener("click", async () => {
  await Auth.logout();
});

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildCommentHtml(comment, currentUserId) {
  const isOwner = comment.user_id === currentUserId;
  const avatarHtml = comment.avatar_url
    ? `<img src="${comment.avatar_url}" class="comment-avatar" />`
    : `<span class="comment-avatar comment-avatar-initial">${(comment.username || "?")[0].toUpperCase()}</span>`;
  return `
    <div class="comment" data-comment-id="${comment.id}">
      ${avatarHtml}
      <span class="comment-author">@${comment.username}</span>
      <span class="comment-text">${escapeHtml(comment.text)}</span>
      ${isOwner ? `<button class="btn-delete-comment" data-id="${comment.id}">✕</button>` : ""}
    </div>
  `;
}

async function loadComments(purchaseId, container, currentUserId) {
  const result = await Api.getComments(purchaseId);
  if (!result.ok) return;
  const comments = result.data || [];
  const list = container.querySelector(".comment-list");
  list.innerHTML = comments.map(c => buildCommentHtml(c, currentUserId)).join("");
  list.querySelectorAll(".btn-delete-comment").forEach(btn => {
    btn.addEventListener("click", async () => {
      await Api.deleteComment(btn.dataset.id);
      await loadComments(purchaseId, container, currentUserId);
    });
  });
}

function buildCard(item) {
  const currentUser = Auth.currentUser();
  const currentUserId = currentUser ? currentUser.id : null;
  const card = document.createElement("div");
  card.className = "social-card";

  const initial = item.friend_username ? item.friend_username[0].toUpperCase() : "?";
  const clicks = item.click_count || 0;

  // "Me too / also buying" state
  const alsoBuying = item.also_buying || [];
  const alsoBuyingUsers = item.also_buying_users || [];
  const iAmBuying = currentUserId && alsoBuying.includes(currentUserId);
  const alsoCount = alsoBuying.length;

  const badgeHtml = alsoCount > 0
    ? `<span class="badge badge-also-buying badge-also-buying-clickable" data-id="${item.id}">🛒 ${alsoCount} ${alsoCount === 1 ? "friend is" : "friends are"} also buying this ▾</span>
       <div class="also-buying-list hidden" id="also-list-${item.id}">${alsoBuyingUsers.map(u => `
         <span class="also-buying-user">
           ${u.avatar_url ? `<img src="${u.avatar_url}" class="also-buying-avatar" />` : `<span class="also-buying-initial">${u.username[0].toUpperCase()}</span>`}
           @${escapeHtml(u.username)}
         </span>
       `).join("")}</div>`
    : "";

  let alsoBuyingHtml = "";
  if (currentUserId) {
    alsoBuyingHtml = `
      <div class="also-buying-section">
        ${badgeHtml}
        <button class="btn btn-sm btn-ghost btn-also-buying" data-id="${item.id}" data-buying="${iAmBuying}">
          ${iAmBuying ? "✓ Me too — Undo" : "🛒 Me too!"}
        </button>
      </div>
    `;
  } else if (alsoCount > 0) {
    alsoBuyingHtml = `
      <div class="also-buying-section">
        ${badgeHtml}
      </div>
    `;
  }

  const avatarHtml = item.friend_avatar_url
    ? `<img src="${item.friend_avatar_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" />`
    : `<div class="social-avatar">${initial}</div>`;

  card.innerHTML = `
    <div class="social-card-header">
      ${avatarHtml}
      <div class="social-card-meta">
        <span class="social-username">@${item.friend_username}</span>
        <span class="social-date">${formatDate(item.added_at)}</span>
      </div>
    </div>

    ${item.image_url
      ? `<img class="social-card-img" src="${item.image_url}" alt="${item.item_name}" />`
      : `<div class="social-card-img-placeholder">🛍️</div>`
    }

    <div class="social-card-body">
      <p class="social-card-name">${item.item_name}</p>
      ${item.price ? `<p class="social-card-price">${item.price}</p>` : ""}
      <span class="badge badge-${item.platform}">${item.platform}</span>
      <p class="social-click-count" id="clicks-${item.id}">
        👆 <span class="click-num">${clicks}</span> ${clicks === 1 ? "person" : "people"} clicked this
      </p>
      <a class="btn btn-primary shop-btn" data-id="${item.id}" data-url="${item.product_url}" href="#">
        Shop Now →
      </a>
      ${alsoBuyingHtml}
      ${currentUserId ? `<button class="btn btn-sm btn-ghost btn-save-collection" data-id="${item.id}">📁 Save to collection</button>` : ""}
    </div>

    <div class="comments-section" data-purchase-id="${item.id}">
      <div class="comment-list"></div>
      ${currentUserId ? `
        <div class="comment-form">
          <input type="text" class="comment-input" placeholder="Add a comment…" maxlength="500" />
          <button class="btn btn-sm btn-ghost comment-submit">Post</button>
        </div>
      ` : ""}
    </div>
  `;

  card.querySelector(".shop-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const url = btn.dataset.url;
    await Api.clickPurchase(id);
    const countEl = document.querySelector(`#clicks-${id} .click-num`);
    if (countEl) {
      const newCount = parseInt(countEl.textContent) + 1;
      countEl.textContent = newCount;
      const label = document.querySelector(`#clicks-${id}`);
      label.innerHTML = `👆 <span class="click-num">${newCount}</span> ${newCount === 1 ? "person" : "people"} clicked this`;
    }
    window.open(url, "_blank");
  });

  // "Me too / also buying" toggle handler
  const alsoBuyingBtn = card.querySelector(".btn-also-buying");
  if (alsoBuyingBtn) {
    alsoBuyingBtn.addEventListener("click", async () => {
      alsoBuyingBtn.disabled = true;
      const isActive = alsoBuyingBtn.dataset.buying === "true";
      const result = isActive
        ? await Api.unmarkAlsoBuying(alsoBuyingBtn.dataset.id)
        : await Api.markAlsoBuying(alsoBuyingBtn.dataset.id);

      if (result.ok) {
        const updated = result.data;
        const buyers = updated.also_buying || [];
        const count = buyers.length;
        const nowActive = buyers.includes(currentUserId);
        // Re-build also_buying_users list: keep existing users and add/remove current user
        const section = alsoBuyingBtn.closest(".also-buying-section");
        const prevUsers = Array.from(
          section.querySelectorAll(".also-buying-user")
        ).map(el => {
          const imgEl = el.querySelector("img.also-buying-avatar");
          const username = el.textContent.trim().replace(/^@/, "");
          return { username, avatar_url: imgEl ? imgEl.src : "" };
        });
        const updatedUsers = nowActive
          ? [...prevUsers.filter(u => u.username !== currentUser.username), { username: currentUser.username, avatar_url: currentUser.avatar_url || "" }]
          : prevUsers.filter(u => u.username !== currentUser.username);

        const newBadgeHtml = count > 0
          ? `<span class="badge badge-also-buying badge-also-buying-clickable" data-id="${updated.id}">🛒 ${count} ${count === 1 ? "friend is" : "friends are"} also buying this ▾</span>
             <div class="also-buying-list hidden" id="also-list-${updated.id}">${updatedUsers.map(u => `
               <span class="also-buying-user">
                 ${u.avatar_url ? `<img src="${u.avatar_url}" class="also-buying-avatar" />` : `<span class="also-buying-initial">${u.username[0].toUpperCase()}</span>`}
                 @${escapeHtml(u.username)}
               </span>
             `).join("")}</div>`
          : "";
        section.innerHTML = `
          ${newBadgeHtml}
          <button class="btn btn-sm btn-ghost btn-also-buying" data-id="${updated.id}" data-buying="${nowActive}">
            ${nowActive ? "✓ Me too — Undo" : "🛒 Me too!"}
          </button>
        `;
        const newBtn = section.querySelector(".btn-also-buying");
        newBtn.addEventListener("click", arguments.callee);
        const newBadge = section.querySelector(".badge-also-buying-clickable");
        if (newBadge) newBadge.addEventListener("click", toggleAlsoBuyingList);
      } else {
        alsoBuyingBtn.disabled = false;
        alert(result.data && result.data.error ? result.data.error : "Could not update.");
      }
    });
  }

  // Toggle the "who's buying" dropdown when clicking the badge
  function toggleAlsoBuyingList(e) {
    const purchaseId = e.currentTarget.dataset.id;
    const list = card.querySelector(`#also-list-${purchaseId}`);
    if (list) list.classList.toggle("hidden");
  }

  const alsoBuyingBadge = card.querySelector(".badge-also-buying-clickable");
  if (alsoBuyingBadge) {
    alsoBuyingBadge.addEventListener("click", toggleAlsoBuyingList);
  }

  // Save to collection — inline popover with existing categories + new option
  const saveBtn = card.querySelector(".btn-save-collection");
  if (saveBtn) {
    saveBtn.addEventListener("click", async (e) => {
      e.stopPropagation();

      // Remove any existing popover
      document.querySelectorAll(".collection-popover").forEach(p => p.remove());

      // Fetch existing categories
      const catResult = await Api.getSavedItems();
      const existingCats = catResult.ok
        ? [...new Set((catResult.data || []).map(s => s.category))]
        : [];

      // Build popover
      const popover = document.createElement("div");
      popover.className = "collection-popover";

      const catListHtml = existingCats.map(cat => `
        <button class="collection-popover-item" data-cat="${escapeHtml(cat)}">📁 ${escapeHtml(cat)}</button>
      `).join("");

      popover.innerHTML = `
        ${catListHtml}
        ${existingCats.length ? `<div class="collection-popover-divider"></div>` : ""}
        <div class="collection-popover-new">
          <input class="collection-popover-input" type="text" placeholder="New collection name…" maxlength="50" />
          <button class="collection-popover-add btn btn-sm btn-primary">Add</button>
        </div>
      `;

      saveBtn.parentElement.style.position = "relative";
      saveBtn.parentElement.appendChild(popover);

      // Focus new input
      popover.querySelector(".collection-popover-input").focus();

      async function saveToCategory(category) {
        if (!category || !category.trim()) return;
        popover.remove();
        saveBtn.disabled = true;
        const result = await Api.saveItem(saveBtn.dataset.id, category.trim());
        if (result.ok) {
          saveBtn.textContent = "📁 Saved!";
          saveBtn.disabled = true;
        } else {
          saveBtn.disabled = false;
          alert(result.data?.error || "Could not save item.");
        }
      }

      // Click existing category
      popover.querySelectorAll(".collection-popover-item").forEach(btn => {
        btn.addEventListener("click", () => saveToCategory(btn.dataset.cat));
      });

      // Add new category
      const newInput = popover.querySelector(".collection-popover-input");
      popover.querySelector(".collection-popover-add").addEventListener("click", () => {
        saveToCategory(newInput.value);
      });
      newInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveToCategory(newInput.value);
        if (e.key === "Escape") popover.remove();
      });

      // Close when clicking outside
      setTimeout(() => {
        document.addEventListener("click", () => popover.remove(), { once: true });
      }, 0);
    });
  }

  const commentsSection = card.querySelector(".comments-section");
  loadComments(item.id, commentsSection, currentUserId);

  if (currentUserId) {
    const submitBtn = card.querySelector(".comment-submit");
    const input = card.querySelector(".comment-input");
    submitBtn.addEventListener("click", async () => {
      const text = input.value.trim();
      if (!text) return;
      submitBtn.disabled = true;
      const result = await Api.addComment(item.id, text);
      submitBtn.disabled = false;
      if (result.ok) {
        input.value = "";
        await loadComments(item.id, commentsSection, currentUserId);
      }
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitBtn.click();
    });
  }

  return card;
}

// Track rendered purchase IDs for polling
const renderedPurchaseIds = [];

async function loadFeed() {
  const result = await Api.getFriendsFeed();

  document.getElementById("feed-loading").classList.add("hidden");

  if (!result.ok) {
    document.getElementById("feed-empty").classList.remove("hidden");
    return;
  }

  const items = result.data || [];
  if (items.length === 0) {
    document.getElementById("feed-empty").classList.remove("hidden");
    return;
  }

  const container = document.getElementById("feed-container");
  items.forEach((item) => {
    container.appendChild(buildCard(item));
    renderedPurchaseIds.push(item.id);
  });

  startPolling();
}

// ------------------------------------------------------------------
// Real-time polling
// ------------------------------------------------------------------

function startPolling() {
  // Poll stats (clicks + me too counts) every 15 seconds
  setInterval(pollStats, 15000);
  // Poll comments every 20 seconds
  setInterval(pollComments, 20000);
}

async function pollStats() {
  if (!renderedPurchaseIds.length) return;
  const result = await Api.getPurchaseStats(renderedPurchaseIds);
  if (!result.ok) return;

  const stats = result.data;
  for (const [id, s] of Object.entries(stats)) {
    // Update click count
    const clickEl = document.querySelector(`#clicks-${id} .click-num`);
    if (clickEl) {
      const count = s.click_count;
      clickEl.textContent = count;
      const label = document.querySelector(`#clicks-${id}`);
      if (label) label.innerHTML = `👆 <span class="click-num">${count}</span> ${count === 1 ? "person" : "people"} clicked this`;
    }

    // Update me too count on badge (only if not currently open/interacting)
    const badge = document.querySelector(`.badge-also-buying-clickable[data-id="${id}"]`);
    if (badge) {
      const count = s.also_buying_count;
      const label = `🛒 ${count} ${count === 1 ? "friend is" : "friends are"} also buying this ▾`;
      if (badge.textContent.trim() !== label.trim()) {
        badge.textContent = label;
      }
    }
  }
}

async function pollComments() {
  const currentUser = Auth.currentUser();
  const currentUserId = currentUser ? currentUser.id : null;

  for (const id of renderedPurchaseIds) {
    const commentsSection = document.querySelector(`.comments-section[data-purchase-id="${id}"]`);
    if (commentsSection) {
      await loadComments(id, commentsSection, currentUserId);
    }
  }
}

loadFeed();
