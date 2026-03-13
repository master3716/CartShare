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

  // "Me too / also buying" state
  const alsoBuying = item.also_buying || [];
  const iAmBuying = currentUserId && alsoBuying.includes(currentUserId);
  const alsoCount = alsoBuying.length;

  let alsoBuyingHtml = "";
  if (currentUserId) {
    alsoBuyingHtml = `
      <div class="also-buying-section">
        ${alsoCount > 0 ? `<span class="badge badge-also-buying">🛒 ${alsoCount} ${alsoCount === 1 ? "friend is" : "friends are"} also buying this</span>` : ""}
        <button class="btn btn-sm btn-ghost btn-also-buying" data-id="${item.id}" data-buying="${iAmBuying}">
          ${iAmBuying ? "✓ Me too — Undo" : "🛒 Me too!"}
        </button>
      </div>
    `;
  } else if (alsoCount > 0) {
    alsoBuyingHtml = `<div class="also-buying-section"><span class="badge badge-also-buying">🛒 ${alsoCount} ${alsoCount === 1 ? "friend is" : "friends are"} also buying this</span></div>`;
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
        const section = alsoBuyingBtn.closest(".also-buying-section");
        section.innerHTML = `
          ${count > 0 ? `<span class="badge badge-also-buying">🛒 ${count} ${count === 1 ? "friend is" : "friends are"} also buying this</span>` : ""}
          <button class="btn btn-sm btn-ghost btn-also-buying" data-id="${updated.id}" data-buying="${nowActive}">
            ${nowActive ? "✓ Me too — Undo" : "🛒 Me too!"}
          </button>
        `;
        section.querySelector(".btn-also-buying").addEventListener("click", arguments.callee);
      } else {
        alsoBuyingBtn.disabled = false;
        alert(result.data && result.data.error ? result.data.error : "Could not update.");
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
