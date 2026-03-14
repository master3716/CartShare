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
const pendingSection     = document.getElementById("pending-section");
const pendingGrid        = document.getElementById("pending-grid");
const inviteSection      = document.getElementById("invite-section");
const approvalToggleSection = document.getElementById("approval-toggle-section");
const approvalToggle     = document.getElementById("approval-toggle");
const btnLeave           = document.getElementById("btn-leave");
const btnDeleteColl      = document.getElementById("btn-delete-collection");

let currentCollabId = null;
let collabItemsAbort = null;
let pendingAbort = null;
let collabPollInterval = null;
// Last server-side counts — used by poll to detect changes without being
// confused by optimistic DOM mutations
let lastItemCount = -1;
let lastPendingCount = -1;
let lastMemberCount = -1;

function buildMemberEl(username, avatarUrl, label, onRemove) {
  const wrap = document.createElement("div");
  wrap.className = "collab-member";

  const avatarWrap = document.createElement("div");
  avatarWrap.style.position = "relative";

  const avatar = avatarUrl
    ? Object.assign(document.createElement("img"), { src: avatarUrl, className: "collab-member-avatar" })
    : Object.assign(document.createElement("div"), { className: "collab-member-avatar collab-member-avatar-initial", textContent: (username || "?")[0].toUpperCase() });
  avatarWrap.appendChild(avatar);

  if (onRemove) {
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "✕";
    removeBtn.title = "Remove member";
    removeBtn.style.cssText = "position:absolute;top:-3px;right:-3px;background:#e53935;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;";
    removeBtn.addEventListener("click", onRemove);
    avatarWrap.appendChild(removeBtn);
  }

  wrap.appendChild(avatarWrap);
  wrap.innerHTML += `<div class="collab-member-name">@${escapeHtml(username)}</div>`;
  if (label) wrap.innerHTML += `<div class="collab-member-label">${escapeHtml(label)}</div>`;
  return wrap;
}

function buildCollabItemCard(item, isPending) {
  const p = item.purchase;
  const card = document.createElement("div");
  card.className = "purchase-card";
  card.dataset.purchaseId = item.purchase_id;

  const imgHtml = p.image_url
    ? `<img class="purchase-card-img" src="${escapeHtml(p.image_url)}" alt="" />`
    : `<div class="purchase-card-img-placeholder">🛍️</div>`;

  const canRemove = !isPending && item.added_by_user_id === currentUser.id;

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
    <div class="purchase-card-actions" style="flex-direction:column;gap:6px;">
      <a href="${escapeHtml(p.product_url)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">🛒 Buy Now</a>
      ${isPending
        ? `<button class="btn btn-primary btn-sm btn-approve-item" data-purchase-id="${escapeHtml(item.purchase_id)}">✅ Approve</button>
           <button class="btn btn-danger btn-sm btn-reject-item" data-purchase-id="${escapeHtml(item.purchase_id)}">✕ Reject</button>`
        : canRemove
          ? `<button class="btn btn-danger btn-sm btn-remove-collab-item" data-purchase-id="${escapeHtml(item.purchase_id)}">Remove</button>`
          : ""}
    </div>
  `;

  return card;
}

async function openCollabCollection(collectionId) {
  currentCollabId = collectionId;
  showView(collabView);

  collabMembersStrip.innerHTML = "";
  collabItemsGrid.innerHTML = "";
  pendingGrid.innerHTML = "";
  collabItemsEmpty.classList.add("hidden");
  pendingSection.classList.add("hidden");
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

  // Member avatar strip — owner first, then members
  collabMembersStrip.appendChild(
    buildMemberEl(c.owner_username, c.owner_avatar_url || null, "Owner", null)
  );
  (c.members || []).forEach(m => {
    const onRemove = isOwner ? async () => {
      const res = await Api.removeCollectionMember(collectionId, m.id);
      if (res.ok) openCollabCollection(collectionId);
      else showToast(res.data?.error || "Failed to remove member.");
    } : null;
    collabMembersStrip.appendChild(buildMemberEl(m.username, m.avatar_url, null, onRemove));
  });

  // Controls visibility
  inviteSection.classList.toggle("hidden", !isOwner);
  approvalToggleSection.classList.toggle("hidden", !isOwner);
  btnLeave.classList.toggle("hidden", isOwner);
  btnDeleteColl.classList.toggle("hidden", !isOwner);

  // Approval toggle state
  if (isOwner) {
    approvalToggle.checked = !!c.requires_approval;
    approvalToggle.dataset.collabId = collectionId;
  }

  // Approved items
  if (!c.enriched_items || c.enriched_items.length === 0) {
    collabItemsEmpty.classList.remove("hidden");
  } else {
    c.enriched_items.forEach(item => collabItemsGrid.appendChild(buildCollabItemCard(item, false)));
  }

  // Pending items (owner only)
  if (isOwner && c.enriched_pending_items && c.enriched_pending_items.length > 0) {
    pendingSection.classList.remove("hidden");
    c.enriched_pending_items.forEach(item => pendingGrid.appendChild(buildCollabItemCard(item, true)));
  }

  lastItemCount    = (c.enriched_items || []).length;
  lastPendingCount = (isOwner && c.enriched_pending_items) ? c.enriched_pending_items.length : 0;
  lastMemberCount  = (c.members || []).length;

  attachCollabItemsHandler(collectionId);
  attachPendingHandler(collectionId);
  startCollabPolling(collectionId);
}

function attachCollabItemsHandler(collectionId) {
  if (collabItemsAbort) collabItemsAbort.abort();
  collabItemsAbort = new AbortController();
  collabItemsGrid.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-remove-collab-item");
    if (!btn) return;
    const purchaseId = btn.dataset.purchaseId;
    const card = btn.closest(".purchase-card");
    card.remove(); // optimistic
    lastItemCount = Math.max(0, lastItemCount - 1);
    if (!collabItemsGrid.children.length) collabItemsEmpty.classList.remove("hidden");
    const res = await Api.removeCollectionItem(collectionId, purchaseId);
    if (!res.ok) {
      showToast(res.data?.error || "Failed to remove item.");
      openCollabCollection(collectionId);
    }
  }, { signal: collabItemsAbort.signal });
}

function attachPendingHandler(collectionId) {
  if (pendingAbort) pendingAbort.abort();
  pendingAbort = new AbortController();
  pendingGrid.addEventListener("click", async (e) => {
    const approveBtn = e.target.closest(".btn-approve-item");
    const rejectBtn  = e.target.closest(".btn-reject-item");
    if (!approveBtn && !rejectBtn) return;
    const purchaseId = (approveBtn || rejectBtn).dataset.purchaseId;
    let res;
    if (approveBtn) {
      res = await Api.approveCollectionItem(collectionId, purchaseId);
    } else {
      res = await Api.rejectCollectionItem(collectionId, purchaseId);
    }
    if (res.ok) {
      openCollabCollection(collectionId);
    } else {
      showToast(res.data?.error || "Failed.");
    }
  }, { signal: pendingAbort.signal });
}

function stopCollabPolling() {
  if (collabPollInterval) {
    clearInterval(collabPollInterval);
    collabPollInterval = null;
  }
}

function startCollabPolling(collectionId) {
  stopCollabPolling();
  collabPollInterval = setInterval(() => pollCollab(collectionId), 5000);
}

async function pollCollab(collectionId) {
  if (collectionId !== currentCollabId) return stopCollabPolling();
  const result = await Api.getCollection(collectionId);
  if (!result.ok) return;

  const c = result.data;
  const isOwner = c.owner_id === currentUser.id;

  // Members strip
  const newMemberCount = (c.members || []).length;
  if (newMemberCount !== lastMemberCount) {
    lastMemberCount = newMemberCount;
    collabMembersStrip.innerHTML = "";
    collabMembersStrip.appendChild(
      buildMemberEl(c.owner_username, c.owner_avatar_url || null, "Owner", null)
    );
    (c.members || []).forEach(m => {
      const onRemove = isOwner ? async () => {
        const res = await Api.removeCollectionMember(collectionId, m.id);
        if (res.ok) openCollabCollection(collectionId);
        else showToast(res.data?.error || "Failed to remove member.");
      } : null;
      collabMembersStrip.appendChild(buildMemberEl(m.username, m.avatar_url, null, onRemove));
    });
  }

  // Approved items
  const newItemCount = (c.enriched_items || []).length;
  if (newItemCount !== lastItemCount) {
    lastItemCount = newItemCount;
    collabItemsGrid.innerHTML = "";
    if (newItemCount === 0) {
      collabItemsEmpty.classList.remove("hidden");
    } else {
      collabItemsEmpty.classList.add("hidden");
      c.enriched_items.forEach(item => collabItemsGrid.appendChild(buildCollabItemCard(item, false)));
    }
    attachCollabItemsHandler(collectionId);
  }

  // Pending items (owner only)
  const newPendingCount = isOwner ? (c.enriched_pending_items || []).length : 0;
  if (newPendingCount !== lastPendingCount) {
    lastPendingCount = newPendingCount;
    pendingGrid.innerHTML = "";
    if (newPendingCount > 0) {
      pendingSection.classList.remove("hidden");
      c.enriched_pending_items.forEach(item => pendingGrid.appendChild(buildCollabItemCard(item, true)));
    } else {
      pendingSection.classList.add("hidden");
    }
    attachPendingHandler(collectionId);
  }
}

document.getElementById("btn-back-collab").addEventListener("click", () => {
  stopCollabPolling();
  currentCollabId = null;
  showView(mainView);
  loadCollections();
});

// Approval toggle
approvalToggle.addEventListener("change", async () => {
  const res = await Api.toggleCollectionApproval(currentCollabId);
  if (!res.ok) {
    approvalToggle.checked = !approvalToggle.checked; // revert
    showToast(res.data?.error || "Failed to update setting.");
  }
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
