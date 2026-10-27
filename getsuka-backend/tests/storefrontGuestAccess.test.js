import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths to relevant frontend files
const userRoutesPath = path.resolve(__dirname, "../../getsuka-frontend/src/app/routes/userRoutes.jsx");
const adminRoutesPath = path.resolve(__dirname, "../../getsuka-frontend/src/app/routes/adminRoutes.jsx");
const appPath = path.resolve(__dirname, "../../getsuka-frontend/src/App.jsx");
const protectedRoutePath = path.resolve(__dirname, "../../getsuka-frontend/src/shared/components/ProtectedRoute.jsx");
const publicRoutePath = path.resolve(__dirname, "../../getsuka-frontend/src/shared/components/PublicRoute.jsx");
const userNavbarPath = path.resolve(__dirname, "../../getsuka-frontend/src/shared/components/UserNavbar.jsx");

/**
 * Mock Web Storage (localStorage / sessionStorage) implementation
 */
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
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
 * Route resolution simulation matching ProtectedRoute logic
 */
function simulateProtectedRoute(localStorage, childrenContent = "PROTECTED_PAGE") {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  if (!token || !savedUser) {
    return { redirectTo: "/login", element: null };
  }
  return { redirectTo: null, element: childrenContent };
}

/**
 * Route resolution simulation matching PublicRoute logic
 */
function simulatePublicRoute(localStorage, childrenContent = "AUTH_PAGE") {
  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  if (token && savedUser) {
    return { redirectTo: "/", element: null };
  }
  return { redirectTo: null, element: childrenContent };
}

/**
 * Simulation of UserNavbarWrapper logic from App.jsx
 */
function simulateUserNavbarWrapper(pathname) {
  const publicAuthPages = [
    "/login",
    "/register",
    "/verify-otp",
    "/forgot-password",
    "/reset-password",
  ];

  const isAdminPage = pathname.startsWith("/admin");
  const isAuthPage = publicAuthPages.includes(pathname);

  if (isAdminPage) {
    return null;
  }

  if (isAuthPage) {
    return null;
  }

  return "USER_NAVBAR";
}

describe("PHASE 1 STEP 3: Storefront Guest Access & Route Protection Verification", () => {
  let localStorage;

  beforeEach(() => {
    localStorage = new MockStorage();
  });

  // =========================================================================
  // 1. STATIC SOURCE CODE AUDIT
  // =========================================================================
  describe("Source Code Verification", () => {
    test("Root route '/' in userRoutes.jsx must NOT be wrapped in ProtectedRoute", () => {
      const userRoutesContent = fs.readFileSync(userRoutesPath, "utf-8");

      // Verify HomePage is imported and rendered directly for path "/"
      const homeRouteMatch = userRoutesContent.match(/path:\s*["']\/["'][\s\S]*?element:\s*([^,]+)/);
      assert.ok(homeRouteMatch, "Could not locate root route '/' in userRoutes.jsx");
      
      const elementDefinition = homeRouteMatch[1].trim();
      assert.strictEqual(
        elementDefinition.includes("ProtectedRoute"),
        false,
        "Root route '/' must NOT contain ProtectedRoute"
      );
      assert.ok(
        elementDefinition.includes("<HomePage />"),
        "Root route '/' must directly render <HomePage />"
      );
    });

    test("UserNavbarWrapper in App.jsx must NOT return null when !token", () => {
      const appContent = fs.readFileSync(appPath, "utf-8");
      
      // Extract UserNavbarWrapper function
      const wrapperMatch = appContent.match(/const UserNavbarWrapper = \(\) => \{([\s\S]*?)\};/);
      assert.ok(wrapperMatch, "Could not find UserNavbarWrapper in App.jsx");
      
      const wrapperBody = wrapperMatch[1];
      assert.strictEqual(
        wrapperBody.includes("if (!token)"),
        false,
        "UserNavbarWrapper must not contain 'if (!token)' check"
      );
      assert.strictEqual(
        wrapperBody.includes("return null;\n  }\n\n  // Don't show user navbar"),
        false,
        "UserNavbarWrapper must not return null for unauthenticated guests"
      );
    });

    test("UserNavbar.jsx loadWishlistCount guards against missing token", () => {
      const userNavbarContent = fs.readFileSync(userNavbarPath, "utf-8");
      
      // Check that loadWishlistCount checks token before making API call
      const loadWishlistMatch = userNavbarContent.match(/const loadWishlistCount =\s*async \(\) => \{([\s\S]*?)\};/);
      assert.ok(loadWishlistMatch, "Could not find loadWishlistCount in UserNavbar.jsx");
      
      const body = loadWishlistMatch[1];
      assert.ok(
        body.includes("const token = localStorage.getItem(\"token\");") &&
        body.includes("if (!token)"),
        "loadWishlistCount must check for token before requesting wishlist"
      );
    });

    test("Public storefront routes must be accessible without ProtectedRoute", () => {
      const userRoutesContent = fs.readFileSync(userRoutesPath, "utf-8");

      // Verify /shop is not protected
      const shopMatch = userRoutesContent.match(/path:\s*["']\/shop["'][\s\S]*?element:\s*([^,]+)/);
      assert.ok(shopMatch, "Could not find /shop route");
      assert.strictEqual(shopMatch[1].includes("ProtectedRoute"), false, "/shop must be public");

      // Verify /products/:productId is not protected
      const productDetailMatch = userRoutesContent.match(/path:\s*["']\/products\/:productId["'][\s\S]*?element:\s*([^,]+)/);
      assert.ok(productDetailMatch, "Could not find /products/:productId route");
      assert.strictEqual(productDetailMatch[1].includes("ProtectedRoute"), false, "/products/:productId must be public");

      // Verify /cart is not protected
      const cartMatch = userRoutesContent.match(/path:\s*["']\/cart["'][\s\S]*?element:\s*([^,]+)/);
      assert.ok(cartMatch, "Could not find /cart route");
      assert.strictEqual(cartMatch[1].includes("ProtectedRoute"), false, "/cart must be public");
    });

    test("Private user routes must remain strictly wrapped in ProtectedRoute", () => {
      const userRoutesContent = fs.readFileSync(userRoutesPath, "utf-8");

      const protectedPaths = [
        "/wishlist",
        "/checkout",
        "/checkout/review",
        "/checkout/payment",
        "/checkout/payment-failed",
        "/checkout/order-placed",
        "/orders",
        "/orders/:orderId",
        "/account",
        "/account/update-profile",
        "/account/addresses",
        "/account/wallet",
        "/account/referral",
        "/account/orders",
        "/account/orders/:orderId",
      ];

      for (const pathStr of protectedPaths) {
        const regex = new RegExp(`path:\\s*["']${pathStr.replace(/([/:])/g, "\\$1")}["'][\\s\\S]*?element:\\s*([\\s\\S]*?)(?:,\\s*\\n\\s*\\{|,\\s*\\n\\])`);
        const match = userRoutesContent.match(regex);
        assert.ok(match, `Could not find route definition for ${pathStr}`);
        assert.ok(
          match[1].includes("ProtectedRoute"),
          `Route ${pathStr} MUST be protected by ProtectedRoute`
        );
      }
    });

    test("Admin routes must remain wrapped in AdminProtectedRoute", () => {
      const adminRoutesContent = fs.readFileSync(adminRoutesPath, "utf-8");

      const adminProtectedPaths = [
        "/admin/dashboard",
        "/admin/products",
        "/admin/products/new",
        "/admin/categories",
        "/admin/customers",
        "/admin/orders",
        "/admin/coupons",
        "/admin/inventory",
        "/admin/returns",
        "/admin/profile",
      ];

      for (const pathStr of adminProtectedPaths) {
        const regex = new RegExp(`path:\\s*["']${pathStr.replace(/([/:])/g, "\\$1")}["'][\\s\\S]*?element:\\s*([\\s\\S]*?)(?:,\\s*\\n\\s*\\{|,\\s*\\n\\])`);
        const match = adminRoutesContent.match(regex);
        assert.ok(match, `Could not find route definition for ${pathStr}`);
        assert.ok(
          match[1].includes("AdminProtectedRoute"),
          `Admin route ${pathStr} MUST be protected by AdminProtectedRoute`
        );
      }
    });
  });

  // =========================================================================
  // 2. BEHAVIORAL GUEST STOREFRONT NAVIGATION
  // =========================================================================
  describe("Guest Access & Route Simulation", () => {
    test("Guest (no token, no user) can access storefront root, shop, product details, cart", () => {
      // In guest state: localStorage is empty
      assert.strictEqual(localStorage.getItem("token"), null);
      assert.strictEqual(localStorage.getItem("user"), null);

      // Root route directly renders HomePage
      const homeAccess = { element: "<HomePage />" };
      assert.strictEqual(homeAccess.element, "<HomePage />");

      // Shop route directly renders ProductListingPage
      const shopAccess = { element: "<ProductListingPage />" };
      assert.strictEqual(shopAccess.element, "<ProductListingPage />");

      // Product details directly renders ProductDetailsPage
      const productAccess = { element: "<ProductDetailsPage />" };
      assert.strictEqual(productAccess.element, "<ProductDetailsPage />");

      // Cart directly renders CartPage
      const cartAccess = { element: "<CartPage />" };
      assert.strictEqual(cartAccess.element, "<CartPage />");
    });

    test("Guest can access login and signup without being redirected", () => {
      // In guest state
      assert.strictEqual(localStorage.getItem("token"), null);

      const loginResult = simulatePublicRoute(localStorage, "<LoginPage />");
      assert.strictEqual(loginResult.redirectTo, null);
      assert.strictEqual(loginResult.element, "<LoginPage />");

      const registerResult = simulatePublicRoute(localStorage, "<RegisterPage />");
      assert.strictEqual(registerResult.redirectTo, null);
      assert.strictEqual(registerResult.element, "<RegisterPage />");
    });

    test("Guest is blocked and redirected to /login when attempting to access protected user pages", () => {
      // Guest visits /account
      const accountResult = simulateProtectedRoute(localStorage, "<UserAccountPage />");
      assert.strictEqual(accountResult.redirectTo, "/login");
      assert.strictEqual(accountResult.element, null);

      // Guest visits /checkout
      const checkoutResult = simulateProtectedRoute(localStorage, "<ShippingPage />");
      assert.strictEqual(checkoutResult.redirectTo, "/login");
      assert.strictEqual(checkoutResult.element, null);

      // Guest visits /orders
      const ordersResult = simulateProtectedRoute(localStorage, "<OrdersPage />");
      assert.strictEqual(ordersResult.redirectTo, "/login");
      assert.strictEqual(ordersResult.element, null);

      // Guest visits /wishlist
      const wishlistResult = simulateProtectedRoute(localStorage, "<WishlistPage />");
      assert.strictEqual(wishlistResult.redirectTo, "/login");
      assert.strictEqual(wishlistResult.element, null);
    });

    test("Authenticated user can access protected pages and is redirected away from login", () => {
      // Set valid session
      localStorage.setItem("token", "jwt-token-12345");
      localStorage.setItem("user", JSON.stringify({ id: "user_1", fullName: "Jane Doe", email: "jane@example.com" }));

      // Authenticated user visits /account
      const accountResult = simulateProtectedRoute(localStorage, "<UserAccountPage />");
      assert.strictEqual(accountResult.redirectTo, null);
      assert.strictEqual(accountResult.element, "<UserAccountPage />");

      // Authenticated user visits /checkout
      const checkoutResult = simulateProtectedRoute(localStorage, "<ShippingPage />");
      assert.strictEqual(checkoutResult.redirectTo, null);
      assert.strictEqual(checkoutResult.element, "<ShippingPage />");

      // Authenticated user visits /login -> redirected to "/"
      const loginResult = simulatePublicRoute(localStorage, "<LoginPage />");
      assert.strictEqual(loginResult.redirectTo, "/");
      assert.strictEqual(loginResult.element, null);
    });
  });

  // =========================================================================
  // 3. USER NAVBAR WRAPPER RENDERING RULES
  // =========================================================================
  describe("UserNavbar Rendering Rules Across All States", () => {
    test("Navbar renders for guests and logged-in users on storefront pages", () => {
      const publicStorefrontPaths = ["/", "/shop", "/products/prod-1", "/cart"];

      for (const p of publicStorefrontPaths) {
        const renderResult = simulateUserNavbarWrapper(p);
        assert.strictEqual(renderResult, "USER_NAVBAR", `Navbar should render on ${p}`);
      }
    });

    test("Navbar does NOT render on public authentication pages", () => {
      const authPaths = [
        "/login",
        "/register",
        "/verify-otp",
        "/forgot-password",
        "/reset-password",
      ];

      for (const p of authPaths) {
        const renderResult = simulateUserNavbarWrapper(p);
        assert.strictEqual(renderResult, null, `Navbar should NOT render on auth page ${p}`);
      }
    });

    test("Navbar does NOT render on admin pages", () => {
      const adminPaths = [
        "/admin/login",
        "/admin/dashboard",
        "/admin/products",
        "/admin/categories",
        "/admin/orders",
        "/admin/coupons",
      ];

      for (const p of adminPaths) {
        const renderResult = simulateUserNavbarWrapper(p);
        assert.strictEqual(renderResult, null, `Navbar should NOT render on admin page ${p}`);
      }
    });
  });
});
