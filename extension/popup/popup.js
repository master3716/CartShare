/**
 * popup/popup.js
 * ---------------
 * Controller for the extension popup UI.
 *
 * SOLID – Single Responsibility:
 *   This file ONLY handles the popup's DOM: reading user input, showing/
 *   hiding elements, and delegating work to the background service worker
 *   via chrome.runtime.sendMessage. It never calls fetch() directly.
 *
 * SOLID – Dependency Inversion:
 *   All network calls go through sendMessage → background.js → ApiClient.
 *   If the API client implementation changes, this file is unaffected.
 *
 * Lifecycle
 * ---------
 * 1. Popup opens → tell background (clears badge) → check storage for token.
 * 2. If token exists → show main view → ask content script for item data.
 * 3. If no token   → show auth view.
 */

// ------------------------------------------------------------------
// Utility: send a message to the background worker
// ------------------------------------------------------------------

/**
 * Wrap chrome.runtime.sendMessage in a Promise so we can use async/await.
 * @param {object} message
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
function sendToBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      // If the service worker was asleep it may not respond immediately.
      // chrome.runtime.lastError tells us if the channel closed.
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false, error: "No response" });
      }
    });
  });
}

// ------------------------------------------------------------------
// Utility: send a message to the content script in the active tab
// ------------------------------------------------------------------

/**
 * @param {object} message
 * @returns {Promise<{success: boolean, item?: object, error?: string}>}
 */
async function sendToContentScript(message) {
  return new Promise((resolve) => {
    // We must query the active tab to get its id.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        resolve({ success: false, error: "No active tab." });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          // The content script isn't injected (e.g. it's not an Amazon page).
          resolve({ success: false, error: "Content script not available on this page." });
        } else {
          resolve(response || { success: false });
        }
      });
    });
  });
}

// ------------------------------------------------------------------
// Utility: show/hide elements
// ------------------------------------------------------------------

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }
function showError(el, msg) { el.textContent = msg; show(el); }
function hideError(el) { hide(el); }

// ------------------------------------------------------------------
// DOM references (cached once at startup)
// ------------------------------------------------------------------

const views = {
  loading: document.getElementById("view-loading"),
  auth: document.getElementById("view-auth"),
  main: document.getElementById("view-main"),
};

const auth = {
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  loginError: document.getElementById("login-error"),
  regUsername: document.getElementById("reg-username"),
  regEmail: document.getElementById("reg-email"),
  regPassword: document.getElementById("reg-password"),
  registerError: document.getElementById("register-error"),
  serverWarning: document.getElementById("server-warning"),
};

const main = {
  usernameLabel: document.getElementById("logged-in-username"),
  btnLogout: document.getElementById("btn-logout"),
  noItemDetected: document.getElementById("no-item-detected"),
  itemPreview: document.getElementById("item-preview"),
  previewImage: document.getElementById("preview-image"),
  previewName: document.getElementById("preview-name"),
  previewPrice: document.getElementById("preview-price"),
  previewPlatform: document.getElementById("preview-platform"),
  addForm: document.getElementById("add-form"),
  itemNotes: document.getElementById("item-notes"),
  itemPublic: document.getElementById("item-public"),
  btnAddItem: document.getElementById("btn-add-item"),
  addError: document.getElementById("add-error"),
  addSuccess: document.getElementById("add-success"),
  linkDashboard: document.getElementById("link-dashboard"),
  shareForm: document.getElementById("share-form"),
  shareUrl: document.getElementById("share-url"),
  shareName: document.getElementById("share-name"),
  sharePrice: document.getElementById("share-price"),
  sharePlatform: document.getElementById("share-platform"),
  sharePublic: document.getElementById("share-public"),
  shareError: document.getElementById("share-error"),
  shareSuccess: document.getElementById("share-success"),
};

// Holds the extracted product data from the current tab.
let currentItem = null;

// ------------------------------------------------------------------
// View switching helpers
// ------------------------------------------------------------------

function showView(viewName) {
  Object.values(views).forEach((v) => hide(v));
  show(views[viewName]);
}

// ------------------------------------------------------------------
// Tab switcher (used inside auth view AND main view)
// ------------------------------------------------------------------

/**
 * Set up a tab switcher. `container` is the element that contains the
 * .tab-btn elements, and the elements with id matching each button's
 * data-tab attribute are the content panels.
 */
function initTabSwitcher(container) {
  const buttons = container.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Deactivate all buttons and hide all panels
      buttons.forEach((b) => b.classList.remove("active"));
      buttons.forEach((b) => {
        const panel = document.getElementById(b.dataset.tab);
        if (panel) hide(panel);
      });
      // Activate clicked button and show its panel
      btn.classList.add("active");
      const panel = document.getElementById(btn.dataset.tab);
      if (panel) show(panel);
    });
  });
}

// ------------------------------------------------------------------
// Auth view logic
// ------------------------------------------------------------------

async function initAuthView() {
  // Warn if server is unreachable
  const health = await sendToBackground({ type: "HEALTH_CHECK" });
  if (!health.success) {
    show(auth.serverWarning);
  }

  // Wire tab switcher for Login/Register
  initTabSwitcher(views.auth);

  // ---- Login form submission ----
  auth.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError(auth.loginError);
    const email = auth.loginEmail.value.trim();
    const password = auth.loginPassword.value;

    const result = await sendToBackground({
      type: "AUTH_LOGIN",
      email,
      password,
    });

    if (result.success) {
      // Successfully logged in — switch to the main view.
      await initMainView(result.data.user);
    } else {
      showError(auth.loginError, result.error || "Login failed.");
    }
  });

  // ---- Register form submission ----
  auth.registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError(auth.registerError);

    const result = await sendToBackground({
      type: "AUTH_REGISTER",
      username: auth.regUsername.value.trim(),
      email: auth.regEmail.value.trim(),
      password: auth.regPassword.value,
    });

    if (result.success) {
      // Registration successful — ask them to log in.
      auth.registerError.style.background = "#e8f5e9";
      auth.registerError.style.color = "#2e7d32";
      showError(auth.registerError, "Account created! Please log in.");
      // Switch to login tab
      views.auth.querySelector('[data-tab="login-form"]').click();
    } else {
      showError(auth.registerError, result.error || "Registration failed.");
    }
  });
}

// ------------------------------------------------------------------
// Main view logic
// ------------------------------------------------------------------

async function initMainView(user) {
  showView("main");

  // Display the username
  main.usernameLabel.textContent = `@${user.username}`;

  // The dashboard link points to the user's public profile page on the website.
  main.linkDashboard.href = `http://127.0.0.1:5500/profile.html?user=${user.username}`;

  // Wire tab switcher for Add / Share
  initTabSwitcher(views.main);

  // Wire logout button
  main.btnLogout.addEventListener("click", async () => {
    await sendToBackground({ type: "AUTH_LOGOUT" });
    showView("auth");
    await initAuthView();
  });

  // Try to extract item data from the current tab
  await loadItemFromCurrentTab();

  // Wire "Add Item" button
  main.btnAddItem.addEventListener("click", addCurrentItem);

  // Wire "Share Past Purchase" form
  main.shareForm.addEventListener("submit", shareManualItem);
}

// ------------------------------------------------------------------
// Load item data from the current tab's content script
// ------------------------------------------------------------------

async function loadItemFromCurrentTab() {
  hide(main.noItemDetected);
  hide(main.itemPreview);
  hide(main.addForm);

  const response = await sendToContentScript({
    type: EXTENSION_CONSTANTS.MSG_GET_ITEM_DATA,
  });

  if (!response.success || !response.item || !response.item.item_name) {
    // Content script not present (not on Amazon/AliExpress) or extraction failed
    show(main.noItemDetected);
    return;
  }

  currentItem = response.item;
  populateItemPreview(currentItem);
}

/**
 * Populate the product preview card and show the add form.
 */
function populateItemPreview(item) {
  main.previewName.textContent = item.item_name || "Unknown product";
  main.previewPrice.textContent = item.price || "";
  main.previewPlatform.textContent = item.platform;

  if (item.image_url) {
    main.previewImage.src = item.image_url;
    main.previewImage.style.display = "block";
  } else {
    main.previewImage.style.display = "none";
  }

  show(main.itemPreview);
  show(main.addForm);
}

// ------------------------------------------------------------------
// Add the auto-detected item to the list
// ------------------------------------------------------------------

async function addCurrentItem() {
  if (!currentItem) return;

  hideError(main.addError);
  hide(main.addSuccess);
  main.btnAddItem.disabled = true;
  main.btnAddItem.textContent = "Saving…";

  const result = await sendToBackground({
    type: EXTENSION_CONSTANTS.MSG_ADD_PURCHASE,
    item: {
      ...currentItem,
      notes: main.itemNotes.value.trim(),
      is_public: main.itemPublic.checked,
    },
  });

  main.btnAddItem.disabled = false;
  main.btnAddItem.textContent = "Save to My List";

  if (result.success) {
    show(main.addSuccess);
    // Reset form
    main.itemNotes.value = "";
    main.itemPublic.checked = true;
  } else {
    showError(main.addError, result.error || "Failed to save.");
  }
}

// ------------------------------------------------------------------
// Manually add a purchase by pasting a URL ("Share Past Purchase" tab)
// ------------------------------------------------------------------

async function shareManualItem(e) {
  e.preventDefault();
  hideError(main.shareError);
  hide(main.shareSuccess);

  const url = main.shareUrl.value.trim();
  const name = main.shareName.value.trim();

  if (!url || !name) {
    showError(main.shareError, "URL and item name are required.");
    return;
  }

  // Auto-detect platform from URL if the dropdown wasn't changed
  let platform = main.sharePlatform.value;
  if (!platform) {
    platform = url.includes("aliexpress") ? "aliexpress" : "amazon";
  }

  const submitBtn = main.shareForm.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  const result = await sendToBackground({
    type: EXTENSION_CONSTANTS.MSG_ADD_PURCHASE,
    item: {
      item_name: name,
      product_url: url,
      platform,
      price: main.sharePrice.value.trim(),
      currency: "",
      image_url: "",
      notes: "",
      is_public: main.sharePublic.checked,
    },
  });

  submitBtn.disabled = false;
  submitBtn.textContent = "Add to My List";

  if (result.success) {
    show(main.shareSuccess);
    main.shareForm.reset();
  } else {
    showError(main.shareError, result.error || "Failed to save.");
  }
}

// ------------------------------------------------------------------
// Entry point: runs when the popup HTML is fully loaded
// ------------------------------------------------------------------

(async function init() {
  // Tell the background worker the popup opened (clears the badge)
  await sendToBackground({ type: "POPUP_OPENED" });

  // Check if we have a stored token
  chrome.storage.local.get(
    [EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN, EXTENSION_CONSTANTS.STORAGE_KEY_USER],
    async (result) => {
      const token = result[EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN];
      const user = result[EXTENSION_CONSTANTS.STORAGE_KEY_USER];

      if (token && user) {
        // Already logged in
        await initMainView(user);
      } else {
        // Not logged in
        showView("auth");
        await initAuthView();
      }
    }
  );
})();
