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
  attachDeleteCommentHandlers(list, purchaseId, container, currentUserId);
}

function attachDeleteCommentHandlers(list, purchaseId, container, currentUserId) {
  list.querySelectorAll(".btn-delete-comment").forEach(btn => {
    btn.addEventListener("click", async () => {
      const commentEl = btn.closest(".comment");
      commentEl.remove(); // optimistic
      const result = await Api.deleteComment(btn.dataset.id);
      if (!result.ok) {
        await loadComments(purchaseId, container, currentUserId); // revert
        showToast("Something went wrong, the comment wasn't deleted.");
      }
    });
  });
}

// Shared optimistic Me too handler — used by buildCard and pollStats re-attachment
function attachAlsoBuyingHandler(section, id, toggleListFn) {
  const btn = section.querySelector(".btn-also-buying");
  if (!btn) return;
  btn.addEventListener("click", async function handler() {
    const isActive = btn.dataset.buying === "true";
    const nowActive = !isActive;

    // Read current friend users from DOM (already excludes self)
    const friendUsers = Array.from(section.querySelectorAll(".also-buying-user")).map(el => {
      const imgEl = el.querySelector("img.also-buying-avatar");
      const username = el.textContent.trim().replace(/^@/, "").trim();
      return { username, avatar_url: imgEl ? imgEl.src : "" };
    });
    const friendCount = friendUsers.length;
    const optimisticBadgeHtml = friendCount > 0
      ? `<span class="badge badge-also-buying badge-also-buying-clickable" data-id="${id}">🛒 ${friendCount} ${friendCount === 1 ? "friend is" : "friends are"} also buying this ▾</span>
         <div class="also-buying-list hidden" id="also-list-${id}">${friendUsers.map(u => `
           <span class="also-buying-user">
             ${u.avatar_url ? `<img src="${u.avatar_url}" class="also-buying-avatar" />` : `<span class="also-buying-initial">${u.username[0].toUpperCase()}</span>`}
             @${escapeHtml(u.username)}
           </span>`).join("")}</div>`
      : "";

    section.innerHTML = `
      ${optimisticBadgeHtml}
      <button class="btn btn-sm btn-ghost btn-also-buying" data-id="${id}" data-buying="${nowActive}">
        ${nowActive ? "✓ Me too — Undo" : "🛒 Me too!"}
      </button>
    `;
    const newBadge = section.querySelector(".badge-also-buying-clickable");
    if (newBadge && toggleListFn) newBadge.addEventListener("click", toggleListFn);

    const result = isActive ? await Api.unmarkAlsoBuying(id) : await Api.markAlsoBuying(id);

    if (result.ok) {
      attachAlsoBuyingHandler(section, id, toggleListFn);
    } else {
      // Revert + toast
      const newBtn = section.querySelector(".btn-also-buying");
      if (newBtn) {
        newBtn.dataset.buying = isActive.toString();
        newBtn.textContent = isActive ? "✓ Me too — Undo" : "🛒 Me too!";
      }
      attachAlsoBuyingHandler(section, id, toggleListFn);
      showToast("Something went wrong, your action wasn't saved.");
    }
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
  // Count excludes the current user (they see "X friends" not counting themselves)
  const friendCount = iAmBuying ? alsoCount - 1 : alsoCount;
  const friendBadgeHtml = friendCount > 0
    ? `<span class="badge badge-also-buying badge-also-buying-clickable" data-id="${item.id}">🛒 ${friendCount} ${friendCount === 1 ? "friend is" : "friends are"} also buying this ▾</span>
       <div class="also-buying-list hidden" id="also-list-${item.id}">${alsoBuyingUsers.filter(u => u.id !== currentUserId && u.username !== (currentUser && currentUser.username)).map(u => `
         <span class="also-buying-user">
           ${u.avatar_url ? `<img src="${u.avatar_url}" class="also-buying-avatar" />` : `<span class="also-buying-initial">${u.username[0].toUpperCase()}</span>`}
           @${escapeHtml(u.username)}
         </span>
       `).join("")}</div>`
    : "";

  if (currentUserId) {
    alsoBuyingHtml = `
      <div class="also-buying-section" data-purchase-id="${item.id}" data-also-count="${alsoCount}">
        ${friendBadgeHtml}
        <button class="btn btn-sm btn-ghost btn-also-buying" data-id="${item.id}" data-buying="${iAmBuying}">
          ${iAmBuying ? "✓ Me too — Undo" : "🛒 Me too!"}
        </button>
      </div>
    `;
  } else if (alsoCount > 0) {
    alsoBuyingHtml = `
      <div class="also-buying-section" data-purchase-id="${item.id}" data-also-count="${alsoCount}">
        ${friendBadgeHtml}
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

  card.querySelector(".shop-btn").addEventListener("click", (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const url = btn.dataset.url;
    // Optimistic: increment count immediately, then fire request
    const clickLabel = document.querySelector(`#clicks-${id}`);
    if (clickLabel) {
      const newCount = parseInt(clickLabel.querySelector(".click-num")?.textContent || "0") + 1;
      clickLabel.innerHTML = `👆 <span class="click-num">${newCount}</span> ${newCount === 1 ? "person" : "people"} clicked this`;
    }
    window.open(url, "_blank");
    Api.clickPurchase(id); // fire and forget
  });

  // Toggle the "who's buying" dropdown when clicking the badge
  function toggleAlsoBuyingList(e) {
    const purchaseId = e.currentTarget.dataset.id;
    const list = document.querySelector(`#also-list-${purchaseId}`);
    if (list) list.classList.toggle("hidden");
  }

  const alsoBuyingSection = card.querySelector(".also-buying-section");
  if (alsoBuyingSection) {
    const badge = alsoBuyingSection.querySelector(".badge-also-buying-clickable");
    if (badge) badge.addEventListener("click", toggleAlsoBuyingList);
    attachAlsoBuyingHandler(alsoBuyingSection, item.id, toggleAlsoBuyingList);
  }

  // Save to collection — inline popover with personal categories + collaborative collections
  const saveBtn = card.querySelector(".btn-save-collection");
  if (saveBtn) {
    saveBtn.addEventListener("click", async (e) => {
      e.stopPropagation();

      // Remove any existing popover
      document.querySelectorAll(".collection-popover").forEach(p => p.remove());

      // Show popover immediately with a loading state
      const popover = document.createElement("div");
      popover.className = "collection-popover";
      popover.innerHTML = `<div class="collection-popover-section-label" style="color:#999;">Loading…</div>`;
      saveBtn.parentElement.style.position = "relative";
      saveBtn.parentElement.appendChild(popover);

      // Close on outside click
      setTimeout(() => {
        document.addEventListener("click", () => popover.remove(), { once: true });
      }, 0);

      // Fetch personal categories and collaborative collections in parallel
      const [catResult, collabResult] = await Promise.all([
        Api.getSavedItems(),
        Api.getCollections(),
      ]);

      const existingCats = catResult.ok
        ? [...new Set((catResult.data || []).map(s => s.category))]
        : [];
      const collabs = collabResult.ok ? (collabResult.data || []) : [];

      const catListHtml = existingCats.map(cat => `
        <button class="collection-popover-item" data-cat="${escapeHtml(cat)}">📁 ${escapeHtml(cat)}</button>
      `).join("");

      const collabListHtml = collabs.map(c => `
        <button class="collection-popover-item collection-popover-collab" data-collab-id="${escapeHtml(c.id)}" data-requires-approval="${c.requires_approval}">
          📋 ${escapeHtml(c.name)}${c.requires_approval ? " 🔒" : ""}
        </button>
      `).join("");

      popover.innerHTML = `
        <div class="collection-popover-section-label">Personal</div>
        ${catListHtml}
        <div class="collection-popover-new">
          <input class="collection-popover-input" type="text" placeholder="New category…" maxlength="50" />
          <button class="collection-popover-add btn btn-sm btn-primary">Add</button>
        </div>
        ${collabs.length ? `
          <div class="collection-popover-divider"></div>
          <div class="collection-popover-section-label">Collaborative</div>
          ${collabListHtml}
        ` : ""}
      `;
      popover.querySelector(".collection-popover-input").focus();

      async function saveToCategory(category) {
        if (!category || !category.trim()) return;
        const prevText = saveBtn.textContent;
        popover.remove();
        // Optimistic: show saved immediately
        saveBtn.textContent = "📁 Saved!";
        const result = await Api.saveItem(saveBtn.dataset.id, category.trim());
        if (!result.ok) {
          saveBtn.textContent = prevText;
          showToast("Something went wrong, the item wasn't saved.");
        }
      }

      async function addToCollab(collabId, requiresApproval) {
        const prevText = saveBtn.textContent;
        popover.remove();
        // Optimistic: show expected outcome immediately based on approval setting
        saveBtn.textContent = requiresApproval ? "⏳ Pending approval" : "📋 Added!";
        const result = await Api.addCollectionItem(collabId, saveBtn.dataset.id);
        if (!result.ok) {
          saveBtn.textContent = prevText;
          showToast(result.data?.error || "Something went wrong.");
        }
      }

      // Personal category clicks
      popover.querySelectorAll(".collection-popover-item:not(.collection-popover-collab)").forEach(btn => {
        btn.addEventListener("click", () => saveToCategory(btn.dataset.cat));
      });

      // Collaborative collection clicks
      popover.querySelectorAll(".collection-popover-collab").forEach(btn => {
        btn.addEventListener("click", () => addToCollab(btn.dataset.collabId, btn.dataset.requiresApproval === "true"));
      });

      // New personal category
      const newInput = popover.querySelector(".collection-popover-input");
      popover.querySelector(".collection-popover-add").addEventListener("click", () => saveToCategory(newInput.value));
      newInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveToCategory(newInput.value);
        if (e.key === "Escape") popover.remove();
      });
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

      // Optimistic: append comment instantly, looks fully real
      const list = commentsSection.querySelector(".comment-list");
      const tempComment = { id: "temp-" + Date.now(), user_id: currentUserId, username: currentUser.username, avatar_url: currentUser.avatar_url || "", text };
      const tempEl = document.createElement("div");
      tempEl.innerHTML = buildCommentHtml(tempComment, currentUserId);
      const tempNode = tempEl.firstElementChild;
      tempNode.querySelector(".btn-delete-comment")?.remove(); // no delete until confirmed
      list.appendChild(tempNode);
      input.value = "";

      const result = await Api.addComment(item.id, text);

      if (result.ok) {
        // Swap optimistic node with confirmed one (has real id + delete button)
        const real = result.data;
        real.avatar_url = currentUser.avatar_url || "";
        const realEl = document.createElement("div");
        realEl.innerHTML = buildCommentHtml(real, currentUserId);
        const realNode = realEl.firstElementChild;
        realNode.querySelector(".btn-delete-comment")?.addEventListener("click", async () => {
          realNode.remove(); // optimistic
          const delResult = await Api.deleteComment(real.id);
          if (!delResult.ok) {
            await loadComments(item.id, commentsSection, currentUserId); // revert
            showToast("Something went wrong, the comment wasn't deleted.");
          }
        });
        tempNode.replaceWith(realNode);
      } else {
        // Revert silently + toast
        tempNode.remove();
        input.value = text;
        showToast("Something went wrong, your comment wasn't posted.");
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
  setInterval(pollStats, 5000);
  setInterval(pollComments, 10000);
}

async function pollStats() {
  if (!renderedPurchaseIds.length) return;
  const result = await Api.getPurchaseStats(renderedPurchaseIds);
  if (!result.ok) return;

  const currentUser = Auth.currentUser();
  const currentUserId = currentUser ? currentUser.id : null;
  const stats = result.data;

  for (const [id, s] of Object.entries(stats)) {
    // Update click count
    const clickLabel = document.querySelector(`#clicks-${id}`);
    if (clickLabel) {
      const count = s.click_count;
      const current = parseInt(clickLabel.querySelector(".click-num")?.textContent || "0");
      if (count !== current) {
        clickLabel.innerHTML = `👆 <span class="click-num">${count}</span> ${count === 1 ? "person" : "people"} clicked this`;
      }
    }

    // Re-render the whole also-buying section if count changed
    const section = document.querySelector(`.also-buying-section[data-purchase-id="${id}"]`);
    if (!section) continue;

    const buyers = s.also_buying || [];
    const alsoBuyingUsers = s.also_buying_users || [];
    const count = buyers.length;
    const iAmBuying = currentUserId && buyers.includes(currentUserId);

    // Check if anything actually changed before touching the DOM
    const currentCount = parseInt(section.dataset.alsoCount || "0");
    if (count === currentCount) continue;
    section.dataset.alsoCount = count;

    // Skip re-render if the dropdown list is currently open (user is reading it)
    const openList = section.querySelector(`.also-buying-list:not(.hidden)`);
    if (openList) continue;

    const friendUsers = alsoBuyingUsers.filter(u => u.id !== currentUserId);
    const friendCount = friendUsers.length;
    const badgeHtml = friendCount > 0
      ? `<span class="badge badge-also-buying badge-also-buying-clickable" data-id="${id}">🛒 ${friendCount} ${friendCount === 1 ? "friend is" : "friends are"} also buying this ▾</span>
         <div class="also-buying-list hidden" id="also-list-${id}">${friendUsers.map(u => `
           <span class="also-buying-user">
             ${u.avatar_url ? `<img src="${u.avatar_url}" class="also-buying-avatar" />` : `<span class="also-buying-initial">${u.username[0].toUpperCase()}</span>`}
             @${escapeHtml(u.username)}
           </span>`).join("")}</div>`
      : "";

    const btn = section.querySelector(".btn-also-buying");
    const btnHtml = btn ? btn.outerHTML : `
      <button class="btn btn-sm btn-ghost btn-also-buying" data-id="${id}" data-buying="${iAmBuying}">
        ${iAmBuying ? "✓ Me too — Undo" : "🛒 Me too!"}
      </button>`;

    section.innerHTML = `${badgeHtml}${btnHtml}`;

    // Re-attach badge click
    const toggleList = () => {
      const list = section.querySelector(`#also-list-${id}`);
      if (list) list.classList.toggle("hidden");
    };
    const newBadge = section.querySelector(".badge-also-buying-clickable");
    if (newBadge) newBadge.addEventListener("click", toggleList);

    // Re-attach Me too button click (full optimistic, same as buildCard)
    attachAlsoBuyingHandler(section, id, toggleList);
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
