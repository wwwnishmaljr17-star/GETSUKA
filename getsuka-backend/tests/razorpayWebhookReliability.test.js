import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import mongoose from "mongoose";

import Product from "../src/features/product/models/Product.js";
import Order from "../src/features/order/models/Order.js";
import Payment from "../src/features/payment/models/Payment.js";
import Address from "../src/features/address/models/Address.js";
import Category from "../src/features/category/models/Category.js";
import Coupon from "../src/features/coupon/models/Coupon.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import razorpay from "../src/config/razorpay.js";

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
} from "../src/features/payment/controllers/paymentController.js";
import { createOrder } from "../src/features/order/controllers/orderController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_razorpay_webhook";
const TEST_WEBHOOK_SECRET = "getsuka_webhook_secret_key";

process.env.RAZORPAY_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;
process.env.RAZORPAY_KEY_SECRET = "test_razorpay_key_secret";

const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

const generateWebhookSignature = (payload, secret = TEST_WEBHOOK_SECRET) => {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
};

describe("Razorpay Payment Reliability & Webhook Flow Tests (Step 5)", () => {
  let originalOrdersCreate;
  let testCategory;
  let testUser;
  let testAddress;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    // Mock razorpay.orders.create for offline isolated execution
    originalOrdersCreate = razorpay.orders.create;
    razorpay.orders.create = async (options) => ({
      id: `order_test_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      amount: options.amount,
      currency: options.currency || "INR",
      receipt: options.receipt,
      notes: options.notes,
    });

    testCategory = await Category.create({
      name: "Anime Outerwear",
      isDeleted: false,
    });

    testUser = {
      userId: new mongoose.Types.ObjectId(),
    };

    testAddress = await Address.create({
      userId: testUser.userId,
      fullName: "Giyuu Tomioka",
      phone: "9876543210",
      addressLine: "Water Estate",
      city: "Tokyo",
      state: "Tokyo",
      pincode: "100001",
    });
  });

  after(async () => {
    if (originalOrdersCreate) {
      razorpay.orders.create = originalOrdersCreate;
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================
  // TEST 1: SUCCESSFUL RAZORPAY PAYMENT RECORDING
  // =========================================================
  test("TEST 1: Successful Razorpay payment creates and records payment intent correctly", async () => {
    const product = await Product.create({
      name: "Water Hashira Haori",
      description: "Authentic Haori",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 2500,
      variants: [
        {
          color: "Pattern",
          size: "L",
          sku: `HAORI-${Date.now()}`,
          stock: 15,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const orderData = {
      addressId: testAddress._id,
      items: [
        {
          productId: product._id,
          variantId: product.variants[0]._id,
          quantity: 2,
        },
      ],
      deliveryMethod: "standard",
    };

    const req = {
      user: testUser,
      body: {
        amount: 5000,
        orderData,
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.order?.id);

    const savedPayment = await Payment.findOne({ razorpayOrderId: res.body.order.id });
    assert.ok(savedPayment, "Payment intent must be stored in database");
    assert.strictEqual(savedPayment.amount, 5000);
    assert.strictEqual(savedPayment.status, "created");
    assert.strictEqual(savedPayment.paymentType, "order_checkout");
    assert.strictEqual(String(savedPayment.userId), String(testUser.userId));
  });

  // =========================================================
  // TEST 2: WEBHOOK CREATES/CONFIRMS ORDER ON PAYMENT SUCCESS
  // =========================================================
  test("TEST 2: Webhook received after successful payment creates order safely once", async () => {
    const product = await Product.create({
      name: "Flame Hashira Cape",
      description: "Flame Cape",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 1800,
      variants: [
        {
          color: "Flame",
          size: "M",
          sku: `CAPE-${Date.now()}`,
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;
    const razorpayOrderId = `order_webhook_t2_${Date.now()}`;
    const razorpayPaymentId = `pay_webhook_t2_${Date.now()}`;

    // Stored payment intent
    await Payment.create({
      userId: testUser.userId,
      razorpayOrderId,
      amount: 1800,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
      orderData: {
        addressId: testAddress._id,
        items: [
          {
            productId: product._id,
            variantId,
            quantity: 1,
          },
        ],
        deliveryMethod: "standard",
      },
    });

    const webhookPayload = {
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 180000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = generateWebhookSignature(rawPayload);

    const req = {
      headers: {
        "x-razorpay-signature": signature,
      },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };

    const res = createMockRes();
    await handleRazorpayWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    const order = await Order.findOne({ razorpayOrderId });
    assert.ok(order, "Order must be created by webhook");
    assert.strictEqual(order.paymentStatus, "paid");
    assert.strictEqual(order.razorpayPaymentId, razorpayPaymentId);

    const updatedProduct = await Product.findById(product._id);
    assert.strictEqual(
      updatedProduct.variants.id(variantId).stock,
      9,
      "Stock must be deducted by exactly 1"
    );
  });

  // =========================================================
  // TEST 3: DUPLICATE WEBHOOK HANDLING (IDEMPOTENCY)
  // =========================================================
  test("TEST 3: Same webhook received twice does NOT create duplicate orders or deduct stock twice", async () => {
    const product = await Product.create({
      name: "Sound Hashira Cleaver Tee",
      description: "Graphic Tee",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 1200,
      variants: [
        {
          color: "Black",
          size: "XL",
          sku: `CLEAVER-${Date.now()}`,
          stock: 5,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;
    const razorpayOrderId = `order_webhook_t3_${Date.now()}`;
    const razorpayPaymentId = `pay_webhook_t3_${Date.now()}`;

    await Payment.create({
      userId: testUser.userId,
      razorpayOrderId,
      amount: 1200,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
      orderData: {
        addressId: testAddress._id,
        items: [
          {
            productId: product._id,
            variantId,
            quantity: 2,
          },
        ],
        deliveryMethod: "standard",
      },
    });

    const webhookPayload = {
      entity: "event",
      event: "order.paid",
      payload: {
        order: {
          entity: {
            id: razorpayOrderId,
            amount: 120000,
            amount_paid: 120000,
            status: "paid",
          },
        },
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 120000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = generateWebhookSignature(rawPayload);

    // FIRST WEBHOOK DELIVERY
    const req1 = {
      headers: { "x-razorpay-signature": signature },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };
    const res1 = createMockRes();
    await handleRazorpayWebhook(req1, res1);
    assert.strictEqual(res1.statusCode, 200);

    // SECOND WEBHOOK DELIVERY (RETRY)
    const req2 = {
      headers: { "x-razorpay-signature": signature },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };
    const res2 = createMockRes();
    await handleRazorpayWebhook(req2, res2);
    assert.strictEqual(res2.statusCode, 200);

    const orderCount = await Order.countDocuments({ razorpayOrderId });
    assert.strictEqual(orderCount, 1, "Must never create duplicate orders for the same razorpay order");

    const checkProduct = await Product.findById(product._id);
    assert.strictEqual(
      checkProduct.variants.id(variantId).stock,
      3,
      "Stock must be deducted exactly once (5 - 2 = 3)"
    );
  });

  // =========================================================
  // TEST 4: INVALID WEBHOOK SIGNATURE REJECTION
  // =========================================================
  test("TEST 4: Webhook with invalid or forged signature is rejected with 400", async () => {
    const webhookPayload = {
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: "pay_forged_123",
            order_id: "order_forged_123",
            amount: 100000,
          },
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const forgedSignature = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    const req = {
      headers: {
        "x-razorpay-signature": forgedSignature,
      },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };

    const res = createMockRes();
    await handleRazorpayWebhook(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /invalid razorpay webhook signature/i);
  });

  // =========================================================
  // TEST 5: FRONTEND CRASH RECOVERY VIA WEBHOOK
  // =========================================================
  test("TEST 5: Frontend crashes after payment: backend successfully recovers and creates order", async () => {
    const product = await Product.create({
      name: "Mist Hashira Kimono",
      description: "Mist Kimono",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 3200,
      variants: [
        {
          color: "Teal",
          size: "S",
          sku: `MIST-${Date.now()}`,
          stock: 8,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;
    const razorpayOrderId = `order_crash_t5_${Date.now()}`;
    const razorpayPaymentId = `pay_crash_t5_${Date.now()}`;

    // 1. Payment intent created before opening Razorpay modal
    await Payment.create({
      userId: testUser.userId,
      razorpayOrderId,
      amount: 3200,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
      orderData: {
        addressId: testAddress._id,
        items: [{ productId: product._id, variantId, quantity: 1 }],
        deliveryMethod: "standard",
      },
    });

    // 2. User pays on Razorpay. Browser immediately closes/crashes before createOrder API is called.
    // 3. Razorpay webhook fires asynchronously to server.
    const webhookPayload = {
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 320000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = generateWebhookSignature(rawPayload);

    const req = {
      headers: { "x-razorpay-signature": signature },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };

    const res = createMockRes();
    await handleRazorpayWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);

    // Verify order was recovered and created in DB
    const order = await Order.findOne({ razorpayOrderId });
    assert.ok(order, "Order must be created despite frontend crash");
    assert.strictEqual(order.paymentStatus, "paid");
    assert.strictEqual(order.totalAmount, 3200);
    assert.strictEqual(String(order.userId), String(testUser.userId));

    // Verify stock was deducted
    const checkProduct = await Product.findById(product._id);
    assert.strictEqual(checkProduct.variants.id(variantId).stock, 7);
  });

  // =========================================================
  // TEST 6: FAILED PAYMENT WEBHOOK DOES NOT CREATE ORDER
  // =========================================================
  test("TEST 6: Failed payment event records status as failed and does NOT create order", async () => {
    const razorpayOrderId = `order_failed_t6_${Date.now()}`;
    const razorpayPaymentId = `pay_failed_t6_${Date.now()}`;

    await Payment.create({
      userId: testUser.userId,
      razorpayOrderId,
      amount: 1500,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
      orderData: {
        addressId: testAddress._id,
        items: [],
      },
    });

    const webhookPayload = {
      entity: "event",
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 150000,
            error_description: "Bank server declined transaction",
          },
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = generateWebhookSignature(rawPayload);

    const req = {
      headers: { "x-razorpay-signature": signature },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };

    const res = createMockRes();
    await handleRazorpayWebhook(req, res);

    assert.strictEqual(res.statusCode, 200);

    const order = await Order.findOne({ razorpayOrderId });
    assert.strictEqual(order, null, "No order must be created for failed payments");

    const payment = await Payment.findOne({ razorpayOrderId });
    assert.strictEqual(payment.status, "failed");
    assert.match(payment.failureReason, /declined/i);
  });

  // =========================================================
  // TEST 7: PAYMENT AMOUNT MISMATCH IS REJECTED
  // =========================================================
  test("TEST 7: Webhook with amount mismatch against payment record is rejected with 400", async () => {
    const razorpayOrderId = `order_mismatch_t7_${Date.now()}`;

    await Payment.create({
      userId: testUser.userId,
      razorpayOrderId,
      amount: 4000,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
      orderData: {
        addressId: testAddress._id,
        items: [],
      },
    });

    // Webhook claims only ₹100 was paid for a ₹4,000 order
    const webhookPayload = {
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: `pay_mismatch_${Date.now()}`,
            order_id: razorpayOrderId,
            amount: 10000, // ₹100 instead of ₹4000
            status: "captured",
          },
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = generateWebhookSignature(rawPayload);

    const req = {
      headers: { "x-razorpay-signature": signature },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };

    const res = createMockRes();
    await handleRazorpayWebhook(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /amount mismatch/i);

    const payment = await Payment.findOne({ razorpayOrderId });
    assert.strictEqual(payment.status, "failed");
  });

  // =========================================================
  // TEST 8: EXISTING COD ORDER IS UNAFFECTED
  // =========================================================
  test("TEST 8: Existing Cash on Delivery order flow remains completely unaffected", async () => {
    const product = await Product.create({
      name: "Zenitsu Lightning Hoodie",
      description: "Yellow Hoodie",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 2000,
      variants: [
        {
          color: "Yellow",
          size: "M",
          sku: `HOODIE-${Date.now()}`,
          stock: 6,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;

    const req = {
      user: testUser,
      body: {
        addressId: testAddress._id,
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [{ productId: product._id, variantId, quantity: 1 }],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.order.paymentMethod, "cod");
    assert.strictEqual(res.body.order.paymentStatus, "pending");

    const checkProduct = await Product.findById(product._id);
    assert.strictEqual(checkProduct.variants.id(variantId).stock, 5);
  });

  // =========================================================
  // TEST 9: EXISTING WALLET PAYMENT IS UNAFFECTED
  // =========================================================
  test("TEST 9: Existing wallet payment flow remains completely unaffected", async () => {
    const walletUser = {
      userId: new mongoose.Types.ObjectId(),
    };

    await Wallet.create({
      userId: walletUser.userId,
      balance: 5000,
      transactions: [],
    });

    const product = await Product.create({
      name: "Inosuke Boar Mask Cap",
      description: "Fleece Cap",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 1500,
      variants: [
        {
          color: "Grey",
          size: "Free",
          sku: `CAP-${Date.now()}`,
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;

    const walletAddress = await Address.create({
      userId: walletUser.userId,
      fullName: "Inosuke Hashibira",
      phone: "9876543210",
      addressLine: "Boar Mountain",
      city: "Tokyo",
      state: "Tokyo",
      pincode: "100001",
    });

    const req = {
      user: walletUser,
      body: {
        addressId: walletAddress._id,
        paymentMethod: "wallet",
        deliveryMethod: "standard",
        items: [{ productId: product._id, variantId, quantity: 1 }],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.order.paymentMethod, "wallet");
    assert.strictEqual(res.body.order.paymentStatus, "paid");

    const updatedWallet = await Wallet.findOne({ userId: walletUser.userId });
    assert.strictEqual(updatedWallet.balance, 3500);
  });

  // =========================================================
  // TEST 10: WALLET TOP-UP WEBHOOK IDEMPOTENCY
  // =========================================================
  test("TEST 10: Wallet top-up via Razorpay webhook credits wallet idempotently", async () => {
    const topupUser = {
      userId: new mongoose.Types.ObjectId(),
    };

    await Wallet.create({
      userId: topupUser.userId,
      balance: 100,
      transactions: [],
    });

    const razorpayOrderId = `order_wallet_topup_${Date.now()}`;
    const razorpayPaymentId = `pay_wallet_topup_${Date.now()}`;

    await Payment.create({
      userId: topupUser.userId,
      razorpayOrderId,
      amount: 500,
      currency: "INR",
      status: "created",
      paymentType: "wallet_topup",
    });

    const webhookPayload = {
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 50000,
            currency: "INR",
            status: "captured",
            notes: {
              type: "wallet_topup",
              userId: String(topupUser.userId),
            },
          },
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = generateWebhookSignature(rawPayload);

    // Call 1
    const req1 = {
      headers: { "x-razorpay-signature": signature },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };
    const res1 = createMockRes();
    await handleRazorpayWebhook(req1, res1);
    assert.strictEqual(res1.statusCode, 200);

    // Call 2 (Duplicate webhook delivery)
    const req2 = {
      headers: { "x-razorpay-signature": signature },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };
    const res2 = createMockRes();
    await handleRazorpayWebhook(req2, res2);
    assert.strictEqual(res2.statusCode, 200);

    const checkWallet = await Wallet.findOne({ userId: topupUser.userId });
    assert.strictEqual(
      checkWallet.balance,
      600,
      "Wallet balance must be exactly 100 + 500 = 600 without double credit"
    );
  });

  // =========================================================
  // TEST 11: WEBHOOK ARRIVES BEFORE FRONTEND CALLS CREATEORDER
  // =========================================================
  test("TEST 11: Webhook arrives before frontend createOrder: frontend returns existing order without double-deduction", async () => {
    const product = await Product.create({
      name: "Akaza Upper Moon Vest",
      description: "Martial Arts Vest",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 2100,
      variants: [
        {
          color: "Maroon",
          size: "M",
          sku: `AKAZA-${Date.now()}`,
          stock: 4,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;
    const razorpayOrderId = `order_race_t11_${Date.now()}`;
    const razorpayPaymentId = `pay_race_t11_${Date.now()}`;

    // 1. Payment intent stored
    await Payment.create({
      userId: testUser.userId,
      razorpayOrderId,
      amount: 2100,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
      orderData: {
        addressId: testAddress._id,
        items: [{ productId: product._id, variantId, quantity: 1 }],
        deliveryMethod: "standard",
      },
    });

    // 2. Webhook arrives FIRST
    const webhookPayload = {
      entity: "event",
      event: "payment.captured",
      payload: {
        payment: {
          entity: {
            id: razorpayPaymentId,
            order_id: razorpayOrderId,
            amount: 210000,
            currency: "INR",
            status: "captured",
          },
        },
      },
    };

    const rawPayload = JSON.stringify(webhookPayload);
    const signature = generateWebhookSignature(rawPayload);

    const webhookReq = {
      headers: { "x-razorpay-signature": signature },
      body: webhookPayload,
      rawBody: Buffer.from(rawPayload),
    };
    const webhookRes = createMockRes();
    await handleRazorpayWebhook(webhookReq, webhookRes);
    assert.strictEqual(webhookRes.statusCode, 200);

    // 3. Frontend reconnects 2 seconds later and calls createOrder
    const frontendReq = {
      user: testUser,
      body: {
        addressId: testAddress._id,
        items: [{ productId: product._id, variantId, quantity: 1 }],
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId,
        razorpayPaymentId,
        paymentStatus: "paid",
      },
    };

    const frontendRes = createMockRes();
    await createOrder(frontendReq, frontendRes);

    assert.strictEqual(frontendRes.statusCode, 200);
    assert.strictEqual(frontendRes.body.alreadyProcessed, true);
    assert.ok(frontendRes.body.order);

    const checkProduct = await Product.findById(product._id);
    assert.strictEqual(
      checkProduct.variants.id(variantId).stock,
      3,
      "Stock must only be deducted once (4 - 1 = 3)"
    );
  });
});
