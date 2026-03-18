/**
 * popup/popup.js
 * Controller for the extension popup UI.
 */

function sendToBackground(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false, error: "No response" });
      }
    });
  });
}

async function sendToContentScript(message) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) { resolve({ success: false, error: "No active tab." }); return; }
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: "Content script not available on this page." });
        } else {
          resolve(response || { success: false });
        }
      });
    });
  });
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }
function showError(el, msg) { el.textContent = msg; show(el); }
function hideError(el) { hide(el); }

// ------------------------------------------------------------------
// DOM references
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
  itemCategoriesEl: document.getElementById("item-categories"),
  categoryAutoLabel: document.getElementById("category-auto-label"),
  itemNotes: document.getElementById("item-notes"),
  itemPublic: document.getElementById("item-public"),
  btnAddItem: document.getElementById("btn-add-item"),
  addError: document.getElementById("add-error"),
  addSuccess: document.getElementById("add-success"),
  linkDashboard: document.getElementById("link-dashboard"),
};

let currentItem = null;

function showView(viewName) {
  Object.values(views).forEach((v) => hide(v));
  show(views[viewName]);
}

function initTabSwitcher(container) {
  const buttons = container.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      buttons.forEach((b) => { const p = document.getElementById(b.dataset.tab); if (p) hide(p); });
      btn.classList.add("active");
      const panel = document.getElementById(btn.dataset.tab);
      if (panel) show(panel);
    });
  });
}

// ------------------------------------------------------------------
// Auth view
// ------------------------------------------------------------------

async function initAuthView() {
  const health = await sendToBackground({ type: "HEALTH_CHECK" });
  if (!health.success) show(auth.serverWarning);

  initTabSwitcher(views.auth);

  auth.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideError(auth.loginError);
    const result = await sendToBackground({
      type: "AUTH_LOGIN",
      email: auth.loginEmail.value.trim(),
      password: auth.loginPassword.value,
    });
    if (result.success) {
      await initMainView(result.data.user);
    } else {
      showError(auth.loginError, result.error || "Login failed.");
    }
  });

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
      auth.registerError.style.background = "#e8f5e9";
      auth.registerError.style.color = "#2e7d32";
      showError(auth.registerError, "Account created! Please log in.");
      views.auth.querySelector('[data-tab="login-form"]').click();
    } else {
      showError(auth.registerError, result.error || "Registration failed.");
    }
  });
}

// ------------------------------------------------------------------
// Main view
// ------------------------------------------------------------------

async function initMainView(user) {
  showView("main");
  main.usernameLabel.textContent = `@${user.username}`;
  main.linkDashboard.href = `https://www.shoppycat.org/`;

  main.btnLogout.onclick = async () => {
    await sendToBackground({ type: "AUTH_LOGOUT" });
    showView("auth");
    await initAuthView();
  };

  await loadItemFromCurrentTab();
  main.btnAddItem.addEventListener("click", addCurrentItem);
}

// ------------------------------------------------------------------
// Item detection
// ------------------------------------------------------------------

async function loadItemFromCurrentTab() {
  hide(main.noItemDetected);
  hide(main.itemPreview);
  hide(main.addForm);

  const response = await sendToContentScript({ type: EXTENSION_CONSTANTS.MSG_GET_ITEM_DATA });

  if (!response.success || !response.item || !response.item.item_name) {
    show(main.noItemDetected);
    return;
  }

  currentItem = response.item;
  populateItemPreview(currentItem);
}

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

  // Auto-detect and pre-select categories
  const detectedCats = detectCategories(item.item_name, item.platform);
  const catTags = main.itemCategoriesEl.querySelectorAll(".cat-tag");
  catTags.forEach(btn => {
    if (detectedCats.includes(btn.dataset.value)) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      main.categoryAutoLabel.style.display = "none";
    });
  });
  main.categoryAutoLabel.style.display = detectedCats.length ? "inline" : "none";

  show(main.itemPreview);
  show(main.addForm);
}

// ------------------------------------------------------------------
// Add item
// ------------------------------------------------------------------

async function addCurrentItem() {
  if (!currentItem) return;

  hideError(main.addError);
  hide(main.addSuccess);
  main.btnAddItem.disabled = true;
  main.btnAddItem.textContent = "Saving…";

  const selectedCats = [...main.itemCategoriesEl.querySelectorAll(".cat-tag.active")]
    .map(btn => btn.dataset.value);

  const result = await sendToBackground({
    type: EXTENSION_CONSTANTS.MSG_ADD_PURCHASE,
    item: {
      ...currentItem,
      notes: main.itemNotes.value.trim(),
      is_public: main.itemPublic.checked,
      categories: selectedCats,
    },
  });

  main.btnAddItem.disabled = false;
  main.btnAddItem.textContent = "Save to My List";

  if (result.success) {
    show(main.addSuccess);
    main.itemNotes.value = "";
    main.itemCategoriesEl.querySelectorAll(".cat-tag").forEach(b => b.classList.remove("active"));
    main.categoryAutoLabel.style.display = "none";
    main.itemPublic.checked = true;
  } else {
    showError(main.addError, result.error || "Failed to save.");
  }
}

// ------------------------------------------------------------------
// Entry point
// ------------------------------------------------------------------

(async function init() {
  await sendToBackground({ type: "POPUP_OPENED" });

  chrome.storage.local.get(
    [EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN, EXTENSION_CONSTANTS.STORAGE_KEY_USER],
    async (result) => {
      const token = result[EXTENSION_CONSTANTS.STORAGE_KEY_TOKEN];
      const user = result[EXTENSION_CONSTANTS.STORAGE_KEY_USER];

      if (token && user) {
        await initMainView(user);
        const validation = await sendToBackground({ type: "VALIDATE_TOKEN" });
        if (!validation.success && !validation.offline) {
          showView("auth");
          await initAuthView();
        }
      } else {
        showView("auth");
        await initAuthView();
      }
    }
  );
})();
