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
  API_BASE_URL: "https://cartshare.onrender.com/api",

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
  PLATFORM_TEMU: "temu",
  PLATFORM_SHEIN: "shein",
  PLATFORM_ETSY: "etsy",
};

// ---------------------------------------------------------------------------
// Category auto-detection
// ---------------------------------------------------------------------------

const CATEGORY_KEYWORDS = [
  { value: "electronics",   words: ["laptop","computer","pc","phone","iphone","samsung","android","tablet","ipad","headphone","earphone","earbud","airpod","speaker","camera","monitor","keyboard","mouse","cable","charger","battery","tv","television","gaming","console","playstation","xbox","nintendo","gpu","cpu","processor","ram","ssd","hard drive","router","printer","smartwatch","watch","drone","microphone","webcam","usb","hdmi","graphics card","motherboard","power supply","led","rgb","projector"] },
  { value: "fashion",       words: ["shirt","pants","dress","shoes","sneakers","boots","jacket","coat","hoodie","sweater","jeans","skirt","blouse","suit","tie","hat","cap","scarf","gloves","handbag","purse","wallet","belt","jewelry","necklace","earring","ring","bracelet","sunglasses","glasses","clothing","apparel","fashion","shorts","leggings","swimsuit","bikini","underwear","socks","sandals","heels","loafers","lace","fabric","linen","cotton"] },
  { value: "home_kitchen",  words: ["kitchen","cookware","pan","pot","knife","blender","toaster","coffee maker","microwave","refrigerator","furniture","chair","table","sofa","couch","bed","pillow","blanket","curtain","lamp","storage","organizer","cleaning","vacuum","mop","candle","vase","rug","carpet","shelf","cabinet","drawer","mattress","frame","mirror","clock","towel","sheet","duvet"] },
  { value: "baby_kids",     words: ["baby","infant","toddler","diaper","stroller","crib","pacifier","bottle","formula","kids","children","child","newborn","maternity","nursery","baby monitor","car seat","high chair","playpen","teether","sippy"] },
  { value: "beauty_health", words: ["makeup","lipstick","foundation","mascara","skincare","moisturizer","serum","shampoo","conditioner","perfume","cologne","vitamin","supplement","protein","fitness","yoga mat","medicine","cream","lotion","sunscreen","face wash","toner","blush","eyeshadow","concealer","primer","nail","hair","brush","razor","deodorant","toothbrush","dental","health"] },
  { value: "sports",        words: ["gym","workout","exercise","weights","dumbbell","barbell","yoga","bicycle","bike","tent","camping","hiking","running","football","basketball","soccer","tennis","golf","swimming","sports","athletic","training","resistance band","jump rope","treadmill","skiing","snowboard","fishing","hunting","cycling","racket","glove","helmet","knee pad"] },
  { value: "books_media",   words: ["book","novel","textbook","kindle","magazine","music","movie","dvd","vinyl","record","audiobook","manga","comic","journal","planner","notebook","pen","pencil","art supply","painting","drawing","craft","stationery"] },
  { value: "toys_games",    words: ["toy","lego","puzzle","board game","action figure","doll","stuffed animal","playset","video game","card game","remote control","rc car","building block","play","game","figurine","collectible","model","train set"] },
  { value: "food",          words: ["food","snack","coffee","tea","chocolate","candy","protein bar","cereal","spice","sauce","oil","nuts","dried fruit","cookie","biscuit","chips","popcorn","drink","juice","energy drink","protein powder","meal prep","instant","seasoning"] },
  { value: "pets",          words: ["dog","cat","pet","collar","leash","cage","aquarium","fish","bird","hamster","rabbit","litter","pet food","treat","chew","crate","carrier","grooming","flea","pet bed","scratching post","catnip","bone"] },
];

function detectCategory(itemName, platform) {
  if (!itemName) return "";
  // Platform hint: shein is almost always fashion
  if (platform === "shein") return "fashion";
  const lower = itemName.toLowerCase();
  for (const cat of CATEGORY_KEYWORDS) {
    if (cat.words.some(w => lower.includes(w))) return cat.value;
  }
  return "";
}
