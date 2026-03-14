Auth.requireLogin();

const user = Auth.currentUser();
if (user) {
  Auth.setupNavbar(user);
  document.getElementById("nav-username").textContent = `@${user.username}`;
}

document.getElementById("btn-logout").addEventListener("click", () => Auth.logout());

const spinner = document.getElementById("notif-spinner");
const emptyEl = document.getElementById("notif-empty");
const listEl  = document.getElementById("notif-list");

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function notifIcon(type) {
  switch (type) {
    case "friend_request":  return "👋";
    case "friend_accepted": return "🤝";
    case "comment":         return "💬";
    case "me_too":          return "🛒";
    default:                return "🔔";
  }
}

function notifText(n) {
  switch (n.type) {
    case "friend_request":
      return `<strong>@${escapeHtml(n.from_username)}</strong> sent you a friend request.`;
    case "friend_accepted":
      return `<strong>@${escapeHtml(n.from_username)}</strong> accepted your friend request.`;
    case "comment":
      return `<strong>@${escapeHtml(n.from_username)}</strong> commented on your item: <em>${escapeHtml(n.item_name)}</em>`;
    case "me_too":
      return `<strong>@${escapeHtml(n.from_username)}</strong> is also buying your item: <em>${escapeHtml(n.item_name)}</em>`;
    default:
      return `New notification from <strong>@${escapeHtml(n.from_username)}</strong>.`;
  }
}

function buildNotifItem(n) {
  const item = document.createElement("div");
  item.className = "notif-item" + (n.read ? "" : " notif-unread");
  item.dataset.id = n.id;

  const avatarHtml = n.from_avatar_url
    ? `<img src="${escapeHtml(n.from_avatar_url)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
    : `<div style="width:38px;height:38px;border-radius:50%;background:#eeeef8;color:#5c58a8;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;flex-shrink:0;">${escapeHtml((n.from_username[0] || "?").toUpperCase())}</div>`;

  const date = new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  item.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f0f0f0;">
      ${avatarHtml}
      <div style="flex:1;">
        <div style="font-size:14px;">${notifIcon(n.type)} ${notifText(n)}</div>
        <div style="font-size:11px;color:#999;margin-top:3px;">${date}</div>
      </div>
      ${!n.read ? `<button class="btn btn-ghost btn-sm btn-mark-read" data-id="${n.id}" style="white-space:nowrap;">Mark read</button>` : ""}
    </div>
  `;

  return item;
}

function renderNotifications(notifications) {
  listEl.innerHTML = "";
  if (notifications.length === 0) {
    emptyEl.classList.remove("hidden");
    return;
  }
  emptyEl.classList.add("hidden");
  notifications.forEach(n => listEl.appendChild(buildNotifItem(n)));
}

async function loadNotifications() {
  // Show cached notifications instantly
  const cached = AppCache.get("notifications");
  if (cached) {
    spinner.classList.add("hidden");
    renderNotifications(cached);
  }

  const result = await Api.getNotifications();
  spinner.classList.add("hidden");

  if (!result.ok) {
    if (!cached) showToast("Could not load notifications.");
    return;
  }

  const notifications = result.data;
  AppCache.set("notifications", notifications);

  // Re-render only if something changed (count or read state)
  const changed =
    !cached ||
    cached.length !== notifications.length ||
    notifications.some((n, i) => n.id !== cached[i]?.id || n.read !== cached[i]?.read);
  if (changed) renderNotifications(notifications);

}

// Wire mark-read once (not inside loadNotifications to avoid duplicate listeners)
listEl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".btn-mark-read");
  if (!btn) return;
  const id = btn.dataset.id;
  const res = await Api.markNotificationRead(id);
  if (res.ok) {
    const item = listEl.querySelector(`[data-id="${id}"]`);
    if (item) {
      item.classList.remove("notif-unread");
      btn.remove();
    }
    AppCache.invalidate("notifications");
    Auth.refreshNotificationBell();
  }
});

document.getElementById("btn-mark-all-read").addEventListener("click", async () => {
  const res = await Api.markAllNotificationsRead();
  if (res.ok) {
    listEl.querySelectorAll(".notif-unread").forEach(el => el.classList.remove("notif-unread"));
    listEl.querySelectorAll(".btn-mark-read").forEach(el => el.remove());
    AppCache.invalidate("notifications"); // read state changed
    Auth.refreshNotificationBell();
  }
});

loadNotifications();
setInterval(loadNotifications, 30000);
