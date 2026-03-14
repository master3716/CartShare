/**
 * website/js/auth.js
 * -------------------
 * Shared auth utility used by every website page.
 *
 * SOLID – Single Responsibility:
 *   Only handles "is the user logged in?" checks and redirects.
 *   No DOM manipulation beyond redirecting.
 *
 * Usage:
 *   Auth.requireLogin()  – redirect to index.html if not logged in
 *   Auth.redirectIfLoggedIn()  – redirect to dashboard if already logged in
 *   Auth.currentUser()   – return the saved user object
 */

const Auth = (() => {
  return {
    /**
     * If there is no token in localStorage, redirect to the login page.
     * Call this at the top of any page that requires authentication.
     */
    requireLogin() {
      if (!Api.getToken()) {
        window.location.href = "index.html";
      }
    },

    /**
     * If already logged in, redirect away from the login page.
     * Call this on index.html so logged-in users skip straight to dashboard.
     */
    redirectIfLoggedIn() {
      if (Api.getToken()) {
        window.location.href = "dashboard.html";
      }
    },

    /** Return the cached user object from localStorage, or null. */
    currentUser() {
      return Api.getSavedUser();
    },

    /** Log out and redirect to login page. */
    async logout() {
      await Api.logout();
      window.location.href = "index.html";
    },

    /** Set up navbar with username and clickable avatar. */
    setupNavbar(user) {
      // Set username text
      const usernameEl = document.getElementById("nav-username");
      if (usernameEl) usernameEl.textContent = `@${user.username}`;

      // Insert avatar before username
      const navLinks = document.querySelector(".nav-links");
      if (!navLinks || document.getElementById("nav-avatar-btn")) return;

      const avatarBtn = document.createElement("div");
      avatarBtn.id = "nav-avatar-btn";
      avatarBtn.title = "Change profile picture";
      avatarBtn.style.cssText = "width:32px;height:32px;border-radius:50%;cursor:pointer;overflow:hidden;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#fff;background:#7c78d8;flex-shrink:0;border:2px solid rgba(255,255,255,0.4);";

      if (user.avatar_url) {
        avatarBtn.innerHTML = `<img src="${user.avatar_url}" style="width:100%;height:100%;object-fit:cover;" />`;
      } else {
        avatarBtn.textContent = (user.username || "?")[0].toUpperCase();
      }

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);

      avatarBtn.addEventListener("click", () => fileInput.click());

      fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file) return;
        // Resize to 150x150 using canvas
        const reader = new FileReader();
        reader.onload = async (e) => {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement("canvas");
            canvas.width = 150;
            canvas.height = 150;
            const ctx = canvas.getContext("2d");
            // Cover crop
            const scale = Math.max(150 / img.width, 150 / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (150 - w) / 2, (150 - h) / 2, w, h);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            const result = await Api.updateAvatar(dataUrl);
            if (result.ok) {
              // Update cached user
              const cached = Api.getSavedUser();
              if (cached) {
                cached.avatar_url = dataUrl;
                localStorage.setItem("wishlist_user", JSON.stringify(cached));
              }
              avatarBtn.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;" />`;
            }
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        fileInput.value = "";
      });

      navLinks.insertBefore(avatarBtn, usernameEl);

      // Load notification bell unread count
      Auth.refreshNotificationBell();
    },

    async refreshNotificationBell() {
      const bell = document.getElementById("nav-bell");
      if (!bell || !Api.getToken()) return;
      const result = await Api.getUnreadCount();
      if (result.ok) {
        const badge = document.getElementById("nav-bell-badge");
        if (badge) {
          const count = result.data.count;
          badge.textContent = count > 9 ? "9+" : count > 0 ? count : "";
          badge.style.display = count > 0 ? "flex" : "none";
        }
      }
    },
  };
})();

// ------------------------------------------------------------------
// Server keep-alive (Render free tier spins down after ~15 min idle)
// Ping /api/health immediately on page load so the server starts waking
// up before the user does anything, then repeat every 14 minutes.
// ------------------------------------------------------------------
(function keepServerAlive() {
  const ping = () => fetch(API_BASE_URL.replace("/api", "") + "/api/health").catch(() => {});
  ping();
  setInterval(ping, 14 * 60 * 1000);
})();

// ------------------------------------------------------------------
// Global toast notification (available on all pages)
// ------------------------------------------------------------------
function showToast(message, type = "error") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}
