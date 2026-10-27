import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Models
import User from "../src/features/auth/models/User.js";
import Admin from "../src/features/admin/models/Admin.js";
import Category from "../src/features/category/models/Category.js";
import Product from "../src/features/product/models/Product.js";
import Order from "../src/features/order/models/Order.js";
import Address from "../src/features/address/models/Address.js";
import Coupon from "../src/features/coupon/models/Coupon.js";
import Review from "../src/features/review/models/Review.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import Referral from "../src/features/referral/models/referral.js";
import Payment from "../src/features/payment/models/Payment.js";
import OtpVerification from "../src/features/auth/models/otpVerification.js";

// Middlewares
import mongoSanitizeMiddleware from "../src/middlewares/mongoSanitize.js";
import { notFoundMiddleware } from "../src/middlewares/notFoundMiddleware.js";
import { errorMiddleware } from "../src/middlewares/errorMiddleware.js";

// Routes
import authRoutes from "../src/features/auth/routes/authRoutes.js";
import adminAuthRoutes from "../src/features/admin/routes/adminAuthRoutes.js";
import adminUserRoutes from "../src/features/admin/routes/adminUserRoutes.js";
import adminProfileRoutes from "../src/features/admin/routes/adminProfileRoutes.js";
import categoryRoutes from "../src/features/category/routes/categoryRoutes.js";
import productRoutes from "../src/features/product/routes/productRoutes.js";
import publicProductRoutes from "../src/features/product/routes/publicProductRoutes.js";
import orderRoutes from "../src/features/order/routes/orderRoutes.js";
import adminOrderRoutes from "../src/features/order/routes/adminOrderRoutes.js";
import couponRoutes from "../src/features/coupon/routes/couponRoutes.js";
import userProfileRoutes from "../src/features/profile/routes/userProfileRoutes.js";
import addressRoutes from "../src/features/address/routes/addressRoutes.js";
import reviewRoutes from "../src/features/review/routes/reviewRoutes.js";
import walletRoutes from "../src/features/wallet/routes/walletRoutes.js";
import referralRoutes from "../src/features/referral/routes/referralRoutes.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_step16_integration";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_step16_integration_secret";

describe("Step 16 API Testing and Integration Coverage", () => {
  let server;
  let baseUrl;
  let testUser1;
  let testUser2;
  let testAdmin;
  let user1Token;
  let user2Token;
  let adminToken;
  let testCategory;
  let listedProduct;
  let unlistedProduct;
  let user1Address;
  let testCoupon;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    // Ensure all schema indexes are ready
    await Promise.all([
      User.init(),
      Admin.init(),
      Category.init(),
      Product.init(),
      Order.init(),
      Address.init(),
      Coupon.init(),
      Review.init(),
      Wallet.init(),
      Referral.init(),
      Payment.init(),
      OtpVerification.init(),
    ]);

    // 1. Seed Users
    const passwordHash = await bcrypt.hash("Password123!", 10);
    testUser1 = await User.create({
      fullName: "Tanjiro Kamado",
      email: "tanjiro@getsuka.com",
      password: passwordHash,
      isVerified: true,
      isBlocked: false,
    });

    testUser2 = await User.create({
      fullName: "Zenitsu Agatsuma",
      email: "zenitsu@getsuka.com",
      password: passwordHash,
      isVerified: true,
      isBlocked: false,
    });

    user1Token = jwt.sign(
      { userId: testUser1._id.toString(), email: testUser1.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    user2Token = jwt.sign(
      { userId: testUser2._id.toString(), email: testUser2.email },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    // 2. Seed Admin
    const adminPasswordHash = await bcrypt.hash("AdminPassword123!", 10);
    testAdmin = await Admin.create({
      fullName: "Kagaya Ubuyashiki",
      email: "master@getsuka.com",
      password: adminPasswordHash,
      role: "admin",
      isBlocked: false,
    });

    adminToken = jwt.sign(
      { adminId: testAdmin._id.toString(), email: testAdmin.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    // 3. Seed Category & Products
    testCategory = await Category.create({
      name: "Anime Apparel",
      isDeleted: false,
    });

    listedProduct = await Product.create({
      name: "Demon Slayer Haori Jacket",
      productCode: "HAORI-DS-01",
      description: "Traditional checkerboard green and black pattern haori",
      category: testCategory._id,
      anime: "Demon Slayer",
      price: 2499,
      salePrice: 1999,
      images: [
        "https://example.com/h1.jpg",
        "https://example.com/h2.jpg",
        "https://example.com/h3.jpg",
      ],
      variants: [
        { color: "Checkered Green", size: "L", sku: "HAORI-DS-CG-L", stock: 20 },
        { color: "Checkered Green", size: "M", sku: "HAORI-DS-CG-M", stock: 15 },
      ],
      isListed: true,
      isDeleted: false,
    });

    unlistedProduct = await Product.create({
      name: "Secret Corps Prototype Cloak",
      productCode: "CLOAK-SECRET-01",
      description: "Experimental camouflage stealth fabric cloak",
      category: testCategory._id,
      anime: "Demon Slayer",
      price: 4999,
      salePrice: 3999,
      images: [
        "https://example.com/c1.jpg",
        "https://example.com/c2.jpg",
        "https://example.com/c3.jpg",
      ],
      variants: [
        { color: "Midnight Black", size: "Standard", sku: "CLOAK-SEC-MB-STD", stock: 5 },
      ],
      isListed: false,
      isDeleted: false,
    });

    // 4. Seed Address
    user1Address = await Address.create({
      userId: testUser1._id,
      fullName: "Tanjiro Kamado",
      phone: "9876543210",
      addressLine: "Mount Kumotori, 12 Mountain Trail",
      city: "Okutama",
      state: "Tokyo",
      pincode: "198021",
      isDefault: true,
    });

    // 5. Seed Coupon
    const validFromDate = new Date();
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    testCoupon = await Coupon.create({
      code: "WELCOME500",
      discountType: "fixed",
      discountValue: 500,
      minOrderAmount: 1500,
      validFrom: validFromDate,
      validUntil: future,
      usageLimit: 100,
      usedCount: 0,
      oneUsePerUser: true,
      isActive: true,
    });

    // 6. Build Express Server exactly like server.js
    const app = express();
    app.use(express.json());
    app.use(mongoSanitizeMiddleware);

    // Mount actual production routes
    app.use("/api/auth", authRoutes);
    app.use("/api/admin/auth", adminAuthRoutes);
    app.use("/api/admin", adminUserRoutes);
    app.use("/api/admin", adminProfileRoutes);
    app.use("/api/admin", categoryRoutes);
    app.use("/api/admin", productRoutes);
    app.use("/api/admin/orders", adminOrderRoutes);
    app.use("/api/admin/coupons", couponRoutes);
    app.use("/api", publicProductRoutes);
    app.use("/api/user", userProfileRoutes);
    app.use("/api/user", addressRoutes);
    app.use("/api", reviewRoutes);
    app.use("/api/user/orders", orderRoutes);
    app.use("/api/user/wallet", walletRoutes);
    app.use("/api/user/referrals", referralRoutes);

    app.use(notFoundMiddleware);
    app.use(errorMiddleware);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================
  // 1. AUTHENTICATION & AUTHORIZATION COVERAGE
  // =========================================================
  describe("Authentication & Authorization Endpoints", () => {
    test("POST /api/auth/register -> successfully registers new user and generates pending OTP", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Inosuke Hashibira",
          email: "inosuke@getsuka.com",
          password: "BeastBreathing123!",
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.message.includes("registered successfully") || body.message.includes("OTP"));

      const savedUser = await User.findOne({ email: "inosuke@getsuka.com" });
      assert.ok(savedUser !== null);
      assert.strictEqual(savedUser.fullName, "Inosuke Hashibira");
      assert.strictEqual(savedUser.isVerified, false);
    });

    test("POST /api/auth/register -> duplicate email is rejected with 409 Conflict", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Tanjiro Duplicate",
          email: "tanjiro@getsuka.com",
          password: "Password123!",
        }),
      });

      assert.strictEqual(res.status, 409);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes("already registered") || body.message.includes("already exists"));
    });

    test("POST /api/auth/login -> valid user credentials return token and user details", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "tanjiro@getsuka.com",
          password: "Password123!",
        }),
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.token);
      assert.strictEqual(body.user.email, "tanjiro@getsuka.com");
      assert.strictEqual(body.user.password, undefined, "Password hash must not be exposed");
    });

    test("POST /api/auth/login -> incorrect password returns 401 Unauthorized", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "tanjiro@getsuka.com",
          password: "WrongPassword999!",
        }),
      });

      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, "Invalid email or password");
    });

    test("POST /api/admin/auth/login -> valid admin credentials return admin token", async () => {
      const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "master@getsuka.com",
          password: "AdminPassword123!",
        }),
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.token);
      assert.strictEqual(body.admin.email, "master@getsuka.com");
      assert.strictEqual(body.admin.role, "admin");
    });

    test("Protected User Route without token -> rejected with 401 Unauthorized", async () => {
      const res = await fetch(`${baseUrl}/api/user/profile`);
      assert.strictEqual(res.status, 401);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test("Admin Route accessed with normal user token -> rejected with 403 Forbidden", async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });
      assert.strictEqual(res.status, 403);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });
  });

  // =========================================================
  // 2. PUBLIC PRODUCTS & CART BULK STOCK COVERAGE
  // =========================================================
  describe("Public Products Catalog & Bulk Stock Verification", () => {
    test("GET /api/products -> returns listed products, filters out unlisted products", async () => {
      const res = await fetch(`${baseUrl}/api/products`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.products));

      // Listed product must be present
      const hasListed = body.products.some((p) => p.name === "Demon Slayer Haori Jacket");
      assert.strictEqual(hasListed, true);

      // Unlisted product must be excluded
      const hasUnlisted = body.products.some((p) => p.name === "Secret Corps Prototype Cloak");
      assert.strictEqual(hasUnlisted, false, "Unlisted products must never appear in public catalog");
    });

    test("GET /api/products?search=Haori -> search returns matching products", async () => {
      const res = await fetch(`${baseUrl}/api/products?search=Haori`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.ok(body.products.length > 0);
      assert.strictEqual(body.products[0].name, "Demon Slayer Haori Jacket");
    });

    test("GET /api/products/:productId -> returns full product details for listed product", async () => {
      const res = await fetch(`${baseUrl}/api/products/${listedProduct._id}`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.product.name, "Demon Slayer Haori Jacket");
      assert.ok(body.product.variants.length > 0);
    });

    test("GET /api/products/:productId -> unlisted product details returns 404 Not Found", async () => {
      const res = await fetch(`${baseUrl}/api/products/${unlistedProduct._id}`);
      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test("POST /api/products/bulk -> verifies live cart stock for checkout validation", async () => {
      const res = await fetch(`${baseUrl}/api/products/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: [listedProduct._id.toString()],
        }),
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.products));
      assert.strictEqual(body.products.length, 1);
      assert.strictEqual(body.products[0]._id.toString(), listedProduct._id.toString());
      assert.strictEqual(body.products[0].totalStock, 35);
      assert.strictEqual(body.products[0].variants.length, 2);
      assert.strictEqual(body.products[0].variants[0].stock, 20);
      assert.strictEqual(body.products[0].variants[1].stock, 15);
    });

    test("POST /api/products/bulk -> filters non-existent or invalid product IDs safely", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await fetch(`${baseUrl}/api/products/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: [listedProduct._id.toString(), nonExistentId, "invalid-mongo-id"],
        }),
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.products.length, 1);
      assert.strictEqual(body.products[0]._id.toString(), listedProduct._id.toString());
    });
  });

  // =========================================================
  // 3. USER PROFILE & ADDRESS MANAGEMENT COVERAGE
  // =========================================================
  describe("User Profile & Address Management Endpoints", () => {
    test("GET /api/user/profile -> retrieves logged in user's profile info", async () => {
      const res = await fetch(`${baseUrl}/api/user/profile`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.user.email, "tanjiro@getsuka.com");
      assert.strictEqual(body.user.fullName, "Tanjiro Kamado");
    });

    test("POST /api/user/addresses -> adds new shipping address for user", async () => {
      const res = await fetch(`${baseUrl}/api/user/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({
          fullName: "Tanjiro Butterfly Mansion",
          phone: "9876543210",
          addressLine: "Butterfly Estate Ward 3",
          city: "Tokyo",
          state: "Kanto",
          pincode: "110001",
          isDefault: false,
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.address._id);
      assert.strictEqual(body.address.city, "Tokyo");
    });

    test("GET /api/user/addresses -> lists user addresses in isolation", async () => {
      const res = await fetch(`${baseUrl}/api/user/addresses`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.addresses.length >= 2);
      body.addresses.forEach((addr) => {
        assert.strictEqual(addr.userId.toString(), testUser1._id.toString());
      });
    });
  });

  // =========================================================
  // 4. ORDER CREATION, OWNERSHIP & CANCELLATION
  // =========================================================
  describe("Orders Management & Ownership Enforcement", () => {
    let createdOrderId;

    test("POST /api/user/orders -> creates order using trusted backend price and deducts stock", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({
          addressId: user1Address._id.toString(),
          paymentMethod: "cod",
          deliveryMethod: "standard",
          items: [
            {
              productId: listedProduct._id.toString(),
              variantId: listedProduct.variants[0]._id.toString(),
              productName: listedProduct.name,
              color: listedProduct.variants[0].color,
              size: listedProduct.variants[0].size,
              sku: listedProduct.variants[0].sku,
              quantity: 2,
              price: 99999, // Injected fake price to test backend recalculation
            },
          ],
        }),
      });

      assert.strictEqual(res.status, 201);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      createdOrderId = body.order._id;

      // Price calculation must use backend salePrice (1999 * 2 = 3998), not client 99999
      assert.strictEqual(body.order.subtotal, 3998);
      assert.strictEqual(body.order.totalAmount, 3998);
      assert.strictEqual(body.order.status, "placed");

      // Verify stock was deducted: 20 - 2 = 18
      const product = await Product.findById(listedProduct._id);
      assert.strictEqual(product.variants[0].stock, 18);
    });

    test("GET /api/user/orders -> returns only the authenticated user's orders", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.orders.length > 0);
      body.orders.forEach((ord) => {
        assert.strictEqual(ord.userId.toString(), testUser1._id.toString());
      });
    });

    test("GET /api/user/orders/:orderId -> User B cannot access User A's order (Ownership isolation)", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders/${createdOrderId}`, {
        headers: { Authorization: `Bearer ${user2Token}` },
      });

      // Must be 404 or 403, never exposing User A's order
      assert.strictEqual(res.status === 404 || res.status === 403, true);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    });

    test("POST /api/user/orders/:orderId/cancel -> cancels user's order and restores variant stock", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders/${createdOrderId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ cancellationReason: "Customer order cancellation" }),
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.order.status, "cancelled");

      // Stock must be restored: 18 + 2 = 20
      const product = await Product.findById(listedProduct._id);
      assert.strictEqual(product.variants[0].stock, 20);
    });

    test("POST /api/user/orders/:orderId/cancel -> cancelling an already cancelled order returns 400", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders/${createdOrderId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({ cancellationReason: "Repeat cancellation attempt" }),
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes("can no longer be cancelled"));
    });
  });

  // =========================================================
  // 5. COUPON VALIDATION & WALLET BALANCE
  // =========================================================
  describe("Coupons & Wallet Integration", () => {
    test("POST /api/admin/coupons/validate -> valid coupon returns discount breakdown", async () => {
      const res = await fetch(`${baseUrl}/api/admin/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({
          code: "WELCOME500",
          orderAmount: 2500,
        }),
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.discountAmount, 500);
      assert.strictEqual(body.finalAmount, 2000);
    });

    test("POST /api/admin/coupons/validate -> subtotal below minimum returns 400", async () => {
      const res = await fetch(`${baseUrl}/api/admin/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user1Token}`,
        },
        body: JSON.stringify({
          code: "WELCOME500",
          orderAmount: 500, // Below minimum 1500
        }),
      });

      assert.strictEqual(res.status, 400);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.ok(body.message.includes("Minimum order amount"));
    });

    test("GET /api/user/wallet -> returns user wallet balance and empty transaction list initially", async () => {
      const res = await fetch(`${baseUrl}/api/user/wallet`, {
        headers: { Authorization: `Bearer ${user1Token}` },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(body.wallet);
      assert.strictEqual(body.wallet.balance >= 0, true);
    });
  });

  // =========================================================
  // 6. ADMIN MANAGEMENT INTEGRATION
  // =========================================================
  describe("Admin APIs Integration", () => {
    test("GET /api/admin/users -> lists registered customers for admin", async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.ok(Array.isArray(body.users));
      assert.ok(body.users.length >= 2);
    });

    test("PATCH /api/admin/users/:id/block and unblock -> modifies user access state", async () => {
      // 1. Block user 2
      const blockRes = await fetch(`${baseUrl}/api/admin/users/${testUser2._id}/block`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(blockRes.status, 200);
      const userAfterBlock = await User.findById(testUser2._id);
      assert.strictEqual(userAfterBlock.isBlocked, true);

      // 2. Unblock user 2
      const unblockRes = await fetch(`${baseUrl}/api/admin/users/${testUser2._id}/unblock`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(unblockRes.status, 200);
      const userAfterUnblock = await User.findById(testUser2._id);
      assert.strictEqual(userAfterUnblock.isBlocked, false);
    });

    test("POST /api/admin/categories -> creating duplicate category returns 409 Conflict", async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name: "Anime Apparel" }), // Already seeded
      });

      assert.strictEqual(res.status, 409);
      const body = await res.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.message, "Category already exists");
    });

    test("PATCH /api/admin/products/:productId/listing -> toggles product visibility", async () => {
      // Toggle listedProduct to unlisted
      const res = await fetch(`${baseUrl}/api/admin/products/${listedProduct._id}/listing`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(res.status, 200);
      const productAfter = await Product.findById(listedProduct._id);
      assert.strictEqual(productAfter.isListed, false);

      // Toggle back to listed
      const resRestore = await fetch(`${baseUrl}/api/admin/products/${listedProduct._id}/listing`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      assert.strictEqual(resRestore.status, 200);
      const productRestored = await Product.findById(listedProduct._id);
      assert.strictEqual(productRestored.isListed, true);
    });

    test("PUT /api/admin/orders/:orderId/status -> enforces forward-only status progression", async () => {
      // 1. Create a test order
      const order = await Order.create({
        orderNumber: "ORD-ADMIN-STATUS-01",
        userId: testUser1._id,
        shippingAddress: {
          addressId: user1Address._id,
          fullName: user1Address.fullName,
          phone: user1Address.phone,
          addressLine: user1Address.addressLine,
          city: user1Address.city,
          state: user1Address.state,
          pincode: user1Address.pincode,
        },
        items: [
          {
            productId: listedProduct._id,
            variantId: listedProduct.variants[0]._id,
            productName: listedProduct.name,
            color: listedProduct.variants[0].color,
            size: listedProduct.variants[0].size,
            sku: listedProduct.variants[0].sku,
            quantity: 1,
            price: 1999,
            totalPrice: 1999,
          },
        ],
        subtotal: 1999,
        shippingCharge: 0,
        discount: 0,
        totalAmount: 1999,
        paymentMethod: "cod",
        paymentStatus: "pending",
        status: "placed",
      });

      // 2. Valid transition: placed -> confirmed
      const res1 = await fetch(`${baseUrl}/api/admin/orders/${order._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: "confirmed" }),
      });
      assert.strictEqual(res1.status, 200);

      // 3. Invalid backwards transition: confirmed -> placed -> rejected with 400
      const res2 = await fetch(`${baseUrl}/api/admin/orders/${order._id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ status: "placed" }),
      });
      assert.strictEqual(res2.status, 400);
      const body2 = await res2.json();
      assert.strictEqual(body2.success, false);
      assert.ok(body2.message.includes("Invalid order status transition"));
    });
  });
});
