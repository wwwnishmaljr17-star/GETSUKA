import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";

import User from "../src/features/auth/models/User.js";
import Admin from "../src/features/admin/models/Admin.js";
import Category from "../src/features/category/models/Category.js";
import Product from "../src/features/product/models/Product.js";
import Order from "../src/features/order/models/Order.js";
import Address from "../src/features/address/models/Address.js";

import mongoSanitizeMiddleware from "../src/middlewares/mongoSanitize.js";
import { notFoundMiddleware } from "../src/middlewares/notFoundMiddleware.js";
import { errorMiddleware } from "../src/middlewares/errorMiddleware.js";

import { loginUser } from "../src/features/auth/controllers/authController.js";
import { adminLogin } from "../src/features/admin/controllers/adminAuthController.js";
import { getProductById, updateVariantStock } from "../src/features/product/controllers/productController.js";
import { getCategoryById, addCategory } from "../src/features/category/controllers/categoryController.js";
import { getUserById, blockUser } from "../src/features/admin/controllers/adminUserController.js";
import { updateAddress } from "../src/features/address/controllers/addressController.js";
import { addReview } from "../src/features/review/controllers/reviewController.js";
import { updateAdminOrderStatus } from "../src/features/order/controllers/orderController.js";
import { updateUserProfile } from "../src/features/profile/controllers/userProfileController.js";
import { createWalletTopupOrder } from "../src/features/payment/controllers/paymentController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_step14_validation";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_step14_validation_secret";

describe("Step 14 Input Validation and Data Integrity Audit Tests", () => {
  let server;
  let baseUrl;
  let testUser;
  let testAdmin;
  let testCategory;
  let testProduct;
  let testOrder;
  let userToken;
  let adminToken;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    // 1. Seed User
    testUser = await User.create({
      fullName: "Giyu Tomioka",
      email: "giyu@getsuka.com",
      password: "HashedPassword123!",
      role: "user",
      isVerified: true,
      isBlocked: false,
    });

    userToken = jwt.sign(
      { userId: testUser._id.toString(), email: testUser.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 2. Seed Admin
    testAdmin = await Admin.create({
      fullName: "Kagaya Ubuyashiki",
      email: "master@getsuka.com",
      password: "HashedAdminPassword123!",
      role: "admin",
      isBlocked: false,
    });

    adminToken = jwt.sign(
      { adminId: testAdmin._id.toString(), email: testAdmin.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 3. Seed Category & Product
    testCategory = await Category.create({
      name: "Anime Hoodies",
      isDeleted: false,
    });

    testProduct = await Product.create({
      name: "Water Breathing Hoodie",
      productCode: "HOOD-WB-01",
      description: "Comfortable fleece hoodie with wave motif",
      category: testCategory._id,
      anime: "Demon Slayer",
      price: 1999,
      salePrice: 1799,
      images: [
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg",
        "https://example.com/img3.jpg",
      ],
      variants: [
        { color: "Deep Blue", size: "L", sku: "WB-HOOD-BL-L", stock: 15 },
        { color: "Deep Blue", size: "M", sku: "WB-HOOD-BL-M", stock: 10 },
      ],
      isListed: true,
      isDeleted: false,
    });

    // 4. Seed Address & Delivered Order
    const testAddress = await Address.create({
      userId: testUser._id,
      fullName: "Giyu Tomioka",
      phone: "9876543210",
      addressLine: "Water Estate, Hashira Road",
      city: "Kyoto",
      state: "Kansai",
      pincode: "600001",
      isDefault: true,
    });

    testOrder = await Order.create({
      orderNumber: "ORD-STEP14-001",
      userId: testUser._id,
      shippingAddress: {
        addressId: testAddress._id,
        fullName: "Giyu Tomioka",
        phone: "9876543210",
        addressLine: "Water Estate, Hashira Road",
        city: "Kyoto",
        state: "Kansai",
        pincode: "600001",
      },
      items: [
        {
          productId: testProduct._id,
          variantId: testProduct.variants[0]._id,
          productName: testProduct.name,
          color: "Deep Blue",
          size: "L",
          sku: "WB-HOOD-BL-L",
          quantity: 1,
          price: 1799,
          totalPrice: 1799,
        },
      ],
      subtotal: 1799,
      shippingCharge: 0,
      discount: 0,
      totalAmount: 1799,
      paymentMethod: "cod",
      paymentStatus: "paid",
      status: "delivered",
      deliveredAt: new Date(),
    });

    // 5. Build minimal test server with all validated endpoints & middlewares
    const app = express();
    app.use(express.json());
    app.use(mongoSanitizeMiddleware);

    // Mock auth injection
    const userAuth = (req, res, next) => {
      req.user = { userId: testUser._id.toString() };
      next();
    };

    const adminAuth = (req, res, next) => {
      req.admin = { adminId: testAdmin._id.toString() };
      next();
    };

    // Routes under test
    app.post("/api/auth/login", loginUser);
    app.post("/api/admin/auth/login", adminLogin);

    app.get("/api/admin/products/:productId", adminAuth, getProductById);
    app.patch("/api/admin/products/:productId/variants/:variantId/stock", adminAuth, updateVariantStock);

    app.get("/api/admin/categories/:categoryId", getCategoryById);
    app.post("/api/admin/categories", adminAuth, addCategory);

    app.get("/api/admin/users/:id", adminAuth, getUserById);
    app.patch("/api/admin/users/:id/block", adminAuth, blockUser);

    app.put("/api/user/addresses/:addressId", userAuth, updateAddress);
    app.put("/api/user/profile", userAuth, updateUserProfile);

    app.post("/api/products/:productId/reviews", userAuth, addReview);
    app.put("/api/admin/orders/:orderId/status", adminAuth, updateAdminOrderStatus);
    app.post("/api/payment/wallet/create-order", userAuth, createWalletTopupOrder);

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
  // 1. MONGODB OPERATOR INJECTION PREVENTION
  // =========================================================
  test("TEST 1: Mongo operator injection via body ($gt, $ne) is neutralized by mongoSanitizeMiddleware", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: { $gt: "" },
        password: "any_password",
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes("Email and password are required"));
  });

  test("TEST 2: Admin login with non-string credentials is systematically rejected with 400", async () => {
    const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: { $ne: null },
        password: ["array", "password"],
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Email and password are required");
  });

  // =========================================================
  // 2. MONGODB OBJECTID FORMAT VALIDATION
  // =========================================================
  test("TEST 3: Invalid ObjectId on Product endpoint is rejected with 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/admin/products/invalid_id_not_24_hex`);
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Invalid product ID");
  });

  test("TEST 4: Invalid ObjectId on Category endpoint is rejected with 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/admin/categories/invalid_category_123`);
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Invalid category ID");
  });

  test("TEST 5: Invalid ObjectId on Admin User endpoint is rejected with 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/invalid_user_id`);
    assert.strictEqual(res.status, 400);

    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Invalid user ID");
  });

  test("TEST 6: Invalid ObjectId on Address update endpoint is rejected with 400 Bad Request", async () => {
    const res = await fetch(`${baseUrl}/api/user/addresses/not_a_valid_id`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Test Name",
        phone: "9876543210",
        addressLine: "123 Street",
        city: "City",
        state: "State",
        pincode: "123456",
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Invalid address ID");
  });

  // =========================================================
  // 3. NUMERIC AND RANGE VALIDATION
  // =========================================================
  test("TEST 7: Negative or non-integer stock update on product variant is rejected with 400", async () => {
    const productId = testProduct._id.toString();
    const variantId = testProduct.variants[0]._id.toString();

    // 1. Negative stock
    const resNegative = await fetch(`${baseUrl}/api/admin/products/${productId}/variants/${variantId}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: -5 }),
    });
    assert.strictEqual(resNegative.status, 400);
    const bodyNegative = await resNegative.json();
    assert.ok(bodyNegative.message.includes("Stock must be a non-negative whole number"));

    // 2. Fractional stock
    const resFloat = await fetch(`${baseUrl}/api/admin/products/${productId}/variants/${variantId}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: 4.5 }),
    });
    assert.strictEqual(resFloat.status, 400);
  });

  test("TEST 8: Review rating must be an integer between 1 and 5", async () => {
    const productId = testProduct._id.toString();

    // Rating 0
    const resZero = await fetch(`${baseUrl}/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 0, comment: "Worst ever" }),
    });
    assert.strictEqual(resZero.status, 400);

    // Rating 6
    const resSix = await fetch(`${baseUrl}/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 6, comment: "Beyond perfection" }),
    });
    assert.strictEqual(resSix.status, 400);

    // Rating 3.5 (Float)
    const resFloat = await fetch(`${baseUrl}/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: 3.5, comment: "Decent fit" }),
    });
    assert.strictEqual(resFloat.status, 400);
  });

  test("TEST 9: Wallet top-up amount cannot be negative, zero, or exceed transaction maximum (₹50,000)", async () => {
    // 1. Zero amount
    const resZero = await fetch(`${baseUrl}/api/payment/wallet/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 0 }),
    });
    assert.strictEqual(resZero.status, 400);

    // 2. Excessive amount (₹1,000,000)
    const resExcess = await fetch(`${baseUrl}/api/payment/wallet/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: 1000000 }),
    });
    assert.strictEqual(resExcess.status, 400);
    const bodyExcess = await resExcess.json();
    assert.ok(bodyExcess.message.includes("₹50,000"));
  });

  // =========================================================
  // 4. BUSINESS LOGIC & STATE TRANSITION INTEGRITY
  // =========================================================
  test("TEST 10: Invalid order status transition (delivered -> placed) is strictly rejected", async () => {
    const orderId = testOrder._id.toString();

    const res = await fetch(`${baseUrl}/api/admin/orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "placed" }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.ok(body.message.includes("Invalid order status transition"));
  });

  // =========================================================
  // 5. MASS ASSIGNMENT & PROTECTED FIELD PROTECTION
  // =========================================================
  test("TEST 11: Protected fields (role, isVerified, isBlocked) cannot be modified via user profile update", async () => {
    const res = await fetch(`${baseUrl}/api/user/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Giyu Tomioka (Water Hashira)",
        email: "giyu@getsuka.com",
        role: "admin",
        isVerified: false,
        isBlocked: true,
      }),
    });

    assert.strictEqual(res.status, 200);

    // Verify in database that protected fields were NOT modified
    const refreshedUser = await User.findById(testUser._id);
    assert.strictEqual(refreshedUser.fullName, "Giyu Tomioka (Water Hashira)");
    assert.strictEqual(refreshedUser.role, undefined, "Role must NOT be injected onto User via profile update");
    assert.strictEqual(refreshedUser.isVerified, true, "isVerified must not be manipulated");
    assert.strictEqual(refreshedUser.isBlocked, false, "isBlocked must not be manipulated");
  });

  test("TEST 12: Invalid phone number format in profile update is rejected with 400", async () => {
    const res = await fetch(`${baseUrl}/api/user/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Giyu Tomioka",
        email: "giyu@getsuka.com",
        phone: "12345", // Only 5 digits instead of 10
      }),
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, "Phone number must be exactly 10 digits");
  });

  // =========================================================
  // 6. VALID REQUEST INTEGRITY
  // =========================================================
  test("TEST 13: Valid request with correct data format succeeds without error", async () => {
    const productId = testProduct._id.toString();

    const res = await fetch(`${baseUrl}/api/admin/products/${productId}`);
    assert.strictEqual(res.status, 200);

    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.product.name, "Water Breathing Hoodie");
  });
});
