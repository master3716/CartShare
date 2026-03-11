/**
 * website/js/api.js
 * ------------------
 * HTTP client for the website pages. Mirrors the extension's api_client.js
 * but reads/writes the token from localStorage (not chrome.storage).
 *
 * SOLID – Single Responsibility:
 *   Only handles HTTP communication. No DOM manipulation here.
 *
 * Usage in page scripts:
 *   const result = await Api.login(email, password);
 *   if (result.ok) { ... }
 */

// In production, APP_CONFIG.API_BASE_URL is set by website/js/config.js.
// Falls back to localhost for local development.
const API_BASE_URL =
  (typeof APP_CONFIG !== "undefined" && APP_CONFIG.API_BASE_URL)
    ? APP_CONFIG.API_BASE_URL
    : "http://127.0.0.1:5000/api";
const TOKEN_KEY = "wishlist_token";
const USER_KEY = "wishlist_user";

const Api = (() => {

  // ------------------------------------------------------------------
  // Token helpers
  // ------------------------------------------------------------------

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getSavedUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  }

  // ------------------------------------------------------------------
  // Core fetch wrapper
  // ------------------------------------------------------------------

  async function request(path, options = {}, requiresAuth = false) {
    const headers = { "Content-Type": "application/json" };

    if (requiresAuth) {
      const token = getToken();
      if (!token) return { ok: false, status: 401, data: { error: "Not logged in." } };
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(API_BASE_URL + path, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
      });

      let data = null;
      const text = await response.text();
      if (text) { try { data = JSON.parse(text); } catch { data = { raw: text }; } }

      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { error: "Cannot reach server." } };
    }
  }

  // ------------------------------------------------------------------
  // Public methods
  // ------------------------------------------------------------------

  return {
    getToken,
    getSavedUser,
    saveSession,
    clearSession,

    async register(username, email, password) {
      return request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
    },

    async login(email, password) {
      const result = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (result.ok) {
        saveSession(result.data.token, result.data.user);
      }
      return result;
    },

    async logout() {
      await request("/auth/logout", { method: "POST" }, true);
      clearSession();
    },

    async getMe() {
      return request("/users/me", {}, true);
    },

    async getUserProfile(username) {
      return request(`/users/${username}`);
    },

    async getMyPurchases() {
      return request("/purchases", {}, true);
    },

    async getUserPurchases(username) {
      return request(`/purchases/user/${username}`);
    },

    async addPurchase(item) {
      return request("/purchases", {
        method: "POST",
        body: JSON.stringify(item),
      }, true);
    },

    async deletePurchase(id) {
      return request(`/purchases/${id}`, { method: "DELETE" }, true);
    },

    async toggleVisibility(id) {
      return request(`/purchases/${id}/visibility`, { method: "PATCH" }, true);
    },

    async getFriends() {
      return request("/friends", {}, true);
    },

    async getFriendsFeed() {
      return request("/friends/feed", {}, true);
    },

    async getPendingRequests() {
      return request("/friends/requests", {}, true);
    },

    async sendFriendRequest(username) {
      return request("/friends/request", {
        method: "POST",
        body: JSON.stringify({ username }),
      }, true);
    },

    async acceptFriendRequest(requesterId) {
      return request("/friends/accept", {
        method: "POST",
        body: JSON.stringify({ requester_id: requesterId }),
      }, true);
    },

    async rejectFriendRequest(requesterId) {
      return request("/friends/reject", {
        method: "POST",
        body: JSON.stringify({ requester_id: requesterId }),
      }, true);
    },

    async removeFriend(friendId) {
      return request(`/friends/${friendId}`, { method: "DELETE" }, true);
    },

    async clickPurchase(purchaseId) {
      return request(`/purchases/${purchaseId}/click`, { method: "POST" });
    },
  };
})();
