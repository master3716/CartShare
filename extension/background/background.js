/**
 * background/background.js
 * -------------------------
 * The extension's background service worker.
 *
 * In Chrome MV3, background pages were replaced by service workers.
 * This script wakes up when events occur (messages, tab changes) and
 * goes back to sleep when idle — it does NOT run continuously.
 *
 * SOLID – Single Responsibility:
 *   The background worker is the ONLY part of the extension that:
 *     - Talks to the Flask API (via ApiClient).
 *     - Manages the extension badge (the red dot on the icon).
 *     - Stores/retrieves the auth token from chrome.storage.local.
 *   The popup never calls fetch() directly; it asks the background worker.
 *
 * Why route API calls through the background?
 * -------------------------------------------
 * Content scripts run on the shopping site's origin. If they made fetch()
 * calls to 127.0.0.1:5000 the browser would block it as a cross-origin
 * request (CORS). The background worker runs on the extension's origin,
 * which is explicitly allowed in host_permissions.
 *
 * Message protocol
 * ----------------
 * All messages are plain objects: { type: "...", ...payload }.
 * Responses are: { success: true, data: ... } or { success: false, error: "..." }.
 */

// Import shared files in Chrome service worker context.
// In Firefox, these are pre-loaded via the manifest scripts array instead.
if (typeof EXTENSION_CONSTANTS === "undefined") {
  importScripts("../shared/constants.js", "../shared/api_client.js");
}

// ------------------------------------------------------------------
// Badge helpers
// ------------------------------------------------------------------

/**
 * Show a green "!" badge on the extension icon to alert the user that
 * a checkout page was detected and they should click the icon.
 */
function setBadgeAlert() {
  chrome.action.setBadgeText({ text: "!" });
  chrome.action.setBadgeBackgroundColor({ color: "#5c58a8" });
}

/** Clear the badge once the user has acknowledged it (opened the popup). */
function clearBadge() {
  chrome.action.setBadgeText({ text: "" });
}

// ------------------------------------------------------------------
// State: remember the last detected checkout info so the popup can
// pre-fill the form when it opens.
// ------------------------------------------------------------------

// This object is held in memory for the lifetime of the service worker.
// If the worker is killed (idle timeout) it resets to null — that's fine
// because the user would have navigated away from the checkout page by then.
let lastCheckoutInfo = null;

// ------------------------------------------------------------------
// Message handlers
// ------------------------------------------------------------------

/**
 * Each handler corresponds to one message type.
 * Keeping them in a lookup object (instead of a chain of if/else) makes
 * it easy to add new message types: just add a new key.
 *
 * Each handler receives (payload, sendResponse) and must call sendResponse
 * with { success, data | error }.
 */
const MESSAGE_HANDLERS = {

  /**
   * A content script detected a checkout or confirmation page.
   * Save the info and alert the user via the badge.
   */
  [EXTENSION_CONSTANTS.MSG_CHECKOUT_DETECTED](payload, sendResponse) {
    lastCheckoutInfo = {
      platform: payload.platform,
      pageType: payload.pageType,
      url: payload.url,
      tabId: payload.tabId,   // set below before dispatching
    };
    setBadgeAlert();
    sendResponse({ success: true });
  },

  /**
   * The popup is asking: "was there a recent checkout detection?"
   * Returns lastCheckoutInfo so the popup can pre-fill and auto-request
   * item data from the content script.
   */
  GET_LAST_CHECKOUT(payload, sendResponse) {
    sendResponse({ success: true, data: lastCheckoutInfo });
  },

  /**
   * The popup opened — clear the badge because the user has acknowledged it.
   */
  POPUP_OPENED(payload, sendResponse) {
    clearBadge();
    sendResponse({ success: true });
  },

  /**
   * Add a purchase.  The popup sends the fully assembled item object here
   * and the background worker calls the API.
   *
   * Routing through here (instead of calling ApiClient from the popup) keeps
   * ALL network logic in one place and avoids CORS issues.
   */
  async [EXTENSION_CONSTANTS.MSG_ADD_PURCHASE](payload, sendResponse) {
    const result = await ApiClient.addPurchase(payload.item);
    if (result.ok) {
      sendResponse({ success: true, data: result.data });
    } else {
      sendResponse({ success: false, error: result.data?.error || "Failed to save item." });
    }
  },

  /** Log in and persist the token. */
  async AUTH_LOGIN(payload, sendResponse) {
    const result = await ApiClient.login(payload.email, payload.password);
    if (result.ok) {
      // Persist the token so all future requests are authenticated.
      await chrome.storage.local.set({
        [EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN]: result.data.token,
        [EXTENSION_CONSTANTS.STORAGE_KEY_USER]: result.data.user,
      });
      sendResponse({ success: true, data: result.data });
    } else {
      sendResponse({ success: false, error: result.data?.error || "Login failed." });
    }
  },

  /** Register a new account. */
  async AUTH_REGISTER(payload, sendResponse) {
    const result = await ApiClient.register(payload.username, payload.email, payload.password);
    if (result.ok) {
      sendResponse({ success: true, data: result.data });
    } else {
      sendResponse({ success: false, error: result.data?.error || "Registration failed." });
    }
  },

  /** Log out and clear stored credentials. */
  async AUTH_LOGOUT(payload, sendResponse) {
    await ApiClient.logout();
    await chrome.storage.local.remove([
      EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN,
      EXTENSION_CONSTANTS.STORAGE_KEY_USER,
    ]);
    sendResponse({ success: true });
  },

  /** Check if the server is reachable. */
  async HEALTH_CHECK(payload, sendResponse) {
    const result = await ApiClient.healthCheck();
    sendResponse({ success: result.ok });
  },

  /**
   * Validate the stored token against the server.
   * - 401 → token is genuinely invalid; clear storage and return success:false.
   * - Network error (status 0) → server is offline/sleeping; keep session and return offline:true.
   * - 200 → token is fine; refresh the cached user object.
   */
  async VALIDATE_TOKEN(payload, sendResponse) {
    const result = await ApiClient.getMe();
    if (result.status === 401) {
      await chrome.storage.local.remove([
        EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN,
        EXTENSION_CONSTANTS.STORAGE_KEY_USER,
      ]);
      sendResponse({ success: false, error: "Session expired." });
    } else if (result.status === 0) {
      // Network error — server is sleeping; keep the user logged in.
      sendResponse({ success: true, offline: true });
    } else if (result.ok) {
      await chrome.storage.local.set({
        [EXTENSION_CONSTANTS.STORAGE_KEY_USER]: result.data,
      });
      sendResponse({ success: true, data: result.data });
    } else {
      sendResponse({ success: false, error: "Validation failed." });
    }
  },

  /** Fetch the combined public-purchase feed from all friends. */
  async GET_FRIENDS_FEED(payload, sendResponse) {
    const result = await ApiClient.getFriendsFeed();
    if (result.ok) {
      sendResponse({ success: true, data: result.data });
    } else {
      sendResponse({ success: false, error: result.data?.error || "Failed to load feed." });
    }
  },
};

// ------------------------------------------------------------------
// Single message listener — dispatches to the right handler
// ------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Attach the sender's tab id so handlers can use it.
  if (sender.tab) {
    message.tabId = sender.tab.id;
  }

  const handler = MESSAGE_HANDLERS[message.type];
  if (!handler) {
    sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
    return false;
  }

  // Handlers may be async (return a Promise).  We must return `true` from
  // the listener to keep the message channel open until sendResponse fires.
  const result = handler(message, sendResponse);
  if (result instanceof Promise) {
    result.catch((err) => sendResponse({ success: false, error: err.message }));
  }
  return true;
});
