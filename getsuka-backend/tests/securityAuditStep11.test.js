import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";

import Admin from "../src/features/admin/models/Admin.js";
import User from "../src/features/auth/models/User.js";
import Category from "../src/features/category/models/Category.js";
import Product from "../src/features/product/models/Product.js";
import Payment from "../src/features/payment/models/Payment.js";
import paymentRoutes from "../src/features/payment/routes/paymentRoutes.js";
import razorpay from "../src/config/razorpay.js";
import { adminLogin } from "../src/features/admin/controllers/adminAuthController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_security_step11";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_super_secret_key";

describe("Step 11 Security Audit & Safe Fixes Verification Tests", () => {
  let server;
  let baseUrl;
  let originalOrdersCreate;
  let testUser;
  let validUserToken;
  let testProduct;
  let testCategory;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    // Mock Razorpay orders.create for offline isolated execution
    originalOrdersCreate = razorpay.orders.create;
    razorpay.orders.create = async (options) => ({
      id: `order_test_${Date.now()}`,
      amount: options.amount,
      currency: options.currency || "INR",
      receipt: options.receipt,
      notes: options.notes,
    });

    testCategory = await Category.create({
      name: "Demon Slayer Outerwear",
      isDeleted: false,
    });

    testUser = await User.create({
      fullName: "Tanjiro Kamado",
      email: "tanjiro@getsuka.com",
      password: "hashedpassword123",
      referralCode: "GETSUKA-TANJIRO",
      isVerified: true,
      isBlocked: false,
    });

    testProduct = await Product.create({
      name: "Nichirin Blade Hoodie",
      description: "Test hoodie",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 2500,
      variants: [
        {
          size: "M",
          color: "Black",
          sku: "TEST-SKU-1",
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    validUserToken = jwt.sign(
      {
        userId: testUser._id.toString(),
        email: testUser.email,
        role: "user",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Setup minimal Express test app with actual payment routes & security middleware
    const app = express();
    app.disable("x-powered-by");

    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://127.0.0.1:5173",
    ];

    app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
          }
          return callback(new Error("CORS request blocked: Origin not allowed"), false);
        },
        credentials: true,
      })
    );

    app.use(express.json());
    app.use("/api/payment", paymentRoutes);

    // Centralized Error Handler
    app.use((err, req, res, next) => {
      if (err.message && err.message.includes("CORS request blocked")) {
        return res.status(403).json({
          success: false,
          message: err.message,
        });
      }

      const statusCode = err.statusCode || err.status || 500;
      return res.status(statusCode).json({
        success: false,
        message: err.message || "An unexpected error occurred",
      });
    });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (originalOrdersCreate) {
      razorpay.orders.create = originalOrdersCreate;
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================
  // VULNERABILITY 1: ADMIN PASSWORD EXCLUSION (select: false)
  // =========================================================
  test("TEST 1: Admin password is excluded by default from queries and JSON responses", async () => {
    const rawPassword = "AdminSecurePass#2026";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const admin = await Admin.create({
      fullName: "Master Kagaya",
      email: "kagaya@getsuka.com",
      password: hashedPassword,
      role: "admin",
    });

    // Default findById query
    const foundAdmin = await Admin.findById(admin._id);
    assert.strictEqual(
      foundAdmin.password,
      undefined,
      "admin.password should be undefined on normal findById"
    );

    // Default findOne query
    const foundAdminByEmail = await Admin.findOne({ email: "kagaya@getsuka.com" });
    assert.strictEqual(
      foundAdminByEmail.password,
      undefined,
      "admin.password should be undefined on normal findOne"
    );

    // Explicit select("+password") should fetch password
    const adminWithPassword = await Admin.findById(admin._id).select("+password");
    assert.ok(adminWithPassword.password, "password must be present when explicitly requested");
    const isMatch = await bcrypt.compare(rawPassword, adminWithPassword.password);
    assert.strictEqual(isMatch, true, "Bcrypt compare must succeed with explicitly fetched password");
  });

  test("TEST 2: Admin login succeeds with select: false and never leaks password hash", async () => {
    const rawPassword = "MuzanSecret#2026";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    await Admin.create({
      fullName: "Muzan Kibutsuji",
      email: "muzan@getsuka.com",
      password: hashedPassword,
      role: "admin",
    });

    const req = {
      body: {
        email: "muzan@getsuka.com",
        password: rawPassword,
      },
    };

    let statusCode = 200;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      },
    };

    await adminLogin(req, res);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseBody.success, true);
    assert.ok(responseBody.token, "Admin login must return a valid token");
    assert.strictEqual(
      responseBody.admin.password,
      undefined,
      "Admin login response must not include password hash"
    );
  });

  // =========================================================
  // VULNERABILITY 2: PAYMENT ROUTE AUTHENTICATION & SPOOFING
  // =========================================================
  test("TEST 3: Unauthenticated request to /api/payment/create-order is rejected with 401", async () => {
    const res = await fetch(`${baseUrl}/api/payment/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: 1500,
        orderData: { items: [] },
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });

  test("TEST 4: Unauthenticated request to /api/payment/verify-payment is rejected with 401", async () => {
    const res = await fetch(`${baseUrl}/api/payment/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: "order_fake_123",
        razorpay_payment_id: "pay_fake_456",
        razorpay_signature: "sig_fake_789",
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401);
    assert.strictEqual(data.success, false);
  });

  test("TEST 5: Authenticated user cannot spoof order ownership by injecting arbitrary userId in body", async () => {
    const victimUserId = new mongoose.Types.ObjectId().toString();

    const res = await fetch(`${baseUrl}/api/payment/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validUserToken}`,
      },
      body: JSON.stringify({
        amount: 2500,
        userId: victimUserId, // Malicious spoof attempt in root
        orderData: {
          userId: victimUserId, // Malicious spoof attempt in orderData
          addressId: new mongoose.Types.ObjectId().toString(),
          items: [
            {
              productId: testProduct._id.toString(),
              variantId: testProduct.variants[0]._id.toString(),
              quantity: 1,
            },
          ],
        },
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.order.id);

    // Verify stored Payment record has testUser's actual userId, NOT the victim's
    const recordedPayment = await Payment.findOne({ razorpayOrderId: data.order.id });
    assert.ok(recordedPayment, "Payment record must exist");
    assert.strictEqual(
      recordedPayment.userId.toString(),
      testUser._id.toString(),
      "Recorded payment userId must match authenticated user, not spoofed victim"
    );
    assert.strictEqual(
      recordedPayment.orderData.userId.toString(),
      testUser._id.toString(),
      "Recorded payment orderData.userId must match authenticated user, not spoofed victim"
    );
  });

  // =========================================================
  // VULNERABILITY 3: CORS RESTRICTION
  // =========================================================
  test("TEST 6: CORS blocks requests from unauthorized third-party origins", async () => {
    const res = await fetch(`${baseUrl}/api/payment/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil-attacker-website.com",
        Authorization: `Bearer ${validUserToken}`,
      },
      body: JSON.stringify({ amount: 100 }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes("CORS request blocked"));
  });

  test("TEST 7: Whitelisted origin is allowed through CORS", async () => {
    const res = await fetch(`${baseUrl}/api/payment/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:5173",
        Authorization: `Bearer ${validUserToken}`,
      },
      body: JSON.stringify({
        orderData: {
          items: [
            {
              productId: testProduct._id.toString(),
              variantId: testProduct.variants[0]._id.toString(),
              quantity: 1,
            },
          ],
        },
      }),
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get("access-control-allow-origin"), "http://localhost:5173");
  });

  // =========================================================
  // VULNERABILITY 4: CENTRALIZED ERROR RESPONSE SANITIZATION
  // =========================================================
  test("TEST 8: Malformed JSON or uncaught errors return JSON format without stack leakage", async () => {
    const res = await fetch(`${baseUrl}/api/payment/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validUserToken}`,
      },
      body: "{ invalid json string",
    });

    assert.strictEqual(res.status, 400);
    const contentType = res.headers.get("content-type");
    assert.ok(
      contentType.includes("application/json") || contentType.includes("json"),
      "Response content-type must be JSON, not default Express HTML stack trace"
    );
  });
});
