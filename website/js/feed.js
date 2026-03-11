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

function buildCard(item) {
  const card = document.createElement("div");
  card.className = "social-card";

  const initial = item.friend_username ? item.friend_username[0].toUpperCase() : "?";
  const clicks = item.click_count || 0;

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
    </div>
  `;

  card.querySelector(".shop-btn").addEventListener("click", async (e) => {
    e.preventDefault();
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const url = btn.dataset.url;

    // Increment click count
    await Api.clickPurchase(id);

    // Update count in UI
    const countEl = document.querySelector(`#clicks-${id} .click-num`);
    if (countEl) {
      const newCount = parseInt(countEl.textContent) + 1;
      countEl.textContent = newCount;
      const label = document.querySelector(`#clicks-${id}`);
      label.innerHTML = `👆 <span class="click-num">${newCount}</span> ${newCount === 1 ? "person" : "people"} clicked this`;
    }

    window.open(url, "_blank");
  });

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
