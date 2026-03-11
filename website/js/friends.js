/**
 * website/js/friends.js
 * ----------------------
 * Logic for friends.html.
 *
 * Responsibilities:
 *   - Show accepted friends list with "View Profile" and "Unfriend" buttons.
 *   - Show pending incoming friend requests with Accept/Reject buttons.
 *   - Allow sending a new friend request by username.
 */

// ------------------------------------------------------------------
// Render helpers
// ------------------------------------------------------------------

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function getInitial(username) {
  return (username || "?")[0].toUpperCase();
}

// ------------------------------------------------------------------
// Load accepted friends
// ------------------------------------------------------------------

async function loadFriends() {
  const list = document.getElementById("friends-list");
  const empty = document.getElementById("friends-empty");
  list.innerHTML = "<span class='spinner-sm'></span> Loading…";

  const result = await Api.getFriends();
  list.innerHTML = "";

  if (!result.ok) {
    list.innerHTML = `<p class="msg msg-error">${result.data?.error || "Failed to load."}</p>`;
    return;
  }

  const friends = result.data;
  if (!friends.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  friends.forEach((friend) => {
    const item = document.createElement("div");
    item.className = "friend-item";
    item.innerHTML = `
      <div class="friend-info">
        <div class="friend-avatar">${escapeHtml(getInitial(friend.username))}</div>
        <div>
          <div class="friend-username">@${escapeHtml(friend.username)}</div>
        </div>
      </div>
      <div class="friend-actions">
        <a href="profile.html?user=${encodeURIComponent(friend.username)}"
           class="btn btn-ghost btn-sm" target="_blank">View List</a>
        <button class="btn btn-danger btn-sm btn-unfriend"
                data-id="${friend.id}" data-username="${escapeHtml(friend.username)}">
          Unfriend
        </button>
      </div>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll(".btn-unfriend").forEach((btn) => {
    btn.addEventListener("click", () => handleUnfriend(btn.dataset.id, btn.dataset.username));
  });
}

// ------------------------------------------------------------------
// Load pending requests
// ------------------------------------------------------------------

async function loadPendingRequests() {
  const list = document.getElementById("requests-list");
  const empty = document.getElementById("requests-empty");
  list.innerHTML = "<span class='spinner-sm'></span> Loading…";

  const result = await Api.getPendingRequests();
  list.innerHTML = "";

  if (!result.ok) {
    list.innerHTML = `<p class="msg msg-error">${result.data?.error || "Failed."}</p>`;
    return;
  }

  const requesters = result.data;
  if (!requesters.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  requesters.forEach((user) => {
    const item = document.createElement("div");
    item.className = "friend-item";
    item.innerHTML = `
      <div class="friend-info">
        <div class="friend-avatar">${escapeHtml(getInitial(user.username))}</div>
        <div class="friend-username">@${escapeHtml(user.username)}</div>
      </div>
      <div class="friend-actions">
        <button class="btn btn-primary btn-sm btn-accept" data-id="${user.id}">Accept</button>
        <button class="btn btn-ghost btn-sm btn-reject" data-id="${user.id}">Decline</button>
      </div>
    `;
    list.appendChild(item);
  });

  list.querySelectorAll(".btn-accept").forEach((btn) => {
    btn.addEventListener("click", () => handleAccept(btn.dataset.id));
  });
  list.querySelectorAll(".btn-reject").forEach((btn) => {
    btn.addEventListener("click", () => handleReject(btn.dataset.id));
  });
}

// ------------------------------------------------------------------
// Action handlers
// ------------------------------------------------------------------

async function handleUnfriend(friendId, username) {
  if (!confirm(`Unfriend @${username}?`)) return;
  const result = await Api.removeFriend(friendId);
  if (result.ok) await loadFriends();
  else alert(result.data?.error || "Failed to unfriend.");
}

async function handleAccept(requesterId) {
  const result = await Api.acceptFriendRequest(requesterId);
  if (result.ok) {
    await Promise.all([loadFriends(), loadPendingRequests()]);
  } else {
    alert(result.data?.error || "Failed to accept.");
  }
}

async function handleReject(requesterId) {
  const result = await Api.rejectFriendRequest(requesterId);
  if (result.ok) await loadPendingRequests();
  else alert(result.data?.error || "Failed to reject.");
}

// ------------------------------------------------------------------
// Send friend request form
// ------------------------------------------------------------------

function initSendRequestForm() {
  const form = document.getElementById("add-friend-form");
  const input = document.getElementById("friend-username-input");
  const msg = document.getElementById("add-friend-msg");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    msg.className = "msg hidden";

    const username = input.value.trim();
    if (!username) return;

    const btn = form.querySelector("button[type='submit']");
    btn.disabled = true;
    btn.textContent = "Sending…";

    const result = await Api.sendFriendRequest(username);

    btn.disabled = false;
    btn.textContent = "Send Request";

    if (result.ok) {
      msg.textContent = `Friend request sent to @${username}!`;
      msg.className = "msg msg-success";
      input.value = "";
    } else {
      msg.textContent = result.data?.error || "Failed to send request.";
      msg.className = "msg msg-error";
    }
  });
}

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------

(async function init() {
  Auth.requireLogin();

  const user = Auth.currentUser();
  if (user) document.getElementById("nav-username").textContent = `@${user.username}`;

  document.getElementById("btn-logout").addEventListener("click", () => Auth.logout());

  initSendRequestForm();

  // Load both lists in parallel
  await Promise.all([loadFriends(), loadPendingRequests()]);
})();
