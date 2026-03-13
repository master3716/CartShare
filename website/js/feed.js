/**
 * feed.js — Social friend feed page
 */

Auth.requireLogin();

const user = Auth.currentUser();
if (user) {
  document.getElementById("nav-username").textContent = `@${user.username}`;
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
  return `
    <div class="comment" data-comment-id="${comment.id}">
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

  // Determine gifting state
  const isGiftedByCurrent = item.gifted_by && item.gifted_by === currentUserId;
  const isGiftedByOther = item.gifted_by && item.gifted_by !== currentUserId;

  let giftHtml = "";
  if (isGiftedByCurrent) {
    giftHtml = `
      <div class="gift-section">
        <span class="badge badge-gifted">🎁 You're gifting this</span>
        <button class="btn btn-sm btn-ghost btn-unclaim-gift" data-id="${item.id}">Unclaim</button>
      </div>
    `;
  } else if (isGiftedByOther) {
    giftHtml = `<div class="gift-section"><span class="badge badge-gifted">🎁 Being gifted</span></div>`;
  } else if (currentUserId) {
    giftHtml = `
      <div class="gift-section">
        <button class="btn btn-sm btn-ghost btn-gift" data-id="${item.id}">🎁 Gift this</button>
      </div>
    `;
  }

  card.innerHTML = `
    <div class="social-card-header">
      <div class="social-avatar">${initial}</div>
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
      ${giftHtml}
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

  // Gift button handler
  const giftBtn = card.querySelector(".btn-gift");
  if (giftBtn) {
    giftBtn.addEventListener("click", async () => {
      giftBtn.disabled = true;
      const result = await Api.giftPurchase(giftBtn.dataset.id);
      if (result.ok) {
        const section = giftBtn.closest(".gift-section");
        section.innerHTML = `
          <span class="badge badge-gifted">🎁 You're gifting this</span>
          <button class="btn btn-sm btn-ghost btn-unclaim-gift" data-id="${giftBtn.dataset.id}">Unclaim</button>
        `;
        section.querySelector(".btn-unclaim-gift").addEventListener("click", handleUnclaimGift);
      } else {
        giftBtn.disabled = false;
        alert(result.data && result.data.error ? result.data.error : "Could not claim gift.");
      }
    });
  }

  // Unclaim gift button handler
  const unclaimBtn = card.querySelector(".btn-unclaim-gift");
  if (unclaimBtn) {
    unclaimBtn.addEventListener("click", handleUnclaimGift);
  }

  function handleUnclaimGift(e) {
    const btn = e.currentTarget;
    btn.disabled = true;
    Api.ungiftPurchase(btn.dataset.id).then(result => {
      if (result.ok) {
        const section = btn.closest(".gift-section");
        section.innerHTML = `<button class="btn btn-sm btn-ghost btn-gift" data-id="${btn.dataset.id}">🎁 Gift this</button>`;
        section.querySelector(".btn-gift").addEventListener("click", async () => {
          const gb = section.querySelector(".btn-gift");
          gb.disabled = true;
          const r = await Api.giftPurchase(gb.dataset.id);
          if (r.ok) {
            section.innerHTML = `
              <span class="badge badge-gifted">🎁 You're gifting this</span>
              <button class="btn btn-sm btn-ghost btn-unclaim-gift" data-id="${gb.dataset.id}">Unclaim</button>
            `;
            section.querySelector(".btn-unclaim-gift").addEventListener("click", handleUnclaimGift);
          } else {
            gb.disabled = false;
            alert(r.data && r.data.error ? r.data.error : "Could not claim gift.");
          }
        });
      } else {
        btn.disabled = false;
        alert(result.data && result.data.error ? result.data.error : "Could not unclaim gift.");
      }
    });
  }

  // Save to collection button
  const saveBtn = card.querySelector(".btn-save-collection");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const category = prompt("Enter a collection name (e.g. Tech, Gift Ideas):");
      if (!category || !category.trim()) return;
      saveBtn.disabled = true;
      const result = await Api.saveItem(saveBtn.dataset.id, category.trim());
      saveBtn.disabled = false;
      if (result.ok) {
        saveBtn.textContent = "📁 Saved!";
        saveBtn.disabled = true;
      } else {
        alert(result.data && result.data.error ? result.data.error : "Could not save item.");
      }
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
  items.forEach((item) => container.appendChild(buildCard(item)));
}

loadFeed();
