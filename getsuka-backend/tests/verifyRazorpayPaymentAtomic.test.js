import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import mongoose from "mongoose";

import Payment from "../src/features/payment/models/Payment.js";
import { verifyRazorpayPayment } from "../src/features/payment/controllers/paymentController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_verify_atomic";
const TEST_KEY_SECRET = "test_razorpay_secret_key_12345";

process.env.RAZORPAY_KEY_SECRET = TEST_KEY_SECRET;

const createMockRes = () => {
  return {
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
};

const generateValidSignature = (orderId, paymentId, secret = TEST_KEY_SECRET) => {
  return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
};

describe("SEC-01 Step 1.1: Atomic Payment Capture & Real Database Concurrency Tests", () => {
  const testUserId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();
  });

  after(async () => {
    try {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    } catch {
      // Cleanup best effort
    }
  });

  test("TEST 1: Invalid HMAC signature is rejected with 400 and does not mutate database", async () => {
    const orderId = "order_test_sig_001";
    await Payment.create({
      userId: testUserId,
      razorpayOrderId: orderId,
      amount: 1999,
      status: "created",
      paymentType: "order_checkout",
    });

    const req = {
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: "pay_test_001",
        razorpay_signature: "invalid_hex_signature_that_does_not_match",
      },
      user: { userId: testUserId.toString() },
    };
    const res = createMockRes();

    await verifyRazorpayPayment(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Payment verification failed");

    // Verify database record was NOT mutated
    const dbPayment = await Payment.findOne({ razorpayOrderId: orderId });
    assert.strictEqual(dbPayment.status, "created");
    assert.strictEqual(dbPayment.razorpayPaymentId, null);
  });

  test("TEST 2: REAL CONCURRENT DB TEST: Two parallel requests with DIFFERENT payment IDs", async () => {
    const orderId = "order_test_race_diff_002";
    await Payment.create({
      userId: testUserId,
      razorpayOrderId: orderId,
      amount: 2499,
      status: "created",
      paymentType: "order_checkout",
    });

    const paymentIdA = "pay_winner_A";
    const signatureA = generateValidSignature(orderId, paymentIdA);

    const paymentIdB = "pay_loser_B";
    const signatureB = generateValidSignature(orderId, paymentIdB);

    const reqA = {
      body: { razorpay_order_id: orderId, razorpay_payment_id: paymentIdA, razorpay_signature: signatureA },
      user: { userId: testUserId.toString() },
    };
    const resA = createMockRes();

    const reqB = {
      body: { razorpay_order_id: orderId, razorpay_payment_id: paymentIdB, razorpay_signature: signatureB },
      user: { userId: testUserId.toString() },
    };
    const resB = createMockRes();

    // Fire both requests in parallel against real MongoDB
    await Promise.all([
      verifyRazorpayPayment(reqA, resA),
      verifyRazorpayPayment(reqB, resB),
    ]);

    const results = [resA, resB];
    const successes = results.filter((r) => r.statusCode === 200);
    const conflicts = results.filter((r) => r.statusCode === 409);

    assert.strictEqual(successes.length, 1, "Exactly one concurrent request must succeed");
    assert.strictEqual(conflicts.length, 1, "The competing request must receive 409 Conflict");
    assert.strictEqual(successes[0].body.success, true);
    assert.strictEqual(conflicts[0].body.success, false);
    assert.match(conflicts[0].body.message, /already been captured with a different payment ID/);

    // Verify database record was captured by the winner and not overwritten by the loser
    const finalDoc = await Payment.findOne({ razorpayOrderId: orderId });
    assert.strictEqual(finalDoc.status, "captured");
    assert.strictEqual(finalDoc.razorpayPaymentId, successes[0].body.payment.razorpayPaymentId);
  });

  test("TEST 3: REAL CONCURRENT DB TEST: Two parallel requests with the SAME payment ID", async () => {
    const orderId = "order_test_race_same_003";
    await Payment.create({
      userId: testUserId,
      razorpayOrderId: orderId,
      amount: 1499,
      status: "created",
      paymentType: "order_checkout",
    });

    const paymentId = "pay_identical_same";
    const signature = generateValidSignature(orderId, paymentId);

    const req1 = {
      body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature },
      user: { userId: testUserId.toString() },
    };
    const res1 = createMockRes();

    const req2 = {
      body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature },
      user: { userId: testUserId.toString() },
    };
    const res2 = createMockRes();

    // Fire both requests in parallel against real MongoDB
    await Promise.all([
      verifyRazorpayPayment(req1, res1),
      verifyRazorpayPayment(req2, res2),
    ]);

    // Both must return 200 (one captured first-time, one returned idempotent success)
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res1.body.success, true);
    assert.strictEqual(res2.body.success, true);

    const finalDoc = await Payment.findOne({ razorpayOrderId: orderId });
    assert.strictEqual(finalDoc.status, "captured");
    assert.strictEqual(finalDoc.razorpayPaymentId, paymentId);
  });

  test("TEST 4: Ownership tampering is rejected with 403", async () => {
    const orderId = "order_test_ownership_004";
    await Payment.create({
      userId: testUserId,
      razorpayOrderId: orderId,
      amount: 3000,
      status: "created",
      paymentType: "order_checkout",
    });

    const paymentId = "pay_hijack_004";
    const signature = generateValidSignature(orderId, paymentId);

    const req = {
      body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature },
      user: { userId: otherUserId.toString() }, // Different user
    };
    const res = createMockRes();

    await verifyRazorpayPayment(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Unauthorized: This payment does not belong to your account/);
  });

  test("TEST 5: Payment already marked failed cannot be verified", async () => {
    const orderId = "order_test_failed_005";
    await Payment.create({
      userId: testUserId,
      razorpayOrderId: orderId,
      amount: 500,
      status: "failed",
      paymentType: "order_checkout",
    });

    const paymentId = "pay_failed_005";
    const signature = generateValidSignature(orderId, paymentId);

    const req = {
      body: { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature },
      user: { userId: testUserId.toString() },
    };
    const res = createMockRes();

    await verifyRazorpayPayment(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /already marked as failed/);
  });

  test("TEST 6: Malformed non-string and empty whitespace inputs are rejected with 400 without calling DB", async () => {
    const invalidPayloads = [
      {}, // Missing completely
      { razorpay_order_id: null, razorpay_payment_id: "pay_1", razorpay_signature: "sig_1" },
      { razorpay_order_id: 12345, razorpay_payment_id: "pay_1", razorpay_signature: "sig_1" },
      { razorpay_order_id: "order_1", razorpay_payment_id: true, razorpay_signature: "sig_1" },
      { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: {} },
      { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: ["array"] },
      { razorpay_order_id: "   ", razorpay_payment_id: "pay_1", razorpay_signature: "sig_1" },
      { razorpay_order_id: "order_1", razorpay_payment_id: "   ", razorpay_signature: "sig_1" },
      { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1", razorpay_signature: "   " },
    ];

    for (const body of invalidPayloads) {
      const req = {
        body,
        user: { userId: testUserId.toString() },
      };
      const res = createMockRes();

      await verifyRazorpayPayment(req, res);

      assert.strictEqual(res.statusCode, 400, `Expected 400 for payload: ${JSON.stringify(body)}`);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.message, "Payment verification details are missing or invalid");
    }
  });

  test("TEST 7: Concurrency fallback is ownership-safe and rejects other users with 403", async () => {
    const orderId = "order_test_fallback_owner_007";
    const paymentId = "pay_fallback_owner_007";
    const signature = generateValidSignature(orderId, paymentId);

    // Create payment owned by testUserId that is already captured
    await Payment.create({
      userId: testUserId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
      amount: 4000,
      status: "captured",
      paymentType: "order_checkout",
    });

    // Attacker (otherUserId) attempts to call verify-payment with the same valid credentials
    const req = {
      body: {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      },
      user: { userId: otherUserId.toString() }, // Attacker
    };
    const res = createMockRes();

    await verifyRazorpayPayment(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Unauthorized: This payment does not belong to your account/);
  });
});
