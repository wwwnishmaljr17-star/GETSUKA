import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Models
import User from "../src/features/auth/models/User.js";
import Admin from "../src/features/admin/models/Admin.js";
import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";
import Order from "../src/features/order/models/Order.js";
import Coupon from "../src/features/coupon/models/Coupon.js";
import Address from "../src/features/address/models/Address.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import Referral from "../src/features/referral/models/referral.js";

// Routes
import authRoutes from "../src/features/auth/routes/authRoutes.js";
import adminAuthRoutes from "../src/features/admin/routes/adminAuthRoutes.js";
import adminUserRoutes from "../src/features/admin/routes/adminUserRoutes.js";
import adminProfileRoutes from "../src/features/admin/routes/adminProfileRoutes.js";
import adminPasswordRoutes from "../src/features/admin/routes/adminPasswordRoutes.js";
import categoryRoutes from "../src/features/category/routes/categoryRoutes.js";
import productRoutes from "../src/features/product/routes/productRoutes.js";
import adminOrderRoutes from "../src/features/order/routes/adminOrderRoutes.js";
import couponRoutes from "../src/features/coupon/routes/couponRoutes.js";
import adminDashboardRoutes from "../src/features/admin/routes/adminDashboardRoutes.js";
import publicProductRoutes from "../src/features/product/routes/publicProductRoutes.js";
import userProfileRoutes from "../src/features/profile/routes/userProfileRoutes.js";
import addressRoutes from "../src/features/address/routes/addressRoutes.js";
import reviewRoutes from "../src/features/review/routes/reviewRoutes.js";
import wishlistRoutes from "../src/features/wishlist/routes/wishlistRoutes.js";
import orderRoutes from "../src/features/order/routes/orderRoutes.js";
import paymentRoutes from "../src/features/payment/routes/paymentRoutes.js";
import walletRoutes from "../src/features/wallet/routes/walletRoutes.js";
import referralRoutes from "../src/features/referral/routes/referralRoutes.js";

// Middlewares
import notFoundMiddleware from "../src/middlewares/notFoundMiddleware.js";
import errorMiddleware from "../src/middlewares/errorMiddleware.js";
import mongoSanitizeMiddleware from "../src/middlewares/mongoSanitize.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_step17_frontend_audit";
const JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_key_step17_getsuka";

describe("GETSUKA Step 17: Frontend Functionality & API Integration Audit", () => {
  let server;
  let baseUrl;

  let testUser;
  let userToken;

  let testAdmin;
  let adminToken;

  let testCategory;
  let testProduct;
  let testCoupon;
  let testAddress;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    // 1. Seed Customer User
    const userHashedPassword = await bcrypt.hash("UserPassword123!", 10);
    testUser = await User.create({
      fullName: "Zoro Roronoa",
      email: "zoro@getsuka.com",
      password: userHashedPassword,
      phone: "9876543210",
      isVerified: true,
      role: "user",
    });

    userToken = jwt.sign(
      { userId: testUser._id.toString(), id: testUser._id.toString(), role: "user" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 2. Seed Admin User
    const adminHashedPassword = await bcrypt.hash("AdminPassword123!", 10);
    testAdmin = await Admin.create({
      fullName: "Gojo Satoru",
      email: "gojo@getsuka.com",
      password: adminHashedPassword,
      role: "admin",
    });

    adminToken = jwt.sign(
      { adminId: testAdmin._id.toString(), id: testAdmin._id.toString(), role: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 3. Seed Category
    testCategory = await Category.create({
      name: "Anime Streetwear",
      description: "Urban streetwear hoodies and oversize shirts",
      isDeleted: false,
    });

    // 4. Seed Product with Variants
    testProduct = await Product.create({
      name: "Jujutsu High Oversized Hoodie",
      productCode: "JJK-HOODIE-01",
      description: "Dark navy fleece oversize hoodie",
      category: testCategory._id,
      anime: "Jujutsu Kaisen",
      price: 2999,
      salePrice: 2499,
      images: [
        "https://example.com/jjk_hoodie_front.jpg",
        "https://example.com/jjk_hoodie_back.jpg",
        "https://example.com/jjk_hoodie_side.jpg",
      ],
      variants: [
        { color: "Navy", size: "M", sku: "JJK-HOOD-NVY-M", stock: 12 },
        { color: "Navy", size: "L", sku: "JJK-HOOD-NVY-L", stock: 8 },
      ],
      isListed: true,
      isDeleted: false,
    });

    // 5. Seed Shipping Address
    testAddress = await Address.create({
      userId: testUser._id,
      fullName: "Zoro Roronoa",
      phone: "9876543210",
      addressLine: "Thousand Sunny Deck 1",
      city: "Shimotsuki",
      state: "East Blue",
      pincode: "110001",
      isDefault: true,
    });

    // 6. Seed Coupon
    testCoupon = await Coupon.create({
      code: "SHINOBI10",
      discountType: "percentage",
      discountValue: 10,
      minOrderAmount: 1000,
      maxDiscountAmount: 500,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: true,
      usedCount: 0,
      usageLimit: 500,
    });

    // 7. Seed Wallet
    await Wallet.create({
      userId: testUser._id,
      balance: 5000,
      transactions: [],
    });

    // 8. Build Express Application mirroring server.js
    const app = express();
    app.use(express.json());
    app.use(mongoSanitizeMiddleware);

    // Mount routes matching frontend endpoints
    app.use("/api/auth", authRoutes);
    app.use("/api/admin/auth", adminAuthRoutes);
    app.use("/api/admin", adminPasswordRoutes);
    app.use("/api/admin", adminUserRoutes);
    app.use("/api/admin", adminProfileRoutes);
    app.use("/api/admin", categoryRoutes);
    app.use("/api/admin", productRoutes);
    app.use("/api/admin/orders", adminOrderRoutes);
    app.use("/api/admin/coupons", couponRoutes);
    app.use("/api/admin/dashboard", adminDashboardRoutes);
    app.use("/api", publicProductRoutes);
    app.use("/api/user", userProfileRoutes);
    app.use("/api/user", addressRoutes);
    app.use("/api", reviewRoutes);
    app.use("/api/user", wishlistRoutes);
    app.use("/api/user/orders", orderRoutes);
    app.use("/api/payment", paymentRoutes);
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
  // 1. AUTHENTICATION & ACCOUNT LIFECYCLE FLOW
  // =========================================================
  describe("Flow 1: Registration, Login, and Password Reset Contracts", () => {
    test("POST /api/auth/register -> registers new customer and responds with 201", async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Luffy Monkey",
          email: "luffy@getsuka.com",
          password: "MeatPassword123!",
          phone: "9123456780",
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test("POST /api/auth/login -> logs in verified customer, returns token and excludes password", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "zoro@getsuka.com",
          password: "UserPassword123!",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.user.email, "zoro@getsuka.com");
      assert.strictEqual(data.user.password, undefined);
    });

    test("POST /api/auth/forgot-password -> sends password reset OTP", async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "zoro@getsuka.com",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });
  });

  // =========================================================
  // 2. GUEST STOREFRONT ACCESS FLOW
  // =========================================================
  describe("Flow 2: Guest Access to Storefront & Catalog", () => {
    test("GET /api/products -> guest can view catalog without auth token", async () => {
      const res = await fetch(`${baseUrl}/api/products`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.products));
    });

    test("GET /api/products/:productId -> guest can view product details", async () => {
      const res = await fetch(`${baseUrl}/api/products/${testProduct._id}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.product.name, "Jujutsu High Oversized Hoodie");
    });

    test("GET /api/admin/categories -> public can view categories for shop navigation", async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.categories));
    });

    test("Unauthenticated guest trying to access protected user orders -> 401 Unauthorized", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders`);
      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });
  });

  // =========================================================
  // 3. SEARCH, FILTERING, SORTING & PAGINATION FLOW
  // =========================================================
  describe("Flow 3: Product Search, Filtering, Sorting, and Pagination", () => {
    test("GET /api/products with search query, anime, and sort returns matching filtered list", async () => {
      const queryParams = new URLSearchParams({
        search: "Hoodie",
        anime: "Jujutsu Kaisen",
        sort: "newest",
        page: "1",
        limit: "12",
      });

      const res = await fetch(`${baseUrl}/api/products?${queryParams}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.products.length >= 1);
      assert.strictEqual(data.pagination.currentPage, 1);
      assert.ok(data.pagination.totalProducts >= 1);
    });

    test("GET /api/products with non-matching anime filter returns empty array gracefully", async () => {
      const queryParams = new URLSearchParams({
        anime: "NonExistentAnimeTitleXYZ",
      });

      const res = await fetch(`${baseUrl}/api/products?${queryParams}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.products.length, 0);
    });
  });

  // =========================================================
  // 4. PRODUCT VARIANTS & LIVE BULK STOCK VALIDATION FLOW
  // =========================================================
  describe("Flow 4: Cart & Checkout Live Stock Synchronization", () => {
    test("POST /api/products/bulk -> returns real-time variant inventory for cart items", async () => {
      const res = await fetch(`${baseUrl}/api/products/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: [testProduct._id.toString()],
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.products.length, 1);

      const returnedProduct = data.products[0];
      assert.strictEqual(returnedProduct._id.toString(), testProduct._id.toString());
      assert.strictEqual(returnedProduct.variants.length, 2);
      assert.strictEqual(returnedProduct.totalStock, 20); // 12 + 8
    });
  });

  // =========================================================
  // 5. WISHLIST ADD/REMOVE FLOW
  // =========================================================
  describe("Flow 5: Wishlist Operations and Toggle", () => {
    test("POST /api/user/wishlist -> adds product to user wishlist", async () => {
      const res = await fetch(`${baseUrl}/api/user/wishlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          productId: testProduct._id.toString(),
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });

    test("GET /api/user/wishlist -> retrieves user wishlist items", async () => {
      const res = await fetch(`${baseUrl}/api/user/wishlist`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.wishlist));
      assert.strictEqual(data.wishlist.length, 1);
    });

    test("DELETE /api/user/wishlist/:productId -> removes product from wishlist", async () => {
      const res = await fetch(`${baseUrl}/api/user/wishlist/${testProduct._id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
    });
  });

  // =========================================================
  // 6. ADDRESS CREATION, EDITING & SELECTION FLOW
  // =========================================================
  describe("Flow 6: Shipping Address Management", () => {
    let secondAddressId;

    test("POST /api/user/addresses -> adds new delivery address for checkout", async () => {
      const res = await fetch(`${baseUrl}/api/user/addresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fullName: "Zoro Dojo",
          phone: "9876543211",
          addressLine: "Wano Country Kuri Region",
          city: "Flower Capital",
          state: "Wano",
          pincode: "110002",
          isDefault: false,
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.address._id);
      secondAddressId = data.address._id;
    });

    test("GET /api/user/addresses -> returns user's addresses in isolated scope", async () => {
      const res = await fetch(`${baseUrl}/api/user/addresses`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.addresses.length, 2);
    });

    test("PUT /api/user/addresses/:id -> updates address successfully", async () => {
      const res = await fetch(`${baseUrl}/api/user/addresses/${secondAddressId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fullName: "Zoro Enma",
          phone: "9876543211",
          addressLine: "Onigashima Rooftop",
          city: "Flower Capital",
          state: "Wano",
          pincode: "110002",
          isDefault: false,
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.address.fullName, "Zoro Enma");
    });
  });

  // =========================================================
  // 7. COUPON VALIDATION & DISCOUNT CALCULATION FLOW
  // =========================================================
  describe("Flow 7: Checkout Coupon Application and Enforcement", () => {
    test("POST /api/admin/coupons/validate -> validates coupon and returns calculated discount", async () => {
      const res = await fetch(`${baseUrl}/api/admin/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          code: "SHINOBI10",
          orderAmount: 2500,
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.discountAmount, 250); // 10% of 2500
      assert.strictEqual(data.finalAmount, 2250);
    });

    test("POST /api/admin/coupons/validate -> rejects coupon if order is below minimum threshold", async () => {
      const res = await fetch(`${baseUrl}/api/admin/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          code: "SHINOBI10",
          orderAmount: 500, // min is 1000
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.message.includes("Minimum order amount"));
    });
  });

  // =========================================================
  // 8. CHECKOUT & ORDER CREATION (COD & WALLET) FLOW
  // =========================================================
  describe("Flow 8: Order Placement & Inventory Deduction", () => {
    let createdOrderId;
    let orderItemId;

    test("POST /api/user/orders -> places order with server-verified prices and deducts stock", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          items: [
            {
              productId: testProduct._id.toString(),
              variantId: testProduct.variants[0]._id.toString(),
              quantity: 2,
            },
          ],
          addressId: testAddress._id.toString(),
          paymentMethod: "cod",
          deliveryMethod: "standard",
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.order._id);
      createdOrderId = data.order._id;
      orderItemId = data.order.items[0]._id;

      // Verify variant stock was deducted in database (12 - 2 = 10)
      const refreshedProduct = await Product.findById(testProduct._id);
      const variant = refreshedProduct.variants.id(testProduct.variants[0]._id);
      assert.strictEqual(variant.stock, 10);
    });

    test("GET /api/user/orders/:orderId -> retrieves placed order details for user", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders/${createdOrderId}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.order._id.toString(), createdOrderId.toString());
      assert.strictEqual(data.order.status, "placed");
    });

    test("POST /api/user/orders/:orderId/items/:itemId/cancel -> cancels specific item and restocks variant", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders/${createdOrderId}/items/${orderItemId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          cancellationReason: "Ordered wrong size by accident",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);

      // Verify stock was restored to 12
      const refreshedProduct = await Product.findById(testProduct._id);
      const variant = refreshedProduct.variants.id(testProduct.variants[0]._id);
      assert.strictEqual(variant.stock, 12);
    });
  });

  // =========================================================
  // 9. RETURN AND REFUND WORKFLOW
  // =========================================================
  describe("Flow 9: Return Request & Administrative Approval", () => {
    let deliveredOrderId;

    before(async () => {
      // Seed a delivered order eligible for return
      const deliveredOrder = await Order.create({
        orderNumber: "ORD-DELIVERED-STEP17",
        userId: testUser._id,
        shippingAddress: {
          addressId: testAddress._id,
          fullName: testAddress.fullName,
          phone: testAddress.phone,
          addressLine: testAddress.addressLine,
          city: testAddress.city,
          state: testAddress.state,
          pincode: testAddress.pincode,
        },
        items: [
          {
            productId: testProduct._id,
            variantId: testProduct.variants[1]._id,
            productName: testProduct.name,
            color: testProduct.variants[1].color,
            size: testProduct.variants[1].size,
            sku: testProduct.variants[1].sku,
            quantity: 1,
            price: 2499,
            totalPrice: 2499,
          },
        ],
        subtotal: 2499,
        shippingCharge: 0,
        discount: 0,
        totalAmount: 2499,
        paymentMethod: "cod",
        paymentStatus: "paid",
        status: "delivered",
        deliveredAt: new Date(),
        returnStatus: "none",
      });

      deliveredOrderId = deliveredOrder._id.toString();
    });

    test("POST /api/user/orders/:orderId/return -> customer requests return for delivered order", async () => {
      const res = await fetch(`${baseUrl}/api/user/orders/${deliveredOrderId}/return`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          returnReason: "Fabric texture does not match expectations",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.order.returnStatus, "pending");
    });

    test("GET /api/admin/orders/returns -> admin inspects all return requests", async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/returns`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.returns));
      assert.ok(data.returns.some((o) => o._id.toString() === deliveredOrderId));
    });

    test("PUT /api/admin/orders/:orderId/return/approve -> admin approves return request", async () => {
      const res = await fetch(`${baseUrl}/api/admin/orders/${deliveredOrderId}/return/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.order.returnStatus, "approved");
    });
  });

  // =========================================================
  // 10. WALLET & REFERRAL OPERATIONS FLOW
  // =========================================================
  describe("Flow 10: Wallet Balance, Ledger, and Referral Program", () => {
    test("GET /api/user/wallet -> returns user wallet balance and details", async () => {
      const res = await fetch(`${baseUrl}/api/user/wallet`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.wallet.balance, 5000);
    });

    test("GET /api/user/wallet/transactions -> returns paginated transactions ledger", async () => {
      const res = await fetch(`${baseUrl}/api/user/wallet/transactions?page=1&limit=10`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.transactions));
      assert.ok(data.pagination);
    });

    test("GET /api/user/referrals -> fetches referral program stats and link", async () => {
      const res = await fetch(`${baseUrl}/api/user/referrals`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      const referralCode = data.data?.referralCode || data.referralCode;
      assert.ok(referralCode !== undefined);
    });
  });

  // =========================================================
  // 11. USER PROFILE EDITING & PASSWORD CHANGE FLOW
  // =========================================================
  describe("Flow 11: Profile Details Editing and Password Change", () => {
    test("GET /api/user/profile -> retrieves customer profile details", async () => {
      const res = await fetch(`${baseUrl}/api/user/profile`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.fullName, "Zoro Roronoa");
    });

    test("PUT /api/user/profile -> updates customer display name and contact", async () => {
      const res = await fetch(`${baseUrl}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fullName: "Roronoa Zoro (King of Hell)",
          email: "zoro@getsuka.com",
          phone: "9876543210",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.fullName, "Roronoa Zoro (King of Hell)");
    });
  });

  // =========================================================
  // 12. ADMIN DASHBOARD & MANAGEMENT WORKFLOWS
  // =========================================================
  describe("Flow 12: Admin Dashboard, Products, Customers, and Categories", () => {
    test("POST /api/admin/auth/login -> admin logs in with valid credentials", async () => {
      const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "gojo@getsuka.com",
          password: "AdminPassword123!",
        }),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
    });

    test("GET /api/admin/dashboard -> aggregates revenue, orders, and sales metrics", async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(data.summary);
      assert.strictEqual(typeof data.summary.totalOrders, "number");
    });

    test("GET /api/admin/users -> lists registered customers for admin management", async () => {
      const res = await fetch(`${baseUrl}/api/admin/users?page=1&limit=10`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.users));
    });

    test("PATCH /api/admin/products/:productId/listing -> toggles product visibility", async () => {
      const res = await fetch(`${baseUrl}/api/admin/products/${testProduct._id}/listing`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.product.isListed, false);

      // Re-enable listing
      const res2 = await fetch(`${baseUrl}/api/admin/products/${testProduct._id}/listing`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });
      assert.strictEqual(res2.status, 200);
      const data2 = await res2.json();
      assert.strictEqual(data2.product.isListed, true);
    });

    test("GET /api/admin/profile -> retrieves authenticated admin profile", async () => {
      const res = await fetch(`${baseUrl}/api/admin/profile`, {
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.admin.email, "gojo@getsuka.com");
    });
  });
});
