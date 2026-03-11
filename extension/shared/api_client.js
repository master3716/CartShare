/**
 * shared/api_client.js
 * ---------------------
 * All HTTP communication with the Flask server goes through this module.
 *
 * SOLID – Single Responsibility:
 *   This file only deals with HTTP. It knows nothing about the DOM, popups,
 *   or business rules.
 *
 * SOLID – Open / Closed:
 *   Adding a new endpoint means adding a new function here — existing
 *   functions are never modified.
 *
 * How auth tokens are handled
 * ---------------------------
 * On every call that needs authentication we retrieve the token from
 * chrome.storage.local and include it in the Authorization header.
 * This works because this file runs in the background service worker context
 * where chrome.storage is available.
 */

const ApiClient = (() => {
  /**
   * Retrieve the saved auth token from chrome.storage.local.
   * Returns a Promise that resolves to the token string, or null if not set.
   */
  function getToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get([EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN], (result) => {
        resolve(result[EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN] || null);
      });
    });
  }

  /**
   * Core fetch wrapper.
   *
   * @param {string} path    - URL path relative to API_BASE_URL (e.g. "/auth/login")
   * @param {object} options - Standard fetch options (method, body, etc.)
   * @param {boolean} requiresAuth - Whether to add the Authorization header
   * @returns {Promise<{ok: boolean, status: number, data: any}>}
   *
   * We return a structured object instead of throwing so callers can handle
   * errors without try/catch boilerplate.
   */
  async function request(path, options = {}, requiresAuth = false) {
    const url = EXTENSION_CONSTANTS.API_BASE_URL + path;
    const headers = { "Content-Type": "application/json" };

    if (requiresAuth) {
      const token = await getToken();
      if (!token) {
        return { ok: false, status: 401, data: { error: "Not logged in." } };
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
      });

      // Safely parse the response body as JSON.
      // If the body is empty (e.g. 204 No Content) this won't throw.
      let data = null;
      const text = await response.text();
      if (text) {
        try { data = JSON.parse(text); } catch { data = { raw: text }; }
      }

      return { ok: response.ok, status: response.status, data };
    } catch (err) {
      // Network error (server down, CORS failure, etc.)
      return { ok: false, status: 0, data: { error: err.message } };
    }
  }

  // ------------------------------------------------------------------
  // Public API methods
  // ------------------------------------------------------------------

  return {
    /**
     * Check if the server is reachable.
     * Used by the popup to show a warning if the server is not running.
     */
    async healthCheck() {
      return request("/health");
    },

    /** Register a new account. */
    async register(username, email, password) {
      return request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
    },

    /**
     * Log in. On success the caller must save the returned token to
     * chrome.storage.local under EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN.
     */
    async login(email, password) {
      return request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },

    /** Log out (invalidates token on the server). */
    async logout() {
      return request("/auth/logout", { method: "POST" }, true);
    },

    /**
     * Add a purchase to the current user's list.
     *
     * @param {object} item - { item_name, product_url, platform, price,
     *                          currency, image_url, notes, is_public }
     */
    async addPurchase(item) {
      return request("/purchases", {
        method: "POST",
        body: JSON.stringify(item),
      }, true);
    },

    /** Get all purchases for the logged-in user (public + private). */
    async getMyPurchases() {
      return request("/purchases", {}, true);
    },

    /** Delete a purchase by id. */
    async deletePurchase(purchaseId) {
      return request(`/purchases/${purchaseId}`, { method: "DELETE" }, true);
    },

    /** Toggle a purchase between public and private. */
    async toggleVisibility(purchaseId) {
      return request(`/purchases/${purchaseId}/visibility`, { method: "PATCH" }, true);
    },

    /** Get the public purchases of any user by username (no auth needed). */
    async getUserPurchases(username) {
      return request(`/purchases/user/${username}`);
    },

    /** Get the logged-in user's profile. */
    async getMe() {
      return request("/users/me", {}, true);
    },

    /** Send a friend request by username. */
    async sendFriendRequest(username) {
      return request("/friends/request", {
        method: "POST",
        body: JSON.stringify({ username }),
      }, true);
    },

    /** Accept a pending friend request by requester's user id. */
    async acceptFriendRequest(requesterId) {
      return request("/friends/accept", {
        method: "POST",
        body: JSON.stringify({ requester_id: requesterId }),
      }, true);
    },

    /** Get combined feed of friends' public purchases. */
    async getFriendsFeed() {
      return request("/friends/feed", {}, true);
    },

    /** Get list of accepted friends. */
    async getFriends() {
      return request("/friends", {}, true);
    },

    /** Get pending incoming friend requests. */
    async getPendingRequests() {
      return request("/friends/requests", {}, true);
    },
  };
})();
