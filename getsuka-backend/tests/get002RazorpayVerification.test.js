import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import mongoose from "mongoose";

import Product from "../src/features/product/models/Product.js";
import Order from "../src/features/order/models/Order.js";
import Payment from "../src/features/payment/models/Payment.js";
import Address from "../src/features/address/models/Address.js";
import Category from "../src/features/category/models/Category.js";
import User from "../src/features/auth/models/User.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import { createOrder } from "../src/features/order/controllers/orderController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_get002_verification";
const TEST_RAZORPAY_SECRET = "test_razorpay_secret_get002_secure_12345";

process.env.RAZORPAY_KEY_SECRET = TEST_RAZORPAY_SECRET;

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

const generateValidSignature = (orderId, paymentId, secret = TEST_RAZORPAY_SECRET) => {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
};

describe("GET-002: Razorpay Payment Verification & Order Security Tests", () => {
  let testCategory;
  let testUser;
  let otherUser;
  let testAddress;
  let otherAddress;
  let standardProduct;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    testCategory = await Category.create({
      name: "Cyberpunk Streetwear",
      isDeleted: false,
    });

    testUser = await User.create({
      fullName: "Guts Berserk",
      email: "guts@getsuka.com",
      password: "HashedPassword123",
      isVerified: true,
      isBlocked: false,
    });

    otherUser = await User.create({
      fullName: "Griffith Hawk",
      email: "griffith@getsuka.com",
      password: "HashedPassword456",
      isVerified: true,
      isBlocked: false,
    });

    testAddress = await Address.create({
      userId: testUser._id,
      fullName: "Guts Berserk",
      phone: "9876543210",
      addressLine: "Midland Fortress",
      city: "Falconia",
      state: "Midland",
      pincode: "100001",
    });

    otherAddress = await Address.create({
      userId: otherUser._id,
      fullName: "Griffith Hawk",
      phone: "9876543211",
      addressLine: "White Castle",
      city: "Falconia",
      state: "Midland",
      pincode: "100002",
    });

    standardProduct = await Product.create({
      name: "Dragon Slayer Oversized Hoodie",
      description: "Heavyweight black oversized hoodie",
      category: testCategory._id,
      anime: "Berserk",
      images: ["hoodie1.jpg", "hoodie2.jpg", "hoodie3.jpg"],
      price: 2999,
      variants: [
        {
          color: "Pitch Black",
          size: "XL",
          sku: `DRAGON-XL-${Date.now()}`,
          stock: 20,
        },
      ],
      isListed: true,
      isDeleted: false,
    });
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================
  // TEST 1: VALID PAYMENT VERIFICATION (PRE-CAPTURED PAYMENT)
  // =========================================================
  test("TEST 1: Valid payment verification creates order as 'paid' and links payment record", async () => {
    const variantId = standardProduct.variants[0]._id;
    const orderId = `order_get002_valid_${Date.now()}`;
    const paymentId = `pay_get002_valid_${Date.now()}`;
    const signature = generateValidSignature(orderId, paymentId);

    // Payment pre-captured by /verify-payment
    const payment = await Payment.create({
      userId: testUser._id,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      amount: 2999,
      currency: "INR",
      status: "captured",
      paymentType: "order_checkout",
    });

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.order);
    assert.strictEqual(res.body.order.paymentStatus, "paid");
    assert.strictEqual(res.body.order.paymentMethod, "razorpay");
    assert.strictEqual(res.body.order.razorpayOrderId, orderId);
    assert.strictEqual(res.body.order.razorpayPaymentId, paymentId);

    // Verify Payment record is linked to order
    const updatedPayment = await Payment.findOne({ razorpayOrderId: orderId });
    assert.strictEqual(updatedPayment.status, "captured");
    assert.strictEqual(updatedPayment.orderId.toString(), res.body.order._id.toString());
  });

  // =========================================================
  // TEST 2: VALID DIRECT PAYMENT VERIFICATION WITH SIGNATURE
  // =========================================================
  test("TEST 2: Direct payment verification in createOrder captures uncaptured payment with valid HMAC signature", async () => {
    const variantId = standardProduct.variants[0]._id;
    const orderId = `order_get002_direct_${Date.now()}`;
    const paymentId = `pay_get002_direct_${Date.now()}`;
    const signature = generateValidSignature(orderId, paymentId);

    // Payment in 'created' status
    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: orderId,
      amount: 2999,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
    });

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.order.paymentStatus, "paid");

    const updatedPayment = await Payment.findOne({ razorpayOrderId: orderId });
    assert.strictEqual(updatedPayment.status, "captured");
    assert.strictEqual(updatedPayment.razorpayPaymentId, paymentId);
    assert.strictEqual(updatedPayment.razorpaySignature, signature);
  });

  // =========================================================
  // TEST 3: INVALID SIGNATURE REJECTION
  // =========================================================
  test("TEST 3: Invalid Razorpay signature is rejected with 400 and order is not created", async () => {
    const variantId = standardProduct.variants[0]._id;
    const orderId = `order_get002_forged_${Date.now()}`;
    const paymentId = `pay_get002_forged_${Date.now()}`;
    const forgedSignature = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: orderId,
      amount: 2999,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
    });

    const stockBefore = (await Product.findById(standardProduct._id)).variants.id(variantId).stock;

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: forgedSignature,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /signature/i);

    // Stock must NOT be deducted
    const stockAfter = (await Product.findById(standardProduct._id)).variants.id(variantId).stock;
    assert.strictEqual(stockAfter, stockBefore);

    // Payment must NOT be captured
    const dbPayment = await Payment.findOne({ razorpayOrderId: orderId });
    assert.strictEqual(dbPayment.status, "created");
  });

  // =========================================================
  // TEST 4: MISSING SIGNATURE REJECTION
  // =========================================================
  test("TEST 4: Missing Razorpay signature when payment is uncaptured is rejected with 400", async () => {
    const variantId = standardProduct.variants[0]._id;
    const orderId = `order_get002_nosig_${Date.now()}`;
    const paymentId = `pay_get002_nosig_${Date.now()}`;

    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: orderId,
      amount: 2999,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
    });

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        // No signature provided!
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /signature are required/i);
  });

  // =========================================================
  // TEST 5: INCORRECT / NON-EXISTENT RAZORPAY ORDER ID
  // =========================================================
  test("TEST 5: Incorrect or non-existent Razorpay order ID is rejected with 404", async () => {
    const variantId = standardProduct.variants[0]._id;
    const fakeOrderId = "order_FAKE_INVENTED_999999";

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: fakeOrderId,
        razorpayPaymentId: "pay_fake_123",
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /not found/i);
  });

  // =========================================================
  // TEST 6: PAYMENT BELONGING TO ANOTHER USER
  // =========================================================
  test("TEST 6: Attempting to use another user's Razorpay order ID is rejected with 403 Forbidden", async () => {
    const variantId = standardProduct.variants[0]._id;
    const otherUserOrderId = `order_other_user_${Date.now()}`;

    // Payment created by otherUser
    await Payment.create({
      userId: otherUser._id,
      razorpayOrderId: otherUserOrderId,
      amount: 2999,
      currency: "INR",
      status: "captured",
      paymentType: "order_checkout",
    });

    // testUser attempts to claim otherUser's payment
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: otherUserOrderId,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /does not belong to your account/i);
  });

  // =========================================================
  // TEST 7: AMOUNT MISMATCH VALIDATION
  // =========================================================
  test("TEST 7: Payment amount mismatch against server-calculated order total is rejected with 400", async () => {
    const variantId = standardProduct.variants[0]._id;
    const orderId = `order_mismatch_${Date.now()}`;

    // Attacker created payment for only ₹500, but is ordering item worth ₹2,999
    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: orderId,
      amount: 500,
      currency: "INR",
      status: "captured",
      paymentType: "order_checkout",
    });

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: orderId,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1, // Total = 2999
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /amount mismatch/i);
  });

  // =========================================================
  // TEST 8: CURRENCY MISMATCH VALIDATION
  // =========================================================
  test("TEST 8: Non-INR payment currency is rejected with 400", async () => {
    const variantId = standardProduct.variants[0]._id;
    const orderId = `order_curr_mismatch_${Date.now()}`;

    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: orderId,
      amount: 2999,
      currency: "USD",
      status: "captured",
      paymentType: "order_checkout",
    });

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: orderId,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /currency mismatch/i);
  });

  // =========================================================
  // TEST 9: DUPLICATE PAYMENT REPLAY (IDEMPOTENCY)
  // =========================================================
  test("TEST 9: Replaying an already-processed Razorpay payment returns existing order and does not deduct stock twice", async () => {
    const variantId = standardProduct.variants[0]._id;
    const orderId = `order_replay_${Date.now()}`;
    const paymentId = `pay_replay_${Date.now()}`;
    const signature = generateValidSignature(orderId, paymentId);

    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      amount: 2999,
      currency: "INR",
      status: "captured",
      paymentType: "order_checkout",
    });

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    // First placement
    const res1 = createMockRes();
    await createOrder(req, res1);
    assert.strictEqual(res1.statusCode, 201);
    const order1Id = res1.body.order._id.toString();

    // Second placement (replay attempt)
    const res2 = createMockRes();
    await createOrder(req, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body.alreadyProcessed, true);
    assert.strictEqual(res2.body.order._id.toString(), order1Id);

    // Verify only one order exists
    const count = await Order.countDocuments({ razorpayOrderId: orderId });
    assert.strictEqual(count, 1);
  });

  // =========================================================
  // TEST 10: FAILED PAYMENT STATUS REJECTION
  // =========================================================
  test("TEST 10: Payment marked as 'failed' cannot be used to place an order", async () => {
    const variantId = standardProduct.variants[0]._id;
    const orderId = `order_failed_${Date.now()}`;

    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: orderId,
      amount: 2999,
      currency: "INR",
      status: "failed",
      failureReason: "Card was declined by bank",
      paymentType: "order_checkout",
    });

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: orderId,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /already marked as failed/i);
  });

  // =========================================================
  // TEST 11: ABANDONED CHECKOUT SESSION
  // =========================================================
  test("TEST 11: Abandoned checkout session (created status, no payment) remains unpaid and cannot place order", async () => {
    const variantId = standardProduct.variants[0]._id;
    const orderId = `order_abandoned_${Date.now()}`;

    // User initiated checkout, order created on Razorpay, but user closed browser without paying
    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: orderId,
      amount: 2999,
      currency: "INR",
      status: "created",
      paymentType: "order_checkout",
    });

    // Attacker tries to complete order without payment or signature
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: orderId,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);

    // Payment record must remain 'created'
    const payment = await Payment.findOne({ razorpayOrderId: orderId });
    assert.strictEqual(payment.status, "created");
  });

  // =========================================================
  // TEST 12: PAYMENT RETRY FLOW
  // =========================================================
  test("TEST 12: Payment retry flow creates new Razorpay order and successfully places order with paid status", async () => {
    const variantId = standardProduct.variants[0]._id;
    const failedOrderId = `order_retry_orig_${Date.now()}`;
    const newRetryOrderId = `order_retry_new_${Date.now()}`;
    const newRetryPaymentId = `pay_retry_new_${Date.now()}`;
    const newRetrySignature = generateValidSignature(newRetryOrderId, newRetryPaymentId);

    // 1. Initial attempt marked failed
    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: failedOrderId,
      amount: 2999,
      currency: "INR",
      status: "failed",
      paymentType: "order_checkout",
    });

    // 2. Retry generates new Razorpay order and user completes payment
    await Payment.create({
      userId: testUser._id,
      razorpayOrderId: newRetryOrderId,
      razorpayPaymentId: newRetryPaymentId,
      razorpaySignature: newRetrySignature,
      amount: 2999,
      currency: "INR",
      status: "captured",
      paymentType: "order_checkout",
    });

    // 3. User completes order with new retry order details
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId: newRetryOrderId,
        razorpayPaymentId: newRetryPaymentId,
        razorpaySignature: newRetrySignature,
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.order.paymentStatus, "paid");
    assert.strictEqual(res.body.order.razorpayOrderId, newRetryOrderId);
  });

  // =========================================================
  // TEST 13: CASH ON DELIVERY (COD) FLOW PRESERVED
  // =========================================================
  test("TEST 13: Cash-on-Delivery orders succeed with 'pending' paymentStatus and enforce ₹25,000 limit", async () => {
    const variantId = standardProduct.variants[0]._id;

    const reqCOD = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const resCOD = createMockRes();
    await createOrder(reqCOD, resCOD);

    assert.strictEqual(resCOD.statusCode, 201);
    assert.strictEqual(resCOD.body.success, true);
    assert.strictEqual(resCOD.body.order.paymentMethod, "cod");
    assert.strictEqual(resCOD.body.order.paymentStatus, "pending");
  });

  // =========================================================
  // TEST 14: WALLET PAYMENT FLOW PRESERVED
  // =========================================================
  test("TEST 14: Wallet payment debits user wallet balance and marks order as 'paid'", async () => {
    const variantId = standardProduct.variants[0]._id;

    // Fund user wallet with ₹5,000
    await Wallet.findOneAndUpdate(
      { userId: testUser._id },
      { $set: { balance: 5000, transactions: [] } },
      { upsert: true }
    );

    const reqWallet = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "wallet",
        deliveryMethod: "standard",
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1, // ₹2,999
          },
        ],
      },
    };

    const resWallet = createMockRes();
    await createOrder(reqWallet, resWallet);

    assert.strictEqual(resWallet.statusCode, 201);
    assert.strictEqual(resWallet.body.success, true);
    assert.strictEqual(resWallet.body.order.paymentMethod, "wallet");
    assert.strictEqual(resWallet.body.order.paymentStatus, "paid");

    const walletDb = await Wallet.findOne({ userId: testUser._id });
    assert.strictEqual(walletDb.balance, 5000 - 2999);
  });

  // =========================================================
  // TEST 15: CLIENT-SUBMITTED PAYMENT STATUS IS UNTRUSTED
  // =========================================================
  test("TEST 15: Client directly submitting paymentStatus: 'paid' without verification is rejected", async () => {
    const variantId = standardProduct.variants[0]._id;

    // Client passes paymentStatus: "paid" with NO razorpay order ID
    const reqSpoof = {
      user: { userId: testUser._id.toString() },
      body: {
        addressId: testAddress._id.toString(),
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        paymentStatus: "paid", // Client claims it's paid!
        items: [
          {
            productId: standardProduct._id.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };

    const resSpoof = createMockRes();
    await createOrder(reqSpoof, resSpoof);

    assert.strictEqual(resSpoof.statusCode, 400);
    assert.strictEqual(resSpoof.body.success, false);
    assert.match(resSpoof.body.message, /Razorpay order ID is required/i);
  });
});
