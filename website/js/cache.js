/**
 * AppCache — stale-while-revalidate cache using localStorage.
 * Keys are scoped per user so different accounts don't share data.
 */
const AppCache = (() => {
  function key(name) {
    const user = Api.getSavedUser();
    return `sc_${user ? user.id : "anon"}_${name}`;
  }

  return {
    get(name) {
      try { return JSON.parse(localStorage.getItem(key(name))); }
      catch { return null; }
    },
    set(name, data) {
      try { localStorage.setItem(key(name), JSON.stringify(data)); }
      catch {} // storage quota exceeded — silently ignore
    },
    invalidate(name) {
      localStorage.removeItem(key(name));
    },
  };
})();
