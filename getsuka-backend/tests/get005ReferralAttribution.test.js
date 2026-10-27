process.env.NODE_ENV = "test";
import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

import User from "../src/features/auth/models/User.js";
import Referral from "../src/features/referral/models/referral.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import Order from "../src/features/order/models/Order.js";
import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";

import { registerUser, googleLogin } from "../src/features/auth/controllers/authController.js";
import {
  applyReferral,
  completeReferral,
  processReferralCompletion,
  attributeReferral,
} from "../src/features/referral/controllers/referralController.js";
import { updateAdminOrderStatus } from "../src/features/order/controllers/orderController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_get005_referral_attribution";

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

describe("GET-005: Referral Attribution & Reward Flow Security Test Suite", () => {
  let categoryId;
  let productId;
  let variantId;
  let counter = 0;

  const createUniqueUser = async (overrides = {}) => {
    counter++;
    const suffix = `${Date.now()}_${counter}`;
    return await User.create({
      fullName: `User ${counter}`,
      email: `refuser_${suffix}@example.com`,
      password: await bcrypt.hash("ValidPass123!", 10),
      referralCode: `GETSUKA-REF-${suffix}`.toUpperCase(),
      authProvider: "local",
      isVerified: true,
      ...overrides,
    });
  };

  const createTestOrder = async (userId, status = "delivered") => {
    return await Order.create({
      userId,
      orderNumber: `ORD-REF-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      items: [
        {
          productId,
          variantId,
          productName: "Demon Slayer Kimono",
          sku: "DS-KIM-001",
          size: "L",
          color: "Green",
          quantity: 1,
          price: 1999,
          totalPrice: 1999,
        },
      ],
      shippingAddress: {
        addressId: new mongoose.Types.ObjectId(),
        fullName: "Anime Customer",
        phone: "9876543210",
        addressLine: "456 Kimetsu Way",
        city: "Tokyo",
        state: "Kanto",
        pincode: "110001",
      },
      deliveryMethod: "standard",
      subtotal: 1999,
      totalAmount: 1999,
      paymentMethod: "cod",
      paymentStatus: status === "delivered" ? "paid" : "pending",
      status,
      deliveredAt: status === "delivered" ? new Date() : null,
    });
  };

  before(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    const category = await Category.create({
      name: "Anime Apparel",
      description: "Apparel Category",
    });
    categoryId = category._id;

    const product = await Product.create({
      name: "Demon Slayer Kimono",
      description: "Authentic pattern kimono",
      category: categoryId,
      anime: "Demon Slayer",
      images: ["k1.jpg", "k2.jpg", "k3.jpg"],
      price: 1999,
      variants: [
        {
          sku: "DS-KIM-001",
          size: "L",
          color: "Green",
          stock: 100,
        },
      ],
      isListed: true,
      isDeleted: false,
    });
    productId = product._id;
    variantId = product.variants[0]._id;
  });

  after(async () => {
    try {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    } catch {}
  });

  // =========================================================================
  // TEST 1: Registration with a valid referral code attributes pending referral
  // =========================================================================
  test("TEST 1: Registration with a valid referral code connects attribution as pending", async () => {
    const referrer = await createUniqueUser();

    counter++;
    const newUserEmail = `newreferred_${counter}@example.com`;
    const req = {
      body: {
        fullName: "Referred New User",
        email: newUserEmail,
        password: "StrongPassword123!",
        referralCode: referrer.referralCode,
      },
    };
    const res = createMockRes();

    await registerUser(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body?.success, true);

    const newUser = await User.findOne({ email: newUserEmail });
    assert.ok(newUser, "New user must be created");

    const attribution = await Referral.findOne({ referredUser: newUser._id });
    assert.ok(attribution, "Referral attribution record must be created");
    assert.strictEqual(attribution.referrer.toString(), referrer._id.toString());
    assert.strictEqual(attribution.referralCode, referrer.referralCode);
    assert.strictEqual(attribution.status, "pending");
    assert.strictEqual(attribution.rewardAmount, 350);
    assert.strictEqual(attribution.rewardCredited, false);
  });

  // =========================================================================
  // TEST 2: Registration rejects invalid / non-existent referral code
  // =========================================================================
  test("TEST 2: Registration rejects non-existent referral code with 400 Bad Request", async () => {
    counter++;
    const req = {
      body: {
        fullName: "Fake Ref User",
        email: `fake.ref.${counter}@example.com`,
        password: "StrongPassword123!",
        referralCode: "NONEXISTENT-CODE-99999",
      },
    };
    const res = createMockRes();

    await registerUser(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /invalid referral code/i);

    const checkUser = await User.findOne({ email: req.body.email });
    assert.strictEqual(checkUser, null, "User must NOT be created when referral code is invalid");
  });

  // =========================================================================
  // TEST 3: Self-referral is strictly blocked
  // =========================================================================
  test("TEST 3: Registration blocks self-referral attempts", async () => {
    const existingUser = await createUniqueUser();

    const req = {
      body: {
        fullName: "Self Referrer",
        email: existingUser.email, // using same email as referrer
        password: "StrongPassword123!",
        referralCode: existingUser.referralCode,
      },
    };
    const res = createMockRes();

    await registerUser(req, res);

    // Either 400 (self referral) or 409 (user already exists)
    assert.ok(res.statusCode === 400 || res.statusCode === 409);
    assert.strictEqual(res.body?.success, false);
  });

  // =========================================================================
  // TEST 4: Google signup connects referral attribution
  // =========================================================================
  test("TEST 4: Google registration handles referral attribution consistently", async () => {
    const referrer = await createUniqueUser();
    counter++;
    const googleEmail = `google.ref.${counter}@example.com`;
    const googleId = `gid_ref_${counter}`;

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: googleId,
        email: googleEmail,
        name: "Google Referred Fan",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    try {
      const req = {
        body: {
          credential: "valid_google_token",
          referralCode: referrer.referralCode,
        },
      };
      const res = createMockRes();

      await googleLogin(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);

      const createdUser = await User.findOne({ email: googleEmail });
      assert.ok(createdUser);

      const refDoc = await Referral.findOne({ referredUser: createdUser._id });
      assert.ok(refDoc, "Referral record must be created for Google registration with referralCode");
      assert.strictEqual(refDoc.referrer.toString(), referrer._id.toString());
      assert.strictEqual(refDoc.status, "pending");
      assert.strictEqual(refDoc.rewardCredited, false);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 5: Existing attribution cannot be overwritten
  // =========================================================================
  test("TEST 5: Existing referral attribution cannot be overwritten by a second referral code", async () => {
    const referrerA = await createUniqueUser();
    const referrerB = await createUniqueUser();
    const referredUser = await createUniqueUser();

    // Initial attribution to referrer A
    const firstResult = await attributeReferral({
      referralCode: referrerA.referralCode,
      referredUserId: referredUser._id,
      referredEmail: referredUser.email,
    });
    assert.strictEqual(firstResult.success, true);

    // Attempt second attribution to referrer B
    const secondResult = await attributeReferral({
      referralCode: referrerB.referralCode,
      referredUserId: referredUser._id,
      referredEmail: referredUser.email,
    });
    assert.strictEqual(secondResult.success, false);
    assert.strictEqual(secondResult.statusCode, 400);
    assert.match(secondResult.message, /already used a referral/i);

    // Attribution remains with referrer A
    const currentRef = await Referral.findOne({ referredUser: referredUser._id });
    assert.strictEqual(currentRef.referrer.toString(), referrerA._id.toString());
  });

  // =========================================================================
  // TEST 6: Referrer reaching maximum cap (5) cannot accept further referrals
  // =========================================================================
  test("TEST 6: Referrer who reached maximum completed referrals (5) cannot accept further referrals", async () => {
    const popularReferrer = await createUniqueUser();

    // Create 5 completed referrals for this referrer
    for (let i = 0; i < 5; i++) {
      const dummyReferred = await createUniqueUser();
      await Referral.create({
        referrer: popularReferrer._id,
        referredUser: dummyReferred._id,
        referralCode: popularReferrer.referralCode,
        referralLink: "http://localhost:5173/register?ref=" + popularReferrer.referralCode,
        status: "completed",
        rewardAmount: 350,
        rewardCredited: true,
      });
    }

    const newProspect = await createUniqueUser();
    const result = await attributeReferral({
      referralCode: popularReferrer.referralCode,
      referredUserId: newProspect._id,
      referredEmail: newProspect.email,
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 400);
    assert.match(result.message, /maximum limit of 5/i);
  });

  // =========================================================================
  // TEST 7: Order status update to "delivered" automatically triggers referral completion & wallet credit
  // =========================================================================
  test("TEST 7: Marking an order as delivered automatically completes referral and credits ₹350 to referrer wallet", async () => {
    const referrer = await createUniqueUser();
    const referredCustomer = await createUniqueUser();

    // Setup referrer wallet
    await Wallet.create({
      userId: referrer._id,
      balance: 100,
      transactions: [],
    });

    // Setup pending referral
    await Referral.create({
      referrer: referrer._id,
      referredUser: referredCustomer._id,
      referralCode: referrer.referralCode,
      referralLink: `http://localhost:5173/register?ref=${referrer.referralCode}`,
      status: "pending",
      rewardAmount: 350,
      rewardCredited: false,
    });

    // Referred customer places an order that reaches out_for_delivery
    const order = await createTestOrder(referredCustomer._id, "out_for_delivery");

    // Admin updates order status to "delivered"
    const req = {
      params: { orderId: order._id.toString() },
      body: { status: "delivered" },
      user: { role: "admin" },
    };
    const res = createMockRes();

    await updateAdminOrderStatus(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.order?.status, "delivered");

    // Check referral is now completed and reward credited
    const completedRef = await Referral.findOne({ referredUser: referredCustomer._id });
    assert.strictEqual(completedRef.status, "completed");
    assert.strictEqual(completedRef.rewardCredited, true);
    assert.ok(completedRef.rewardCreditedAt);

    // Check referrer's wallet: original ₹100 + ₹350 reward = ₹450
    const referrerWallet = await Wallet.findOne({ userId: referrer._id });
    assert.strictEqual(referrerWallet.balance, 450);
    const rewardTx = referrerWallet.transactions.find((tx) => tx.reason === "referral_reward");
    assert.ok(rewardTx, "Transaction with reason referral_reward must be recorded");
    assert.strictEqual(rewardTx.amount, 350);
    assert.strictEqual(rewardTx.type, "credit");
  });

  // =========================================================================
  // TEST 8: Non-delivered order does NOT trigger referral reward
  // =========================================================================
  test("TEST 8: Incomplete orders (processing, shipped) do not satisfy referral eligibility", async () => {
    const referrer = await createUniqueUser();
    const referredCustomer = await createUniqueUser();

    await Wallet.create({
      userId: referrer._id,
      balance: 0,
      transactions: [],
    });

    await Referral.create({
      referrer: referrer._id,
      referredUser: referredCustomer._id,
      referralCode: referrer.referralCode,
      referralLink: `http://localhost:5173/register?ref=${referrer.referralCode}`,
      status: "pending",
      rewardAmount: 350,
      rewardCredited: false,
    });

    // Create shipped order (not delivered)
    await createTestOrder(referredCustomer._id, "shipped");

    const result = await processReferralCompletion({ referredUserId: referredCustomer._id });
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.statusCode, 400);
    assert.match(result.message, /qualifying delivered order/i);

    // Referral remains pending and wallet uncredited
    const refDoc = await Referral.findOne({ referredUser: referredCustomer._id });
    assert.strictEqual(refDoc.status, "pending");
    assert.strictEqual(refDoc.rewardCredited, false);

    const wallet = await Wallet.findOne({ userId: referrer._id });
    assert.strictEqual(wallet.balance, 0);
  });

  // =========================================================================
  // TEST 9: Duplicate reward requests are rejected (idempotency)
  // =========================================================================
  test("TEST 9: Subsequent orders by the same user do not duplicate referral rewards", async () => {
    const referrer = await createUniqueUser();
    const referredCustomer = await createUniqueUser();

    await Wallet.create({
      userId: referrer._id,
      balance: 0,
      transactions: [],
    });

    const ref = await Referral.create({
      referrer: referrer._id,
      referredUser: referredCustomer._id,
      referralCode: referrer.referralCode,
      referralLink: `http://localhost:5173/register?ref=${referrer.referralCode}`,
      status: "pending",
      rewardAmount: 350,
      rewardCredited: false,
    });

    // First delivered order
    await createTestOrder(referredCustomer._id, "delivered");
    const firstResult = await processReferralCompletion({ referralId: ref._id });
    assert.strictEqual(firstResult.success, true);

    // Second completion attempt
    const secondResult = await processReferralCompletion({ referralId: ref._id });
    assert.strictEqual(secondResult.success, false);
    assert.strictEqual(secondResult.statusCode, 400);
    assert.match(secondResult.message, /already been completed/i);

    // Referrer only credited once
    const wallet = await Wallet.findOne({ userId: referrer._id });
    assert.strictEqual(wallet.balance, 350);
    assert.strictEqual(wallet.transactions.length, 1);
  });

  // =========================================================================
  // TEST 10: Concurrent reward processing safety
  // =========================================================================
  test("TEST 10: Concurrent processReferralCompletion calls credit wallet at most once", async () => {
    const referrer = await createUniqueUser();
    const referredCustomer = await createUniqueUser();

    await Wallet.create({
      userId: referrer._id,
      balance: 0,
      transactions: [],
    });

    const ref = await Referral.create({
      referrer: referrer._id,
      referredUser: referredCustomer._id,
      referralCode: referrer.referralCode,
      referralLink: `http://localhost:5173/register?ref=${referrer.referralCode}`,
      status: "pending",
      rewardAmount: 350,
      rewardCredited: false,
    });

    await createTestOrder(referredCustomer._id, "delivered");

    // Execute 5 concurrent completion attempts
    const results = await Promise.all([
      processReferralCompletion({ referralId: ref._id }),
      processReferralCompletion({ referralId: ref._id }),
      processReferralCompletion({ referralId: ref._id }),
      processReferralCompletion({ referralId: ref._id }),
      processReferralCompletion({ referralId: ref._id }),
    ]);

    const successfulCredits = results.filter((r) => r.success);
    assert.strictEqual(successfulCredits.length, 1, "Exactly one concurrent call must succeed");

    const wallet = await Wallet.findOne({ userId: referrer._id });
    assert.strictEqual(wallet.balance, 350, "Wallet balance must be exactly ₹350");
    assert.strictEqual(wallet.transactions.length, 1);
  });

  // =========================================================================
  // TEST 11: Unauthorized user cannot invoke completeReferral directly
  // =========================================================================
  test("TEST 11: Regular users cannot manually invoke completeReferral HTTP endpoint (403 Forbidden)", async () => {
    const regularUser = await createUniqueUser({ role: "user" });

    const req = {
      user: { role: "user", userId: regularUser._id.toString() },
      body: { referralId: new mongoose.Types.ObjectId() },
    };
    const res = createMockRes();

    await completeReferral(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /cannot be triggered directly by users/i);
  });
});
