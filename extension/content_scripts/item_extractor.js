/**
 * content_scripts/item_extractor.js
 * -----------------------------------
 * Runs inside the Amazon / AliExpress page DOM.
 * Its ONLY job is to read product data from the page and return it.
 *
 * SOLID – Single Responsibility:
 *   This file only extracts data. It never sends HTTP requests, never shows
 *   UI, and never decides what to DO with the data. All that is the popup's
 *   responsibility.
 *
 * SOLID – Open / Closed:
 *   Adding a new platform means adding a new extractor object in
 *   PLATFORM_EXTRACTORS. Existing extractors are never modified.
 *
 * How it works
 * ------------
 * Each extractor object has a `matches(url)` method (returns true if this
 * extractor handles the current URL) and an `extract()` method (returns
 * a plain data object scraped from the DOM).
 *
 * The background service worker or popup calls this via:
 *   chrome.tabs.sendMessage(tabId, { type: "GET_ITEM_DATA" }, callback)
 * and this file responds with the extracted item.
 */

// ------------------------------------------------------------------
// Helper: safely get text from the first matching DOM element
// ------------------------------------------------------------------

/**
 * Try each selector in order; return the trimmed textContent of the first
 * one found, or "" if none match.
 * @param {string[]} selectors
 * @returns {string}
 */
function getText(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }
  return "";
}

/**
 * Try each selector; return the `src` or `data-src` attribute of the first
 * matching image element, or "" if none found.
 * @param {string[]} selectors
 * @returns {string}
 */
function getImageSrc(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      return el.getAttribute("src") || el.getAttribute("data-src") || "";
    }
  }
  return "";
}

// ------------------------------------------------------------------
// Platform-specific extractors
// ------------------------------------------------------------------

/**
 * PLATFORM_EXTRACTORS is an array of extractor objects.
 * The detector iterates them and uses the FIRST one whose matches() returns true.
 *
 * SOLID – Open / Closed:
 *   To add eBay support: push a new object to this array. Done.
 */
const PLATFORM_EXTRACTORS = [

  // ----------------------------------------------------------------
  // Amazon extractor
  // ----------------------------------------------------------------
  {
    platform: EXTENSION_CONSTANTS.PLATFORM_AMAZON,

    /** Returns true if the current page is an Amazon domain. */
    matches(url) {
      return /amazon\.(com|co\.uk|de|fr|co\.jp|ca|com\.au)/.test(url);
    },

    /**
     * Extract product data from an Amazon product page.
     *
     * Amazon's HTML uses several different structures depending on the
     * product category (books, electronics, clothing, etc.), so we try
     * multiple selectors for each field.
     */
    extract() {
      const itemName = getText([
        "#productTitle",
        "#title span",
        ".product-title",
      ]);

      // Amazon price can appear in several different locations depending on
      // whether the item is on sale, has variants, etc.
      const price = getText([
        "#priceblock_ourprice",
        "#priceblock_dealprice",
        ".a-price .a-offscreen",
        "#corePriceDisplay_desktop_feature_div .a-price .a-offscreen",
        "#apex_offerDisplay_desktop .a-price .a-offscreen",
      ]);

      // Extract the currency symbol separately so the server can store it.
      // The price string often includes it (e.g. "$19.99"), so we parse it out.
      const currencyMatch = price.match(/^([^0-9]+)/);
      const currency = currencyMatch ? currencyMatch[1].trim() : "";

      const imageUrl = getImageSrc([
        "#landingImage",
        "#imgBlkFront",
        "#main-image",
        ".a-dynamic-image",
      ]);

      return {
        item_name: itemName,
        price,
        currency,
        image_url: imageUrl,
        product_url: window.location.href,
        platform: this.platform,
      };
    },
  },

  // ----------------------------------------------------------------
  // AliExpress extractor
  // ----------------------------------------------------------------
  {
    platform: EXTENSION_CONSTANTS.PLATFORM_ALIEXPRESS,

    matches(url) {
      return /aliexpress\.(com|us)/.test(url);
    },

    extract() {
      // og: meta tags are stable across AliExpress redesigns and locales.
      const metaTitle = document.querySelector('meta[property="og:title"]');
      const metaImage = document.querySelector('meta[property="og:image"]');
      const metaPriceAmount = document.querySelector('meta[property="product:price:amount"]');
      const metaPriceCurrency = document.querySelector('meta[property="product:price:currency"]');

      const itemName = (metaTitle && metaTitle.content)
        ? metaTitle.content.trim()
        : getText([
            "[class*='title--wrap'] h1",
            "[class*='product-title'] h1",
            ".product-title-text",
            "h1",
          ]);

      const priceAmount = (metaPriceAmount && metaPriceAmount.content)
        ? metaPriceAmount.content.trim()
        : getText([
            "[class*='price--current']",
            "[class*='currentPrice']",
            ".product-price-value",
            ".uniform-banner-box-price",
          ]);

      const currency = (metaPriceCurrency && metaPriceCurrency.content)
        ? metaPriceCurrency.content.trim()
        : (() => {
            const m = priceAmount.match(/^([^0-9]+)/);
            return m ? m[1].trim() : "";
          })();

      const price = priceAmount;

      const imageUrl = (metaImage && metaImage.content)
        ? metaImage.content.trim()
        : getImageSrc([
            "[class*='gallery--'] img",
            "[class*='image--'] img",
            ".magnifier-image",
            ".slider-img",
          ]);

      return {
        item_name: itemName,
        price,
        currency,
        image_url: imageUrl,
        product_url: window.location.href,
        platform: this.platform,
      };
    },
  },
];

// ------------------------------------------------------------------
// Message listener: respond to requests from popup or background
// ------------------------------------------------------------------

/**
 * chrome.runtime.onMessage fires whenever another part of the extension
 * sends a message to the content script's tab.
 *
 * We respond to GET_ITEM_DATA: find the right extractor for the current URL
 * and return the extracted product data.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === EXTENSION_CONSTANTS.MSG_GET_ITEM_DATA) {
    const url = window.location.href;

    // Find the matching extractor
    const extractor = PLATFORM_EXTRACTORS.find((e) => e.matches(url));
    if (!extractor) {
      sendResponse({ success: false, error: "No extractor for this page." });
      return;
    }

    try {
      const itemData = extractor.extract();
      sendResponse({ success: true, item: itemData });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  }

  // Return true to indicate we will send a response asynchronously.
  // Without this, Chrome closes the message channel before sendResponse runs.
  return true;
});
