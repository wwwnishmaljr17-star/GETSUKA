import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import User from "../src/features/auth/models/User.js";
import Referral from "../src/features/referral/models/referral.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import Order from "../src/features/order/models/Order.js";
import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";

import {
  applyReferral,
  completeReferral,
  processReferralCompletion,
} from "../src/features/referral/controllers/referralController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_referral_security";

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

describe("Referral Reward Flow Security Tests (Step 3)", () => {
  let categoryId;
  let productId;
  let variantId;
  let userCounter = 0;

  const createTestUser = async (overrides = {}) => {
    userCounter++;
    const uniqueSuffix = `${Date.now()}_${userCounter}`;
    return await User.create({
      fullName: `Test User ${userCounter}`,
      email: `test_${uniqueSuffix}@example.com`,
      password: "hashedpassword123",
      referralCode: `GETSUKA-REF-${uniqueSuffix}`,
      isVerified: true,
      ...overrides,
    });
  };

  const createDeliveredOrder = async (userId) => {
    return await Order.create({
      userId,
      orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      items: [
        {
          productId,
          variantId,
          productName: "Attack on Titan Hoodie",
          sku: "AOT-HD-BLK-M",
          size: "M",
          color: "Black",
          quantity: 1,
          price: 1499,
          totalPrice: 1499,
        },
      ],
      shippingAddress: {
        addressId: new mongoose.Types.ObjectId(),
        fullName: "Test User",
        phone: "9876543210",
        addressLine: "123 Anime Lane",
        city: "Tokyo",
        state: "Kanto",
        pincode: "110001",
      },
      deliveryMethod: "standard",
      subtotal: 1499,
      totalAmount: 1499,
      paymentMethod: "cod",
      paymentStatus: "paid",
      status: "delivered",
      deliveredAt: new Date(),
    });
  };

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    const category = await Category.create({
      name: "Anime Merch",
      description: "Test Category",
    });
    categoryId = category._id;

    const product = await Product.create({
      name: "Attack on Titan Hoodie",
      description: "Premium fleece hoodie",
      category: categoryId,
      anime: "Attack on Titan",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 1499,
      variants: [
        {
          sku: "AOT-HD-BLK-M",
          size: "M",
          color: "Black",
          stock: 50,
        },
      ],
      isListed: true,
      isDeleted: false,
    });
    productId = product._id;
    variantId = product.variants[0]._id;
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================
  // TEST 1: Normal referral completion
  // =========================================================
  test("TEST 1: Normal referral completion credits ₹350 once to referrer when eligible requirement is met", async () => {
    const referrer = await createTestUser();

    await Wallet.create({
      userId: referrer._id,
      balance: 0,
      transactions: [],
    });

    const referredUser = await createTestUser();

    // Apply referral
    const applyReq = {
      user: { userId: referredUser._id },
      body: {
        referralCode: referrer.referralCode,
        referredUserId: referredUser._id,
      },
    };
    const applyRes = createMockRes();
    await applyReferral(applyReq, applyRes);

    assert.strictEqual(applyRes.statusCode, 201);
    assert.strictEqual(applyRes.body.success, true);

    const pendingRef = await Referral.findOne({ referredUser: referredUser._id });
    assert.ok(pendingRef);
    assert.strictEqual(pendingRef.status, "pending");
    assert.strictEqual(pendingRef.rewardCredited, false);

    // Fulfill requirement: placing an order that reaches 'delivered'
    await createDeliveredOrder(referredUser._id);

    // Complete referral as admin
    const completeReq = {
      user: { role: "admin" },
      body: { referredUserId: referredUser._id },
    };
    const completeRes = createMockRes();
    await completeReferral(completeReq, completeRes);

    assert.strictEqual(completeRes.statusCode, 200);
    assert.strictEqual(completeRes.body.success, true);
    assert.strictEqual(completeRes.body.data.rewardAmount, 350);

    // Verify database updates
    const completedRef = await Referral.findOne({ referredUser: referredUser._id });
    assert.strictEqual(completedRef.status, "completed");
    assert.strictEqual(completedRef.rewardCredited, true);
    assert.strictEqual(completedRef.rewardAmount, 350);
    assert.ok(completedRef.completedAt);
    assert.ok(completedRef.rewardCreditedAt);

    // Verify referrer wallet
    const referrerWallet = await Wallet.findOne({ userId: referrer._id });
    assert.strictEqual(referrerWallet.balance, 350);
    assert.strictEqual(referrerWallet.transactions.length, 1);
    assert.strictEqual(referrerWallet.transactions[0].amount, 350);
    assert.strictEqual(referrerWallet.transactions[0].type, "credit");
  });

  // =========================================================
  // TEST 2: User tries calling completion endpoint manually
  // =========================================================
  test("TEST 2: Regular user trying to call completeReferral endpoint directly is rejected with 403 Forbidden", async () => {
    const normalUser = await createTestUser({ role: "user" });
    const targetUser = await createTestUser();

    const req = {
      user: { userId: normalUser._id, role: "user" },
      body: { referredUserId: targetUser._id },
    };
    const res = createMockRes();

    await completeReferral(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /forbidden|cannot be triggered directly/i);
  });

  // =========================================================
  // TEST 3: User tries passing another user's ID
  // =========================================================
  test("TEST 3: User cannot pass another user's ID to manipulate referral flow or steal rewards", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    const referrer = await createTestUser();

    // Case 3A: User A attempts to call applyReferral pretending to be User B
    const spoofApplyReq = {
      user: { userId: userA._id },
      body: {
        referralCode: referrer.referralCode,
        referredUserId: userB._id, // Attempting to apply for User B
      },
    };
    const spoofApplyRes = createMockRes();
    await applyReferral(spoofApplyReq, spoofApplyRes);

    assert.strictEqual(spoofApplyRes.statusCode, 403);
    assert.strictEqual(spoofApplyRes.body.success, false);
    assert.match(spoofApplyRes.body.message, /cannot apply a referral code on behalf of another user/i);

    // Case 3B: Non-admin User A attempts to call completeReferral specifying User B's ID
    const spoofCompleteReq = {
      user: { userId: userA._id, role: "user" },
      body: { referredUserId: userB._id },
    };
    const spoofCompleteRes = createMockRes();
    await completeReferral(spoofCompleteReq, spoofCompleteRes);

    assert.strictEqual(spoofCompleteRes.statusCode, 403);
    assert.strictEqual(spoofCompleteRes.body.success, false);
  });

  // =========================================================
  // TEST 4: Same referral completion called twice
  // =========================================================
  test("TEST 4: Duplicate referral completion attempts are rejected and do not create duplicate rewards", async () => {
    const referrer = await createTestUser();

    await Wallet.create({
      userId: referrer._id,
      balance: 0,
      transactions: [],
    });

    const friend = await createTestUser();

    // Create pending referral
    await Referral.create({
      referrer: referrer._id,
      referredUser: friend._id,
      referralCode: referrer.referralCode,
      referralLink: `http://localhost:5173/register?ref=${referrer.referralCode}`,
      status: "pending",
      rewardAmount: 350,
      rewardCredited: false,
    });

    // Create qualifying delivered order
    await createDeliveredOrder(friend._id);

    // First completion attempt (should succeed)
    const firstResult = await processReferralCompletion({
      referredUserId: friend._id,
    });
    assert.strictEqual(firstResult.success, true);
    assert.strictEqual(firstResult.statusCode, 200);

    const walletAfterFirst = await Wallet.findOne({ userId: referrer._id });
    assert.strictEqual(walletAfterFirst.balance, 350);
    assert.strictEqual(walletAfterFirst.transactions.length, 1);

    // Second completion attempt on the same referral (should be rejected)
    const secondResult = await processReferralCompletion({
      referredUserId: friend._id,
    });
    assert.strictEqual(secondResult.success, false);
    assert.strictEqual(secondResult.statusCode, 400);
    assert.match(secondResult.message, /already been completed|already issued/i);

    // Verify wallet was NOT credited a second time
    const walletAfterSecond = await Wallet.findOne({ userId: referrer._id });
    assert.strictEqual(walletAfterSecond.balance, 350);
    assert.strictEqual(walletAfterSecond.transactions.length, 1);
  });

  // =========================================================
  // TEST 5: Self-referral attempt
  // =========================================================
  test("TEST 5: Self-referral attempts are rejected during apply and completion", async () => {
    const user = await createTestUser();

    // Case 5A: User tries to apply their own referral code
    const applyReq = {
      user: { userId: user._id },
      body: {
        referralCode: user.referralCode,
        referredUserId: user._id,
      },
    };
    const applyRes = createMockRes();
    await applyReferral(applyReq, applyRes);

    assert.strictEqual(applyRes.statusCode, 400);
    assert.strictEqual(applyRes.body.success, false);
    assert.match(applyRes.body.message, /cannot use your own referral code/i);

    // Case 5B: Even if a self-referral record somehow existed in DB, completion rejects it
    const selfRefDoc = await Referral.create({
      referrer: user._id,
      referredUser: user._id,
      referralCode: user.referralCode,
      referralLink: `http://localhost:5173/register?ref=${user.referralCode}`,
      status: "pending",
      rewardAmount: 350,
      rewardCredited: false,
    });

    await createDeliveredOrder(user._id);

    const completeResult = await processReferralCompletion({
      referralId: selfRefDoc._id,
    });

    assert.strictEqual(completeResult.success, false);
    assert.strictEqual(completeResult.statusCode, 400);
    assert.match(completeResult.message, /self-referral is not permitted/i);
  });

  // =========================================================
  // TEST 6: Referral requirement incomplete
  // =========================================================
  test("TEST 6: Referral completion is rejected and no reward issued when referral requirement is incomplete", async () => {
    const referrer = await createTestUser();

    await Wallet.create({
      userId: referrer._id,
      balance: 0,
      transactions: [],
    });

    const friend = await createTestUser();

    // Create pending referral
    await Referral.create({
      referrer: referrer._id,
      referredUser: friend._id,
      referralCode: referrer.referralCode,
      referralLink: `http://localhost:5173/register?ref=${referrer.referralCode}`,
      status: "pending",
      rewardAmount: 350,
      rewardCredited: false,
    });

    // Friend has NOT completed any delivered order (0 orders)
    const resultNoOrder = await processReferralCompletion({
      referredUserId: friend._id,
    });

    assert.strictEqual(resultNoOrder.success, false);
    assert.strictEqual(resultNoOrder.statusCode, 400);
    assert.match(resultNoOrder.message, /referral requirement incomplete/i);

    // Verify referral remains pending and wallet has 0 balance
    const refDocAfterNoOrder = await Referral.findOne({ referredUser: friend._id });
    assert.strictEqual(refDocAfterNoOrder.status, "pending");
    assert.strictEqual(refDocAfterNoOrder.rewardCredited, false);

    const walletAfterNoOrder = await Wallet.findOne({ userId: referrer._id });
    assert.strictEqual(walletAfterNoOrder.balance, 0);

    // Now test with an order that is only "placed" (not "delivered")
    await Order.create({
      userId: friend._id,
      orderNumber: `ORD-PLACED-${Date.now()}`,
      items: [
        {
          productId,
          variantId,
          productName: "Attack on Titan Hoodie",
          sku: "AOT-HD-BLK-M",
          size: "M",
          color: "Black",
          quantity: 1,
          price: 1499,
          totalPrice: 1499,
        },
      ],
      shippingAddress: {
        addressId: new mongoose.Types.ObjectId(),
        fullName: "Test User",
        phone: "9876543210",
        addressLine: "123 Anime Lane",
        city: "Tokyo",
        state: "Kanto",
        pincode: "110001",
      },
      deliveryMethod: "standard",
      subtotal: 1499,
      totalAmount: 1499,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "placed", // Incomplete status
    });

    const resultPlacedOrder = await processReferralCompletion({
      referredUserId: friend._id,
    });

    assert.strictEqual(resultPlacedOrder.success, false);
    assert.strictEqual(resultPlacedOrder.statusCode, 400);
    assert.match(resultPlacedOrder.message, /referral requirement incomplete/i);

    // Verify wallet still has 0 balance
    const walletAfterPlaced = await Wallet.findOne({ userId: referrer._id });
    assert.strictEqual(walletAfterPlaced.balance, 0);
  });
});
