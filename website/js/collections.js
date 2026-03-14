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
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showMsg(el, text, type = "error") {
  el.className = `msg msg-${type}`;
  el.textContent = text;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// ----------------------------------------------------------------
// Collections list view
// ----------------------------------------------------------------

const spinner      = document.getElementById("collections-spinner");
const emptyEl      = document.getElementById("collections-empty");
const listEl       = document.getElementById("collections-list");
const detailSection = document.getElementById("collection-detail");

let currentCollectionId = null;

function buildCollectionRow(c) {
  const row = document.createElement("div");
  row.className = "collection-item";
  row.dataset.id = c.id;

  const isOwner = c.owner_id === currentUser.id;
  const memberCount = (c.member_ids || []).length;

  row.innerHTML = `
    <div class="collection-item-info">
      <div class="collection-item-name">📋 ${escapeHtml(c.name)}</div>
      <div class="collection-item-meta">
        ${isOwner ? "You own this" : `Owned by @${escapeHtml(c.owner_username)}`}
        · ${c.item_count} item${c.item_count !== 1 ? "s" : ""}
        · ${memberCount + 1} member${memberCount + 1 !== 1 ? "s" : ""}
      </div>
    </div>
    <span style="color:#aaa;font-size:18px;">›</span>
  `;

  row.addEventListener("click", () => openCollection(c.id));
  return row;
}

async function loadCollections() {
  const result = await Api.getCollections();
  spinner.classList.add("hidden");

  if (!result.ok) {
    showToast("Could not load collections.");
    return;
  }

  const collections = result.data;
  if (collections.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }

  listEl.innerHTML = "";
  collections.forEach(c => listEl.appendChild(buildCollectionRow(c)));
}

// ----------------------------------------------------------------
// Collection detail view
// ----------------------------------------------------------------

const detailName     = document.getElementById("detail-name");
const detailMembers  = document.getElementById("detail-members");
const detailItems    = document.getElementById("detail-items");
const detailSpinner  = document.getElementById("detail-spinner");
const detailEmpty    = document.getElementById("detail-empty");
const inviteSection  = document.getElementById("invite-section");
const btnLeave       = document.getElementById("btn-leave");
const btnDeleteColl  = document.getElementById("btn-delete-collection");

function avatarHtml(username, avatarUrl) {
  if (avatarUrl) {
    return `<img src="${escapeHtml(avatarUrl)}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;" />`;
  }
  return `<div style="width:24px;height:24px;border-radius:50%;background:#5c58a8;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;">${escapeHtml((username || "?")[0]).toUpperCase()}</div>`;
}

function buildItemCard(item) {
  const p = item.purchase;
  const card = document.createElement("div");
  card.className = "purchase-card";
  card.dataset.purchaseId = item.purchase_id;

  const imgHtml = p.image_url
    ? `<img class="purchase-card-img" src="${escapeHtml(p.image_url)}" alt="product image" />`
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
      <div style="font-size:11px;color:#999;margin-top:4px;">Added by @${escapeHtml(item.added_by_username)}</div>
    </div>
    <div class="purchase-card-actions" style="justify-content:space-between;">
      <a href="${escapeHtml(p.product_url)}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Buy Now</a>
      ${canRemove ? `<button class="btn btn-danger btn-sm btn-remove-item" data-purchase-id="${escapeHtml(item.purchase_id)}">Remove</button>` : ""}
    </div>
  `;

  return card;
}

async function openCollection(collectionId) {
  currentCollectionId = collectionId;

  // Hide list, show detail
  document.querySelector("section.card").style.display = "none";
  document.querySelector("section.card:nth-child(2)").style.display = "none";
  detailSection.classList.remove("hidden");
  detailItems.innerHTML = "";
  detailEmpty.classList.add("hidden");
  detailSpinner.classList.remove("hidden");

  const result = await Api.getCollection(collectionId);
  detailSpinner.classList.add("hidden");

  if (!result.ok) {
    showToast("Could not load collection.");
    return;
  }

  const c = result.data;
  const isOwner = c.owner_id === currentUser.id;

  detailName.textContent = c.name;

  // Members chips
  detailMembers.innerHTML = "";
  // Owner chip
  const ownerChip = document.createElement("div");
  ownerChip.className = "collection-member-chip";
  ownerChip.innerHTML = `<span>👑</span> @${escapeHtml(c.owner_username)} (owner)`;
  detailMembers.appendChild(ownerChip);

  (c.members || []).forEach(m => {
    const chip = document.createElement("div");
    chip.className = "collection-member-chip";
    chip.innerHTML = `${avatarHtml(m.username, m.avatar_url)} @${escapeHtml(m.username)}`;
    if (isOwner) {
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "✕";
      removeBtn.style.cssText = "background:none;border:none;cursor:pointer;color:#999;font-size:12px;padding:0 0 0 4px;";
      removeBtn.title = "Remove member";
      removeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const res = await Api.removeCollectionMember(collectionId, m.id);
        if (res.ok) { openCollection(collectionId); }
        else { showToast(res.data?.error || "Failed to remove member."); }
      });
      chip.appendChild(removeBtn);
    }
    detailMembers.appendChild(chip);
  });

  // Show invite form for owner
  inviteSection.classList.toggle("hidden", !isOwner);

  // Show leave / delete buttons
  btnLeave.classList.toggle("hidden", isOwner);
  btnDeleteColl.classList.toggle("hidden", !isOwner);

  // Items
  if (!c.enriched_items || c.enriched_items.length === 0) {
    detailEmpty.classList.remove("hidden");
  } else {
    c.enriched_items.forEach(item => detailItems.appendChild(buildItemCard(item)));
  }

  // Remove item handlers
  detailItems.addEventListener("click", async (e) => {
    const btn = e.target.closest(".btn-remove-item");
    if (!btn) return;
    const purchaseId = btn.dataset.purchaseId;
    const res = await Api.removeCollectionItem(collectionId, purchaseId);
    if (res.ok) {
      btn.closest(".purchase-card").remove();
      if (detailItems.children.length === 0) detailEmpty.classList.remove("hidden");
    } else {
      showToast(res.data?.error || "Failed to remove item.");
    }
  }, { once: true });
}

function closeDetail() {
  currentCollectionId = null;
  detailSection.classList.add("hidden");
  document.querySelector("section.card").style.display = "";
  document.querySelector("section.card:nth-child(2)").style.display = "";
  loadCollections();
}

document.getElementById("btn-back").addEventListener("click", closeDetail);

// Invite member
document.getElementById("invite-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("invite-username").value.trim();
  if (!username) return;
  const inviteMsg = document.getElementById("invite-msg");
  const res = await Api.inviteCollectionMember(currentCollectionId, username);
  if (res.ok) {
    showMsg(inviteMsg, `@${username} added to collection!`, "success");
    document.getElementById("invite-username").value = "";
    openCollection(currentCollectionId);
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
  const res = await Api.addCollectionItem(currentCollectionId, purchaseId);
  if (res.ok) {
    showMsg(addMsg, "Item added!", "success");
    document.getElementById("add-item-purchase-id").value = "";
    openCollection(currentCollectionId);
  } else {
    showMsg(addMsg, res.data?.error || "Failed to add item.");
  }
});

// Leave collection
btnLeave.addEventListener("click", async () => {
  if (!confirm("Leave this collection?")) return;
  const res = await Api.leaveCollection(currentCollectionId);
  if (res.ok) { closeDetail(); }
  else { showToast(res.data?.error || "Failed to leave collection."); }
});

// Delete collection
btnDeleteColl.addEventListener("click", async () => {
  if (!confirm("Delete this collection? This cannot be undone.")) return;
  const res = await Api.deleteCollection(currentCollectionId);
  if (res.ok) { closeDetail(); }
  else { showToast(res.data?.error || "Failed to delete collection."); }
});

// ----------------------------------------------------------------
// Create collection form
// ----------------------------------------------------------------

document.getElementById("create-collection-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("collection-name-input").value.trim();
  const createMsg = document.getElementById("create-msg");
  const res = await Api.createCollection(name);
  if (res.ok) {
    document.getElementById("collection-name-input").value = "";
    showMsg(createMsg, "Collection created!", "success");
    emptyEl.classList.add("hidden");
    loadCollections();
  } else {
    showMsg(createMsg, res.data?.error || "Failed to create collection.");
  }
});

// ----------------------------------------------------------------
// Boot
// ----------------------------------------------------------------

loadCollections();
