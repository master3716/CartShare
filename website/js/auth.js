/**
 * website/js/auth.js
 * -------------------
 * Shared auth utility used by every website page.
 *
 * SOLID – Single Responsibility:
 *   Only handles "is the user logged in?" checks and redirects.
 *   No DOM manipulation beyond redirecting.
 *
 * Usage:
 *   Auth.requireLogin()  – redirect to index.html if not logged in
 *   Auth.redirectIfLoggedIn()  – redirect to dashboard if already logged in
 *   Auth.currentUser()   – return the saved user object
 */

const Auth = (() => {
  return {
    /**
     * If there is no token in localStorage, redirect to the login page.
     * Call this at the top of any page that requires authentication.
     */
    requireLogin() {
      if (!Api.getToken()) {
        window.location.href = "index.html";
      }
    },

    /**
     * If already logged in, redirect away from the login page.
     * Call this on index.html so logged-in users skip straight to dashboard.
     */
    redirectIfLoggedIn() {
      if (Api.getToken()) {
        window.location.href = "dashboard.html";
      }
    },

    /** Return the cached user object from localStorage, or null. */
    currentUser() {
      return Api.getSavedUser();
    },

    /** Log out and redirect to login page. */
    async logout() {
      await Api.logout();
      window.location.href = "index.html";
    },
  };
})();
