Auth.requireLogin();

const currentUser = Auth.currentUser();
if (currentUser) {
  Auth.setupNavbar(currentUser);
  document.getElementById("nav-username").textContent = `@${currentUser.username}`;
}
document.getElementById("btn-logout").addEventListener("click", () => Auth.logout());

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showMsg(el, text, type = "error") {
  el.className = `msg msg-${type}`;
  el.textContent = text;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// Views
const mainView     = document.getElementById("main-view");
const personalView = document.getElementById("personal-view");
const collabView   = document.getElementById("collab-view");

function showView(view) {
  mainView.classList.add("hidden");
  personalView.classList.add("hidden");
  collabView.classList.add("hidden");
  view.classList.remove("hidden");
}

// ----------------------------------------------------------------
// Unified list: load personal (saved items) + collaborative
// ----------------------------------------------------------------

const spinner  = document.getElementById("collections-spinner");
const emptyEl  = document.getElementById("collections-empty");
const listEl   = document.getElementById("collections-list");

async function loadCollections() {
  listEl.innerHTML = "";
  spinner.classList.remove("hidden");
  emptyEl.classList.add("hidden");

  const [savedRes, collabRes] = await Promise.all([
    Api.getSavedItems(),
    Api.getCollections(),
  ]);

  spinner.classList.add("hidden");

  const rows = [];

  // Personal categories from saved items
  if (savedRes.ok && savedRes.data.length) {
    const byCategory = {};
    for (const saved of savedRes.data) {
      if (!byCategory[saved.category]) byCategory[saved.category] = [];
      byCategory[saved.category].push(saved);
    }
    for (const [category, items] of Object.entries(byCategory)) {
      rows.push(buildPersonalRow(category, items));
    }
  }

  // Collaborative collections
  if (collabRes.ok && collabRes.data.length) {
    for (const c of collabRes.data) {
      rows.push(buildCollabRow(c));
    }
  }

  if (rows.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  rows.forEach(r => listEl.appendChild(r));
}

function buildPersonalRow(category, items) {
  const row = document.createElement("div");
  row.className = "collection-item";
  row.innerHTML = `
    <div class="collection-item-info">
      <div class="collection-item-name">📁 ${escapeHtml(category)}</div>
      <div class="collection-item-meta">Personal · ${items.length} item${items.length !== 1 ? "s" : ""}</div>
    </div>
    <span style="color:#aaa;font-size:18px;">›</span>
  `;
  row.addEventListener("click", () => openPersonalCategory(category, items));
  return row;
}

function buildCollabRow(c) {
  const row = document.createElement("div");
  row.className = "collection-item";
  const isOwner = c.owner_id === currentUser.id;
  const totalMembers = (c.member_ids || []).length + 1;
  row.innerHTML = `
    <div class="collection-item-info">
      <div class="collection-item-name">📋 ${escapeHtml(c.name)}</div>
      <div class="collection-item-meta">
        Collaborative · ${c.item_count} item${c.item_count !== 1 ? "s" : ""}
        · ${totalMembers} member${totalMembers !== 1 ? "s" : ""}
        · ${isOwner ? "You own this" : `by @${escapeHtml(c.owner_username)}`}
      </div>
    </div>
    <span style="color:#aaa;font-size:18px;">›</span>
  `;
  row.addEventListener("click", () => openCollabCollection(c.id));
  return row;
}

// ----------------------------------------------------------------
// Personal category detail
// ----------------------------------------------------------------

const personalName  = document.getElementById("personal-name");
const personalGrid  = document.getElementById("personal-grid");
const personalEmpty = document.getElementById("personal-empty");

function buildPersonalCard(saved) {
  const p = saved.purchase;
  const card = document.createElement("div");
  card.className = "purchase-card";

  const imgHtml = p.image_url
    ? `<img class="purchase-card-img" src="${escapeHtml(p.image_url)}" alt="" />`
    : `<div class="purchase-card-img-placeholder">🛍️</div>`;

  card.innerHTML = `
    ${imgHtml}
    <div class="purchase-card-body">
      <p class="purchase-card-name">${escapeHtml(p.item_name)}</p>
      ${p.price ? `<p class="purchase-card-price">${escapeHtml(p.price)}</p>` : ""}
      <div class="purchase-card-meta">
        <span class="badge badge-${escapeHtml(p.platform)}">${escapeHtml(p.platform)}</span>
      </div>
    </div>
    <div class="purchase-card-actions" style="flex-direction:column;gap:6px;">
      <a href="${escapeHtml(p.product_url)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">🛒 Buy Now</a>
      <button class="btn btn-ghost btn-sm btn-remove-saved" data-saved-id="${escapeHtml(saved.id)}" style="font-size:11px;color:#999;">✕ Remove</button>
    </div>
  `;

  return card;
}

function openPersonalCategory(category, items) {
  showView(personalView);
  personalName.textContent = `📁 ${category}`;
  personalGrid.innerHTML = "";
  personalEmpty.classList.add("hidden");

  const validItems = items.filter(s => s.purchase);
  if (validItems.length === 0) {
    personalEmpty.classList.remove("hidden");
    return;
  }

  validItems.forEach(saved => personalGrid.appendChild(buildPersonalCard(saved)));

  personalGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-remove-saved");
    if (!btn) return;
    const savedId = btn.dataset.savedId;
    const card = btn.closest(".purchase-card");
    card.remove(); // optimistic
    if (!personalGrid.children.length) personalEmpty.classList.remove("hidden");
    const res = await Api.deleteSavedItem(savedId);
    if (!res.ok) {
      showToast("Couldn't remove item.");
      loadCollections();
      showView(mainView);
    }
  }, { once: true });
}

document.getElementById("btn-back-personal").addEventListener("click", () => {
  showView(mainView);
  loadCollections();
});

// ----------------------------------------------------------------
// Collaborative collection detail (profile-style)
// ----------------------------------------------------------------

const collabName         = document.getElementById("collab-name");
const collabMembersStrip = document.getElementById("collab-members-strip");
const collabItemsGrid    = document.getElementById("collab-items-grid");
const collabItemsEmpty   = document.getElementById("collab-items-empty");
const collabItemsSpinner = document.getElementById("collab-items-spinner");
const inviteSection      = document.getElementById("invite-section");
const btnLeave           = document.getElementById("btn-leave");
const btnDeleteColl      = document.getElementById("btn-delete-collection");

let currentCollabId = null;

function memberAvatarHtml(username, avatarUrl, label) {
  const avatar = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" class="collab-member-avatar" />`
    : `<div class="collab-member-avatar collab-member-avatar-initial">${escapeHtml((username || "?")[0]).toUpperCase()}</div>`;

  return `
    <div class="collab-member">
      ${avatar}
      <div class="collab-member-name">@${escapeHtml(username)}</div>
      ${label ? `<div class="collab-member-label">${escapeHtml(label)}</div>` : ""}
    </div>
  `;
}

function buildCollabItemCard(item) {
  const p = item.purchase;
  const card = document.createElement("div");
  card.className = "purchase-card";
  card.dataset.purchaseId = item.purchase_id;

  const imgHtml = p.image_url
    ? `<img class="purchase-card-img" src="${escapeHtml(p.image_url)}" alt="" />`
    : `<div class="purchase-card-img-placeholder">🛍️</div>`;

  const canRemove = item.added_by_user_id === currentUser.id;

  card.innerHTML = `
    ${imgHtml}
    <div class="purchase-card-body">
      <div class="purchase-card-name">${escapeHtml(p.item_name)}</div>
      ${p.price ? `<div class="purchase-card-price">${escapeHtml(p.price)}</div>` : ""}
      <div class="purchase-card-meta">
        <span class="badge badge-${escapeHtml(p.platform)}">${escapeHtml(p.platform)}</span>
      </div>
      <div style="font-size:11px;color:#999;margin-top:4px;">by @${escapeHtml(item.added_by_username)}</div>
    </div>
    <div class="purchase-card-actions" style="justify-content:space-between;">
      <a href="${escapeHtml(p.product_url)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">🛒 Buy Now</a>
      ${canRemove ? `<button class="btn btn-danger btn-sm btn-remove-collab-item" data-purchase-id="${escapeHtml(item.purchase_id)}">Remove</button>` : ""}
    </div>
  `;

  return card;
}

async function openCollabCollection(collectionId) {
  currentCollabId = collectionId;
  showView(collabView);

  collabMembersStrip.innerHTML = "";
  collabItemsGrid.innerHTML = "";
  collabItemsEmpty.classList.add("hidden");
  collabItemsSpinner.classList.remove("hidden");

  const result = await Api.getCollection(collectionId);
  collabItemsSpinner.classList.add("hidden");

  if (!result.ok) {
    showToast("Could not load collection.");
    showView(mainView);
    return;
  }

  const c = result.data;
  const isOwner = c.owner_id === currentUser.id;

  collabName.textContent = c.name;

  // Build member avatar strip — owner first, then members
  const ownerUser = { username: c.owner_username, avatar_url: null };
  // Try to find owner in members list or use what we have
  collabMembersStrip.innerHTML = memberAvatarHtml(c.owner_username, null, "Owner");

  (c.members || []).forEach(m => {
    const memberEl = document.createElement("div");
    memberEl.innerHTML = memberAvatarHtml(m.username, m.avatar_url, isOwner ? null : null);

    if (isOwner) {
      // Add remove button overlay
      const avatar = memberEl.firstElementChild;
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "✕";
      removeBtn.title = "Remove member";
      removeBtn.style.cssText = "position:absolute;top:-4px;right:-4px;background:#e53935;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;";
      avatar.style.position = "relative";
      avatar.querySelector(".collab-member-avatar, img").style.cssText += "";
      // wrap avatar in relative div
      const wrap = document.createElement("div");
      wrap.style.position = "relative";
      const avatarEl = avatar.querySelector(".collab-member-avatar") || avatar.querySelector("img");
      avatarEl.parentNode.insertBefore(wrap, avatarEl);
      wrap.appendChild(avatarEl);
      wrap.appendChild(removeBtn);

      removeBtn.addEventListener("click", async () => {
        const res = await Api.removeCollectionMember(collectionId, m.id);
        if (res.ok) { openCollabCollection(collectionId); }
        else { showToast(res.data?.error || "Failed to remove member."); }
      });
    }

    collabMembersStrip.appendChild(memberEl.firstElementChild);
  });

  // Controls
  inviteSection.classList.toggle("hidden", !isOwner);
  btnLeave.classList.toggle("hidden", isOwner);
  btnDeleteColl.classList.toggle("hidden", !isOwner);

  // Items
  if (!c.enriched_items || c.enriched_items.length === 0) {
    collabItemsEmpty.classList.remove("hidden");
  } else {
    c.enriched_items.forEach(item => collabItemsGrid.appendChild(buildCollabItemCard(item)));
  }

  // Remove item handler
  collabItemsGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-remove-collab-item");
    if (!btn) return;
    const purchaseId = btn.dataset.purchaseId;
    const res = await Api.removeCollectionItem(collectionId, purchaseId);
    if (res.ok) {
      btn.closest(".purchase-card").remove();
      if (!collabItemsGrid.children.length) collabItemsEmpty.classList.remove("hidden");
    } else {
      showToast(res.data?.error || "Failed to remove item.");
    }
  }, { once: true });
}

document.getElementById("btn-back-collab").addEventListener("click", () => {
  currentCollabId = null;
  showView(mainView);
  loadCollections();
});

// Invite member
document.getElementById("invite-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("invite-username").value.trim();
  const inviteMsg = document.getElementById("invite-msg");
  if (!username) return;
  const res = await Api.inviteCollectionMember(currentCollabId, username);
  if (res.ok) {
    showMsg(inviteMsg, `@${username} added!`, "success");
    document.getElementById("invite-username").value = "";
    openCollabCollection(currentCollabId);
  } else {
    showMsg(inviteMsg, res.data?.error || "Failed to invite.");
  }
});

// Add item
document.getElementById("add-item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const purchaseId = document.getElementById("add-item-purchase-id").value.trim();
  const addMsg = document.getElementById("add-item-msg");
  if (!purchaseId) return;
  const res = await Api.addCollectionItem(currentCollabId, purchaseId);
  if (res.ok) {
    showMsg(addMsg, "Item added!", "success");
    document.getElementById("add-item-purchase-id").value = "";
    openCollabCollection(currentCollabId);
  } else {
    showMsg(addMsg, res.data?.error || "Failed to add item.");
  }
});

// Leave collection
btnLeave.addEventListener("click", async () => {
  if (!confirm("Leave this collection?")) return;
  const res = await Api.leaveCollection(currentCollabId);
  if (res.ok) { showView(mainView); loadCollections(); }
  else { showToast(res.data?.error || "Failed to leave."); }
});

// Delete collection
btnDeleteColl.addEventListener("click", async () => {
  if (!confirm("Delete this collection? This cannot be undone.")) return;
  const res = await Api.deleteCollection(currentCollabId);
  if (res.ok) { showView(mainView); loadCollections(); }
  else { showToast(res.data?.error || "Failed to delete."); }
});

// ----------------------------------------------------------------
// Create collaborative collection
// ----------------------------------------------------------------

document.getElementById("create-collection-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("collection-name-input").value.trim();
  const createMsg = document.getElementById("create-msg");
  const res = await Api.createCollection(name);
  if (res.ok) {
    document.getElementById("collection-name-input").value = "";
    showMsg(createMsg, "Collection created!", "success");
    loadCollections();
  } else {
    showMsg(createMsg, res.data?.error || "Failed to create collection.");
  }
});

// ----------------------------------------------------------------
// Boot
// ----------------------------------------------------------------

loadCollections();
