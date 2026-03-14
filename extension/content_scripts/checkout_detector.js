/**
 * content_scripts/checkout_detector.js
 * ---------------------------------------
 * Runs inside the Amazon / AliExpress page DOM.
 * Detects when the user is on a checkout or order-confirmation page
 * and notifies the background service worker so it can trigger the popup.
 *
 * SOLID – Single Responsibility:
 *   This file ONLY decides "is this a checkout/confirmation page?".
 *   It never extracts item data (that's item_extractor.js) and never
 *   shows UI (that's the popup).
 *
 * How the popup is triggered
 * --------------------------
 * We can't open the popup programmatically in MV3 — only the user can open
 * it by clicking the extension icon. What we CAN do is:
 *   1. Detect the checkout / order confirmation page here.
 *   2. Send a message to the background worker.
 *   3. The background worker sets a badge on the extension icon (a red dot
 *      with "!") so the user notices and clicks it.
 *   4. The popup reads the badge state and pre-fills the add-item form.
 *
 * Additionally, this script injects a floating "Save to WishList" button
 * directly onto the order confirmation page, giving the user a second,
 * more obvious call to action without requiring them to click the icon.
 */

// ------------------------------------------------------------------
// Page type detectors
// ------------------------------------------------------------------

/**
 * CHECKOUT_DETECTORS mirrors the platform extractor pattern: an array of
 * objects, each responsible for ONE platform.
 *
 * SOLID – Open / Closed: add a new platform → add a new object here.
 */
const CHECKOUT_DETECTORS = [
  {
    platform: EXTENSION_CONSTANTS.PLATFORM_AMAZON,

    /**
     * Amazon checkout URLs look like:
     *   amazon.com/gp/buy/...
     *   amazon.com/checkout/...
     *
     * Order confirmation pages look like:
     *   amazon.com/gp/buy/thankyou/...
     *   amazon.com/gp/css/order-history/...  (recent orders page)
     *   amazon.com/gp/your-account/order-details/...
     */
    isCheckoutPage(url) {
      return /amazon\.[a-z.]+\/gp\/buy\/(spc|addressselect|bankdata)/i.test(url)
        || /amazon\.[a-z.]+\/checkout\//i.test(url);
    },

    isConfirmationPage(url) {
      return /amazon\.[a-z.]+\/gp\/buy\/thankyou/i.test(url)
        || /amazon\.[a-z.]+\/gp\/your-account\/order-details/i.test(url);
    },

    /** True if this extractor handles the given URL at all. */
    matches(url) {
      return /amazon\.(com|co\.uk|de|fr|co\.jp|ca|com\.au)/.test(url);
    },
  },

  {
    platform: EXTENSION_CONSTANTS.PLATFORM_ALIEXPRESS,

    isCheckoutPage(url) {
      return /aliexpress\.[a-z.]+\/p\/order\/placeOrder/i.test(url)
        || /aliexpress\.[a-z.]+\/order\/.*checkout/i.test(url);
    },

    isConfirmationPage(url) {
      return /aliexpress\.[a-z.]+\/p\/order\/detail/i.test(url)
        || /aliexpress\.[a-z.]+\/orderList/i.test(url);
    },

    matches(url) {
      return /aliexpress\.(com|us)/.test(url);
    },
  },

  {
    platform: EXTENSION_CONSTANTS.PLATFORM_SHEIN,
    isCheckoutPage(url) { return /shein\.com\/checkout/.test(url); },
    isConfirmationPage(url) { return /shein\.com\/order\/success/.test(url) || /shein\.com\/user\/orders/.test(url); },
    matches(url) { return /shein\.com/.test(url); },
  },

  {
    platform: EXTENSION_CONSTANTS.PLATFORM_TEMU,
    isCheckoutPage(url) { return /temu\.com\/checkout/.test(url); },
    isConfirmationPage(url) { return /temu\.com\/order-success/.test(url) || /temu\.com\/bgn\/order/.test(url); },
    matches(url) { return /temu\.com/.test(url); },
  },

  {
    platform: EXTENSION_CONSTANTS.PLATFORM_ETSY,
    isCheckoutPage(url) { return /etsy\.com\/buy\//.test(url) || /etsy\.com\/checkout/.test(url); },
    isConfirmationPage(url) { return /etsy\.com\/your\/purchases/.test(url) || /etsy\.com\/purchased/.test(url); },
    matches(url) { return /etsy\.com/.test(url); },
  },
];

// ------------------------------------------------------------------
// Floating banner injected on confirmation pages
// ------------------------------------------------------------------

/**
 * Inject a small floating banner into the page.
 * This gives the user an obvious prompt to save the item without needing
 * to know the extension icon exists.
 *
 * We attach a click listener that opens the popup (not directly possible
 * in MV3, but we can use chrome.action.openPopup in MV3 from background).
 * Here we send a message to the background worker which will set the badge
 * and the user can then click the icon.
 */
function injectSaveBanner() {
  // Avoid injecting twice (e.g. if the page navigates in a SPA)
  if (document.getElementById("wishlist-save-banner")) return;

  const banner = document.createElement("div");
  banner.id = "wishlist-save-banner";

  // Inline styles so we don't depend on a separate CSS file being injected.
  Object.assign(banner.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "999999",
    backgroundColor: "#4CAF50",
    color: "#fff",
    padding: "14px 20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    fontFamily: "Arial, sans-serif",
    fontSize: "14px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
    transition: "opacity 0.3s",
  });

  banner.innerHTML = `
    <span style="font-size:20px">🛒</span>
    <div>
      <strong>Save to WishList Share</strong><br>
      <span style="opacity:0.85;font-size:12px">Click the extension icon to add this item</span>
    </div>
    <span id="wishlist-banner-close" style="margin-left:12px;font-size:18px;line-height:1;opacity:0.7;padding:2px 6px;">✕</span>
  `;

  document.body.appendChild(banner);

  // Close button dismisses the banner without triggering the main click.
  document.getElementById("wishlist-banner-close").addEventListener("click", (e) => {
    e.stopPropagation();
    banner.style.opacity = "0";
    setTimeout(() => banner.remove(), 300);
  });
}

// ------------------------------------------------------------------
// Main detection logic (runs once when the content script loads)
// ------------------------------------------------------------------

(function detectAndNotify() {
  const url = window.location.href;

  // Find which detector handles this URL
  const detector = CHECKOUT_DETECTORS.find((d) => d.matches(url));
  if (!detector) return;  // Not a supported platform

  const isCheckout = detector.isCheckoutPage(url);
  const isConfirmation = detector.isConfirmationPage(url);

  if (!isCheckout && !isConfirmation) return;  // Not a relevant page

  // Notify the background worker so it can set the badge icon.
  chrome.runtime.sendMessage({
    type: EXTENSION_CONSTANTS.MSG_CHECKOUT_DETECTED,
    platform: detector.platform,
    pageType: isConfirmation ? "confirmation" : "checkout",
    url,
  });

  // On order confirmation pages, also inject the floating banner.
  if (isConfirmation) {
    // Wait for the page to finish rendering before injecting.
    if (document.readyState === "complete") {
      injectSaveBanner();
    } else {
      window.addEventListener("load", injectSaveBanner);
    }
  }
})();
