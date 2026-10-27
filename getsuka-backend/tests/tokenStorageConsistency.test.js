import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";

/**
 * Mock Web Storage (localStorage / sessionStorage) implementation
 * for testing token storage consistency in Node.js test environment.
 */
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key)
      ? this.store[key]
      : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

/**
 * Auth lifecycle simulation matching the updated AuthProvider and interceptor logic.
 */
class AuthServiceSimulation {
  constructor(localStorage, sessionStorage) {
    this.localStorage = localStorage;
    this.sessionStorage = sessionStorage;
    this.user = null;
    this.loading = true;
  }

  // Matches AuthProvider.jsx useEffect
  init() {
    const token = this.localStorage.getItem("token");
    const savedUser = this.localStorage.getItem("user");

    if (token && savedUser) {
      try {
        this.user = JSON.parse(savedUser);
      } catch {
        this.localStorage.removeItem("token");
        this.localStorage.removeItem("user");
        this.user = null;
      }
    } else {
      this.user = null;
    }
    this.loading = false;
  }

  // Matches AuthProvider.jsx login (for standard and Google login)
  login(token, userData) {
    this.sessionStorage.removeItem("token");
    this.sessionStorage.removeItem("user");

    this.localStorage.setItem("token", token);
    this.localStorage.setItem("user", JSON.stringify(userData));

    this.user = userData;
  }

  // Matches AuthProvider.jsx logout
  logout() {
    this.localStorage.removeItem("token");
    this.localStorage.removeItem("user");
    this.sessionStorage.removeItem("token");
    this.sessionStorage.removeItem("user");

    this.user = null;
  }

  // Matches axios.js request interceptor
  applyRequestAuth(config = {}) {
    const token = this.localStorage.getItem("token");
    const headers = { ...config.headers };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return { ...config, headers };
  }

  // Matches axios.js response interceptor on 401
  handle401Error() {
    this.localStorage.removeItem("token");
    this.localStorage.removeItem("user");
    this.sessionStorage.removeItem("token");
    this.sessionStorage.removeItem("user");
    this.user = null;
  }

  // Matches ProtectedRoute.jsx guard
  checkProtectedRoute() {
    const token = this.localStorage.getItem("token");
    const savedUser = this.localStorage.getItem("user");

    if (!token || !savedUser) {
      return { allowed: false, redirect: "/login" };
    }
    return { allowed: true };
  }

  // Matches PublicRoute.jsx guard
  checkPublicRoute() {
    const token = this.localStorage.getItem("token");
    const savedUser = this.localStorage.getItem("user");

    if (token && savedUser) {
      return { allowed: false, redirect: "/" };
    }
    return { allowed: true };
  }

  // Matches App.jsx UserNavbarWrapper guard
  shouldShowUserNavbar(pathname) {
    const token = this.localStorage.getItem("token");
    const publicAuthPages = [
      "/login",
      "/register",
      "/verify-otp",
      "/forgot-password",
      "/reset-password",
    ];

    if (!token) return false;
    if (pathname.startsWith("/admin")) return false;
    if (publicAuthPages.includes(pathname)) return false;

    return true;
  }
}

describe("Step 14: Token Storage Consistency Tests", () => {
  let localStorageMock;
  let sessionStorageMock;
  let authService;

  beforeEach(() => {
    localStorageMock = new MockStorage();
    sessionStorageMock = new MockStorage();
    authService = new AuthServiceSimulation(localStorageMock, sessionStorageMock);
  });

  // ========================================================
  // TEST 1: Login stores token in localStorage and purges sessionStorage
  // ========================================================
  test("TEST 1: User login stores token & user in localStorage and purges any stale sessionStorage keys", () => {
    // Simulate pre-existing stale token in sessionStorage
    sessionStorageMock.setItem("token", "stale_session_token_123");
    sessionStorageMock.setItem("user", JSON.stringify({ name: "Old Session User" }));

    const validToken = "valid_jwt_token_abc";
    const validUser = { id: "u1", email: "user@example.com", fullName: "Test User" };

    authService.login(validToken, validUser);

    // Verify token stored in localStorage
    assert.strictEqual(localStorageMock.getItem("token"), validToken);
    assert.deepStrictEqual(JSON.parse(localStorageMock.getItem("user")), validUser);

    // Verify stale sessionStorage is purged
    assert.strictEqual(sessionStorageMock.getItem("token"), null);
    assert.strictEqual(sessionStorageMock.getItem("user"), null);
    assert.deepStrictEqual(authService.user, validUser);
  });

  // ========================================================
  // TEST 2: Page refresh restores authentication state from localStorage
  // ========================================================
  test("TEST 2: Page refresh (init) restores auth state correctly from localStorage", () => {
    const token = "persisted_token_456";
    const user = { id: "u2", email: "persisted@example.com", fullName: "Persisted User" };

    localStorageMock.setItem("token", token);
    localStorageMock.setItem("user", JSON.stringify(user));

    authService.init();

    assert.strictEqual(authService.loading, false);
    assert.deepStrictEqual(authService.user, user);
  });

  // ========================================================
  // TEST 3: Logout removes stored credentials from all mechanisms
  // ========================================================
  test("TEST 3: User logout clears token and user from both localStorage and sessionStorage", () => {
    localStorageMock.setItem("token", "token_to_remove");
    localStorageMock.setItem("user", JSON.stringify({ id: "u3" }));
    sessionStorageMock.setItem("token", "legacy_token");

    authService.logout();

    assert.strictEqual(localStorageMock.getItem("token"), null);
    assert.strictEqual(localStorageMock.getItem("user"), null);
    assert.strictEqual(sessionStorageMock.getItem("token"), null);
    assert.strictEqual(sessionStorageMock.getItem("user"), null);
    assert.strictEqual(authService.user, null);
  });

  // ========================================================
  // TEST 4: Stale token in sessionStorage cannot override authoritative localStorage token
  // ========================================================
  test("TEST 4: Stale token in sessionStorage cannot override authoritative localStorage token in API calls", () => {
    const validToken = "authoritative_active_token_999";
    localStorageMock.setItem("token", validToken);
    localStorageMock.setItem("user", JSON.stringify({ id: "u4" }));

    // Simulate attacker or stale residue in sessionStorage
    sessionStorageMock.setItem("token", "malicious_or_stale_token_000");

    const reqConfig = authService.applyRequestAuth({ url: "/api/user/profile" });

    // Header MUST use the authoritative localStorage token, not the sessionStorage token
    assert.strictEqual(reqConfig.headers.Authorization, `Bearer ${validToken}`);
  });

  // ========================================================
  // TEST 5: API 401 clears authentication state and storage
  // ========================================================
  test("TEST 5: Expired/invalid token (HTTP 401 response) triggers complete cleanup", () => {
    localStorageMock.setItem("token", "expired_token");
    localStorageMock.setItem("user", JSON.stringify({ id: "u5" }));
    sessionStorageMock.setItem("token", "residual_token");

    authService.handle401Error();

    assert.strictEqual(localStorageMock.getItem("token"), null);
    assert.strictEqual(localStorageMock.getItem("user"), null);
    assert.strictEqual(sessionStorageMock.getItem("token"), null);
    assert.strictEqual(sessionStorageMock.getItem("user"), null);
    assert.strictEqual(authService.user, null);
  });

  // ========================================================
  // TEST 6: Google login follows same consistent lifecycle
  // ========================================================
  test("TEST 6: Google login follows identical localStorage token lifecycle", () => {
    const googleToken = "google_auth_jwt_token_xyz";
    const googleUser = { id: "g1", email: "google@example.com", authProvider: "google" };

    authService.login(googleToken, googleUser);

    assert.strictEqual(localStorageMock.getItem("token"), googleToken);
    assert.deepStrictEqual(JSON.parse(localStorageMock.getItem("user")), googleUser);
    assert.strictEqual(sessionStorageMock.getItem("token"), null);

    const reqConfig = authService.applyRequestAuth({ url: "/api/user/orders" });
    assert.strictEqual(reqConfig.headers.Authorization, `Bearer ${googleToken}`);
  });

  // ========================================================
  // TEST 7: ProtectedRoute and PublicRoute guard behavior
  // ========================================================
  test("TEST 7: ProtectedRoute enforces localStorage token; PublicRoute redirects authenticated users", () => {
    // Unauthenticated
    assert.deepStrictEqual(authService.checkProtectedRoute(), {
      allowed: false,
      redirect: "/login",
    });
    assert.deepStrictEqual(authService.checkPublicRoute(), {
      allowed: true,
    });
    assert.strictEqual(authService.shouldShowUserNavbar("/shop"), false);

    // Stale sessionStorage ONLY does NOT grant access
    sessionStorageMock.setItem("token", "fake_token");
    sessionStorageMock.setItem("user", JSON.stringify({ id: "fake" }));
    assert.deepStrictEqual(authService.checkProtectedRoute(), {
      allowed: false,
      redirect: "/login",
    });
    assert.strictEqual(authService.shouldShowUserNavbar("/shop"), false);

    // Authenticated in localStorage
    localStorageMock.setItem("token", "real_token");
    localStorageMock.setItem("user", JSON.stringify({ id: "real_user" }));
    assert.deepStrictEqual(authService.checkProtectedRoute(), {
      allowed: true,
    });
    assert.deepStrictEqual(authService.checkPublicRoute(), {
      allowed: false,
      redirect: "/",
    });
    assert.strictEqual(authService.shouldShowUserNavbar("/shop"), true);
    assert.strictEqual(authService.shouldShowUserNavbar("/login"), false);
    assert.strictEqual(authService.shouldShowUserNavbar("/admin/dashboard"), false);
  });

  // ========================================================
  // TEST 8: Malformed user data in localStorage resets gracefully
  // ========================================================
  test("TEST 8: Malformed JSON in localStorage.getItem('user') does not crash application and clears corrupt state", () => {
    localStorageMock.setItem("token", "valid_token");
    localStorageMock.setItem("user", "INVALID_NOT_JSON{{");

    authService.init();

    assert.strictEqual(authService.loading, false);
    assert.strictEqual(authService.user, null);
    assert.strictEqual(localStorageMock.getItem("token"), null);
    assert.strictEqual(localStorageMock.getItem("user"), null);
  });
});
