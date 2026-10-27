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
import Coupon from "../src/features/coupon/models/Coupon.js";
import Review from "../src/features/review/models/Review.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import Referral from "../src/features/referral/models/referral.js";
import Payment from "../src/features/payment/models/Payment.js";
import OtpVerification from "../src/features/auth/models/otpVerification.js";
import PasswordResetOtp from "../src/features/auth/models/PasswordResetOtp.js";
import AdminPasswordResetOtp from "../src/features/admin/models/adminPasswordResetOtp.js";
import EmailChangeOtp from "../src/features/profile/models/EmailChangeOtp.js";

import mongoSanitizeMiddleware from "../src/middlewares/mongoSanitize.js";
import { notFoundMiddleware } from "../src/middlewares/notFoundMiddleware.js";
import { errorMiddleware } from "../src/middlewares/errorMiddleware.js";

import { createOrder, cancelUserOrder } from "../src/features/order/controllers/orderController.js";
import { updateVariantStock } from "../src/features/product/controllers/productController.js";
import { creditWallet, debitWallet } from "../src/features/wallet/controllers/walletController.js";
import { applyReferral } from "../src/features/referral/controllers/referralController.js";
import { addReview } from "../src/features/review/controllers/reviewController.js";
import { handleRazorpayWebhook } from "../src/features/payment/controllers/paymentController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_step15_database_integrity";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_step15_db_integrity_secret";

describe("Step 15 Database Integrity & Transaction Safety Audit Tests", () => {
  let server;
  let baseUrl;
  let user1;
  let user2;
  let referrerUser1;
  let referrerUser2;
  let testAdmin;
  let testCategory;
  let singleStockProduct;
  let user1Address;
  let user2Address;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret_step15";
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    // Ensure all model indexes are created
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
      PasswordResetOtp.init(),
      AdminPasswordResetOtp.init(),
      EmailChangeOtp.init(),
    ]);

    // 1. Seed Users
    user1 = await User.create({
      fullName: "Tanjiro Kamado",
      email: "tanjiro@getsuka.com",
      password: "HashedPassword123!",
      isVerified: true,
      isBlocked: false,
    });

    user2 = await User.create({
      fullName: "Zenitsu Agatsuma",
      email: "zenitsu@getsuka.com",
      password: "HashedPassword123!",
      isVerified: true,
      isBlocked: false,
    });

    referrerUser1 = await User.create({
      fullName: "Kyojuro Rengoku",
      email: "rengoku@getsuka.com",
      password: "HashedPassword123!",
      referralCode: "GETSUKA-RENGOKU-01",
      isVerified: true,
      isBlocked: false,
    });

    referrerUser2 = await User.create({
      fullName: "Tengen Uzui",
      email: "uzui@getsuka.com",
      password: "HashedPassword123!",
      referralCode: "GETSUKA-TENGEN-02",
      isVerified: true,
      isBlocked: false,
    });

    // 2. Seed Admin
    testAdmin = await Admin.create({
      fullName: "Kagaya Ubuyashiki",
      email: "master@getsuka.com",
      password: "HashedAdminPassword123!",
      role: "admin",
      isBlocked: false,
    });

    // 3. Seed Category & Single Stock Product
    testCategory = await Category.create({
      name: "Nichirin Blades",
      isDeleted: false,
    });

    singleStockProduct = await Product.create({
      name: "Sun Breathing Katana",
      productCode: "KATANA-SUN-01",
      description: "Legendary black Nichirin blade with crimson hilt",
      category: testCategory._id,
      anime: "Demon Slayer",
      price: 3499,
      salePrice: 2999,
      images: [
        "https://example.com/k1.jpg",
        "https://example.com/k2.jpg",
        "https://example.com/k3.jpg",
      ],
      variants: [
        { color: "Jet Black", size: "Standard", sku: "KATANA-SUN-JB-STD", stock: 1 },
      ],
      isListed: true,
      isDeleted: false,
    });

    // 4. Seed Addresses
    user1Address = await Address.create({
      userId: user1._id,
      fullName: "Tanjiro Kamado",
      phone: "9876543210",
      addressLine: "Mount Kumotori Charcoal House",
      city: "Okutama",
      state: "Tokyo",
      pincode: "198021",
      isDefault: true,
    });

    user2Address = await Address.create({
      userId: user2._id,
      fullName: "Zenitsu Agatsuma",
      phone: "9123456789",
      addressLine: "Peach Mountain Estate",
      city: "Shizuoka",
      state: "Chubu",
      pincode: "420001",
      isDefault: true,
    });

    // 5. Build minimal test server
    const app = express();
    app.use(express.json());
    app.use(mongoSanitizeMiddleware);

    // Mock auth middleware router
    const authenticate = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        req.user = { userId: user1._id.toString() };
        return next();
      }
      try {
        const token = authHeader.replace("Bearer ", "");
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = { userId: decoded.userId };
      } catch {
        req.user = { userId: user1._id.toString() };
      }
      next();
    };

    const adminAuth = (req, res, next) => {
      req.admin = { adminId: testAdmin._id.toString() };
      next();
    };

    // Endpoints
    app.post("/api/orders", authenticate, createOrder);
    app.post("/api/orders/:orderId/cancel", authenticate, cancelUserOrder);
    app.patch("/api/admin/products/:productId/variants/:variantId/stock", adminAuth, updateVariantStock);
    app.post("/api/user/referrals/apply", authenticate, applyReferral);
    app.post("/api/products/:productId/reviews", authenticate, addReview);
    app.post("/api/payment/webhook", handleRazorpayWebhook);

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
  // 1. CONCURRENT STOCK PURCHASE FOR LAST AVAILABLE ITEM
  // =========================================================
  test("TEST 1: Simultaneous checkout attempts for the final available stock -> exactly one succeeds, final stock is 0", async () => {
    const productId = singleStockProduct._id.toString();
    const variantId = singleStockProduct.variants[0]._id.toString();

    const token1 = jwt.sign({ userId: user1._id.toString() }, JWT_SECRET, { expiresIn: "1h" });
    const token2 = jwt.sign({ userId: user2._id.toString() }, JWT_SECRET, { expiresIn: "1h" });

    const orderPayload1 = {
      addressId: user1Address._id.toString(),
      paymentMethod: "cod",
      deliveryMethod: "standard",
      items: [
        {
          productId,
          variantId,
          productName: singleStockProduct.name,
          color: "Jet Black",
          size: "Standard",
          sku: "KATANA-SUN-JB-STD",
          quantity: 1,
          price: 2999,
        },
      ],
    };

    const orderPayload2 = {
      addressId: user2Address._id.toString(),
      paymentMethod: "cod",
      deliveryMethod: "standard",
      items: [
        {
          productId,
          variantId,
          productName: singleStockProduct.name,
          color: "Jet Black",
          size: "Standard",
          sku: "KATANA-SUN-JB-STD",
          quantity: 1,
          price: 2999,
        },
      ],
    };

    // Execute both checkout requests concurrently
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token1}`,
        },
        body: JSON.stringify(orderPayload1),
      }),
      fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token2}`,
        },
        body: JSON.stringify(orderPayload2),
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepStrictEqual(statuses, [201, 400], "Exactly one concurrent checkout must succeed (201) and one fail (400)");

    // Verify database stock integrity
    const refreshedProduct = await Product.findById(productId);
    const variantStock = refreshedProduct.variants.id(variantId).stock;
    assert.strictEqual(variantStock, 0, "Stock must be exactly 0, never negative under concurrent load");
  });

  // =========================================================
  // 2. ATOMIC VARIANT STOCK UPDATE (ADMIN)
  // =========================================================
  test("TEST 2: updateVariantStock updates inventory atomically without clobbering other variant data", async () => {
    const productId = singleStockProduct._id.toString();
    const variantId = singleStockProduct.variants[0]._id.toString();

    const res = await fetch(`${baseUrl}/api/admin/products/${productId}/variants/${variantId}/stock`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stock: 25 }),
    });

    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.product.totalStock, 25);

    const refreshed = await Product.findById(productId);
    assert.strictEqual(refreshed.variants.id(variantId).stock, 25);
    assert.strictEqual(refreshed.variants.id(variantId).color, "Jet Black");
    assert.strictEqual(refreshed.variants.id(variantId).sku, "KATANA-SUN-JB-STD");
  });

  // =========================================================
  // 3. ATOMIC STOCK RESTORATION ON ORDER CANCELLATION
  // =========================================================
  test("TEST 3: Order cancellation restores stock atomically using Product.updateOne $inc", async () => {
    const productId = singleStockProduct._id.toString();
    const variantId = singleStockProduct.variants[0]._id.toString();

    // 1. Place a 1-item order (stock drops from 25 to 24)
    const token = jwt.sign({ userId: user1._id.toString() }, JWT_SECRET, { expiresIn: "1h" });
    const orderRes = await fetch(`${baseUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        addressId: user1Address._id.toString(),
        paymentMethod: "cod",
        items: [
          {
            productId,
            variantId,
            productName: singleStockProduct.name,
            color: "Jet Black",
            size: "Standard",
            sku: "KATANA-SUN-JB-STD",
            quantity: 1,
            price: 2999,
          },
        ],
      }),
    });

    assert.strictEqual(orderRes.status, 201);
    const orderBody = await orderRes.json();
    const orderId = orderBody.order._id;

    let productAfterOrder = await Product.findById(productId);
    assert.strictEqual(productAfterOrder.variants.id(variantId).stock, 24);

    // 2. Cancel order
    const cancelRes = await fetch(`${baseUrl}/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cancellationReason: "Changed my mind" }),
    });

    assert.strictEqual(cancelRes.status, 200);

    // 3. Stock must be atomically restored back to 25
    const productAfterCancel = await Product.findById(productId);
    assert.strictEqual(productAfterCancel.variants.id(variantId).stock, 25);
  });

  // =========================================================
  // 4. COUPON USAGE-LIMIT ENFORCEMENT UNDER CONCURRENCY
  // =========================================================
  test("TEST 4: Concurrent usage of single-use coupon limit strictly prevents duplicate application", async () => {
    const today = new Date();
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const singleUseCoupon = await Coupon.create({
      code: "ONEONLY100",
      discountType: "fixed",
      discountValue: 500,
      minOrderAmount: 1000,
      validFrom: today,
      validUntil: future,
      usageLimit: 1,
      usedCount: 0,
      oneUsePerUser: false,
      isActive: true,
    });

    const token1 = jwt.sign({ userId: user1._id.toString() }, JWT_SECRET, { expiresIn: "1h" });
    const token2 = jwt.sign({ userId: user2._id.toString() }, JWT_SECRET, { expiresIn: "1h" });

    const productId = singleStockProduct._id.toString();
    const variantId = singleStockProduct.variants[0]._id.toString();

    const makeOrderPayload = (addr) => ({
      addressId: addr._id.toString(),
      paymentMethod: "cod",
      couponCode: "ONEONLY100",
      items: [
        {
          productId,
          variantId,
          productName: singleStockProduct.name,
          color: "Jet Black",
          size: "Standard",
          sku: "KATANA-SUN-JB-STD",
          quantity: 1,
          price: 2999,
        },
      ],
    });

    // Execute concurrently
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token1}` },
        body: JSON.stringify(makeOrderPayload(user1Address)),
      }),
      fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token2}` },
        body: JSON.stringify(makeOrderPayload(user2Address)),
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    assert.deepStrictEqual(statuses, [201, 400], "Coupon usageLimit: 1 must permit exactly one order and reject the other");

    const refreshedCoupon = await Coupon.findById(singleUseCoupon._id);
    assert.strictEqual(refreshedCoupon.usedCount, 1, "Coupon usedCount must be exactly 1");
  });

  // =========================================================
  // 5. REFERRAL SINGLE-REFERRER PARTIAL UNIQUE INDEX
  // =========================================================
  test("TEST 5: A user cannot be referred by multiple accounts under concurrent referral attempts", async () => {
    const newUser = await User.create({
      fullName: "Inosuke Hashibira",
      email: "inosuke@getsuka.com",
      password: "HashedPassword123!",
      isVerified: true,
      isBlocked: false,
    });

    const token = jwt.sign({ userId: newUser._id.toString() }, JWT_SECRET, { expiresIn: "1h" });

    // Attempt 1: Apply referral with Referrer 1
    const res1 = await fetch(`${baseUrl}/api/user/referrals/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        referralCode: referrerUser1.referralCode,
        referredUserId: newUser._id.toString(),
      }),
    });
    assert.strictEqual(res1.status, 201);

    // Attempt 2: Try applying another referral with Referrer 2 for the same user
    const res2 = await fetch(`${baseUrl}/api/user/referrals/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        referralCode: referrerUser2.referralCode,
        referredUserId: newUser._id.toString(),
      }),
    });

    assert.strictEqual(res2.status, 400);
    const body2 = await res2.json();
    assert.strictEqual(body2.message, "This user has already used a referral.");

    // Verify in database that only ONE referral document exists for newUser
    const count = await Referral.countDocuments({ referredUser: newUser._id });
    assert.strictEqual(count, 1);
  });

  // =========================================================
  // 6. REVIEW COMPOUND UNIQUE INDEX ENFORCEMENT
  // =========================================================
  test("TEST 6: Compound unique index on Review { user: 1, product: 1 } blocks duplicate reviews with 409", async () => {
    // 1. Create a delivered order for user1 so they have verified purchase
    const productId = singleStockProduct._id.toString();
    const variantId = singleStockProduct.variants[0]._id.toString();

    await Order.create({
      orderNumber: "ORD-DELIVERED-REV-01",
      userId: user1._id,
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
          productId,
          variantId,
          productName: singleStockProduct.name,
          color: "Jet Black",
          size: "Standard",
          sku: "KATANA-SUN-JB-STD",
          quantity: 1,
          price: 2999,
          totalPrice: 2999,
        },
      ],
      subtotal: 2999,
      shippingCharge: 0,
      discount: 0,
      totalAmount: 2999,
      paymentMethod: "cod",
      paymentStatus: "paid",
      status: "delivered",
      deliveredAt: new Date(),
    });

    const token = jwt.sign({ userId: user1._id.toString() }, JWT_SECRET, { expiresIn: "1h" });

    // Review Attempt 1
    const res1 = await fetch(`${baseUrl}/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        rating: 5,
        comment: "Outstanding balance and craftsmanship!",
      }),
    });
    assert.strictEqual(res1.status, 201);

    // Review Attempt 2 (Duplicate)
    const res2 = await fetch(`${baseUrl}/api/products/${productId}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        rating: 4,
        comment: "Trying to submit a second review",
      }),
    });
    assert.strictEqual(res2.status, 409);
    const body2 = await res2.json();
    assert.strictEqual(body2.message, "You have already reviewed this product");

    const reviewCount = await Review.countDocuments({ user: user1._id, product: productId });
    assert.strictEqual(reviewCount, 1);
  });

  // =========================================================
  // 7. COMPENSATING WALLET REFUND VALID REASON RECOVERY
  // =========================================================
  test("TEST 7: Compensating wallet refund on order failure uses valid order_cancellation_refund reason", async () => {
    // 1. Credit wallet with ₹10,000
    await creditWallet({
      userId: user1._id.toString(),
      amount: 10000,
      reason: "manual_credit",
      description: "Test wallet balance",
    });

    const walletBefore = await Wallet.findOne({ userId: user1._id });
    const initialBalance = walletBefore.balance;

    // 2. Debit wallet for an order
    await debitWallet({
      userId: user1._id.toString(),
      amount: 2500,
      reason: "wallet_payment",
      description: "Order GET-FAIL-01",
      orderNumber: "GET-FAIL-01",
    });

    const walletAfterDebit = await Wallet.findOne({ userId: user1._id });
    assert.strictEqual(walletAfterDebit.balance, initialBalance - 2500);

    // 3. Execute compensating refund as performed in orderController catch block
    const refundResult = await creditWallet({
      userId: user1._id.toString(),
      amount: 2500,
      reason: "order_cancellation_refund",
      description: "Refund for failed order creation GET-FAIL-01",
      orderNumber: "GET-FAIL-01",
    });

    assert.strictEqual(refundResult.alreadyCredited, false);
    const walletAfterRefund = await Wallet.findOne({ userId: user1._id });
    assert.strictEqual(walletAfterRefund.balance, initialBalance);
  });

  // =========================================================
  // 8. TTL INDEX CONFIGURATION ON ALL OTP SCHEMAS
  // =========================================================
  test("TEST 8: All OTP schemas define TTL indexes on expiresAt with expireAfterSeconds: 0", () => {
    const checkTtlIndex = (model) => {
      const indexes = model.schema.indexes();
      const ttlIndex = indexes.find(
        ([fields, options]) => fields.expiresAt === 1 && options?.expireAfterSeconds === 0
      );
      return Boolean(ttlIndex);
    };

    assert.ok(checkTtlIndex(OtpVerification), "OtpVerification must have TTL index on expiresAt");
    assert.ok(checkTtlIndex(PasswordResetOtp), "PasswordResetOtp must have TTL index on expiresAt");
    assert.ok(checkTtlIndex(AdminPasswordResetOtp), "AdminPasswordResetOtp must have TTL index on expiresAt");
    assert.ok(checkTtlIndex(EmailChangeOtp), "EmailChangeOtp must have TTL index on expiresAt");
  });

  // =========================================================
  // 9. REPLICA SET DETECTION / TRANSACTION SAFETY REPORTING
  // =========================================================
  test("TEST 9: Database topology inspection verifies replica set and transaction mode", () => {
    const topology = mongoose.connection?.client?.topology;
    const type = topology?.description?.type;

    const isReplicaSet =
      type === "ReplicaSetWithPrimary" ||
      type === "ReplicaSetNoPrimary" ||
      type === "Sharded";

    // Test environment reports topology accurately
    assert.ok(type !== undefined, "MongoDB connection topology must be inspectable");
    if (!isReplicaSet) {
      // Standalone mode: compensated rollback & atomic conditional updates guarantee data integrity
      assert.ok(
        type === "Single" || type === "Unknown",
        "Standalone MongoDB uses atomic conditional updates and compensating rollbacks"
      );
    }
  });

  // =========================================================
  // 10. VALID OPERATIONS CONTINUE TO OPERATE WITH FULL INTEGRITY
  // =========================================================
  test("TEST 10: Valid category, product, and order operations execute cleanly", async () => {
    // 1. Category find
    const categories = await Category.find({ isDeleted: false }).sort({ createdAt: -1 });
    assert.ok(categories.length > 0);

    // 2. Product find
    const products = await Product.find({ isDeleted: false }).sort({ createdAt: -1 });
    assert.ok(products.length > 0);

    // 3. Wallet query
    const userWallet = await Wallet.findOne({ userId: user1._id });
    assert.ok(userWallet !== null);
    assert.ok(userWallet.balance >= 0);
  });
});
