/**
 * shared/constants.js
 * --------------------
 * Centralised constants shared by all extension scripts.
 *
 * SOLID – Single Responsibility:
 *   One file owns all the magic strings and numbers. If the server URL ever
 *   changes, this is the only place to update it.
 *
 * Why this file is loaded first in manifest.json content_scripts:
 *   Content scripts are loaded in the order listed. Because this file is
 *   first, EXTENSION_CONSTANTS is defined before item_extractor.js or
 *   checkout_detector.js try to use it.
 */

const EXTENSION_CONSTANTS = {
  // Production server on Render — update this before publishing the extension.
  // Example: "https://wishlist-share.onrender.com/api"
  API_BASE_URL: "https://www.shoppycat.org/api",

  // Chrome storage key where we persist the auth token between sessions.
  // chrome.storage.local survives browser restarts (unlike sessionStorage).
  STORAGE_KEY_TOKEN: "wishlist_auth_token",

  // Key for caching the logged-in user's profile object in storage.
  STORAGE_KEY_USER: "wishlist_user",

  // Message types used for communication between content scripts and
  // the background service worker (chrome.runtime.sendMessage).
  // Having named constants prevents typos like "ITEM_DETECED".
  MSG_CHECKOUT_DETECTED: "CHECKOUT_DETECTED",   // content → background
  MSG_ADD_PURCHASE: "ADD_PURCHASE",              // popup → background
  MSG_GET_ITEM_DATA: "GET_ITEM_DATA",            // popup → content script
  MSG_ITEM_DATA_RESPONSE: "ITEM_DATA_RESPONSE",  // content script → popup

  // Supported shopping platforms.  Matches the values the server accepts.
  PLATFORM_AMAZON: "amazon",
  PLATFORM_ALIEXPRESS: "aliexpress",
};
