import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import Wallet from "../src/features/wallet/models/wallet.js";
import User from "../src/features/auth/models/User.js";
import Address from "../src/features/address/models/Address.js";
import Category from "../src/features/category/models/Category.js";
import Product from "../src/features/product/models/Product.js";
import Order from "../src/features/order/models/Order.js";

import {
  creditWallet,
  debitWallet,
  getWallet,
  getWalletTransactions,
} from "../src/features/wallet/controllers/walletController.js";

import { createOrder } from "../src/features/order/controllers/orderController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_wallet_concurrency";

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

describe("Wallet Concurrency & Balance Safety Tests (Step 4)", () => {
  let userCounter = 0;

  const createTestUser = async () => {
    userCounter++;
    const uniqueSuffix = `${Date.now()}_${userCounter}`;
    return await User.create({
      fullName: `Wallet User ${userCounter}`,
      email: `wallet_user_${uniqueSuffix}@example.com`,
      password: "hashedpassword123",
      referralCode: `GETSUKA-WAL-${uniqueSuffix}`,
      isVerified: true,
    });
  };

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================
  // TEST 1: Normal credit
  // =========================================================
  test("TEST 1 — Normal credit: Balance increases correctly", async () => {
    const user = await createTestUser();

    const result = await creditWallet({
      userId: user._id,
      amount: 500,
      reason: "wallet_topup",
      description: "Normal top-up",
      razorpayPaymentId: `pay_test_${Date.now()}`,
    });

    assert.strictEqual(result.alreadyCredited, false);
    assert.strictEqual(result.wallet.balance, 500);
    assert.strictEqual(result.transaction.amount, 500);
    assert.strictEqual(result.transaction.type, "credit");
    assert.strictEqual(result.transaction.balanceAfterTransaction, 500);

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(checkDb.balance, 500);
    assert.strictEqual(checkDb.transactions.length, 1);
  });

  // =========================================================
  // TEST 2: Normal debit
  // =========================================================
  test("TEST 2 — Normal debit: Balance decreases correctly", async () => {
    const user = await createTestUser();
    await Wallet.create({ userId: user._id, balance: 500, transactions: [] });

    const result = await debitWallet({
      userId: user._id,
      amount: 200,
      reason: "wallet_payment",
      description: "Purchase payment",
    });

    assert.strictEqual(result.alreadyCredited, false);
    assert.strictEqual(result.wallet.balance, 300);
    assert.strictEqual(result.transaction.amount, 200);
    assert.strictEqual(result.transaction.type, "debit");
    assert.strictEqual(result.transaction.balanceAfterTransaction, 300);

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(checkDb.balance, 300);
    assert.strictEqual(checkDb.transactions.length, 1);
  });

  // =========================================================
  // TEST 3: Debit greater than balance
  // =========================================================
  test("TEST 3 — Debit greater than balance: Rejected with Insufficient wallet balance", async () => {
    const user = await createTestUser();
    await Wallet.create({ userId: user._id, balance: 300, transactions: [] });

    await assert.rejects(
      async () => {
        await debitWallet({
          userId: user._id,
          amount: 400,
          reason: "wallet_payment",
          description: "Overdraw attempt",
        });
      },
      {
        name: "Error",
        message: "Insufficient wallet balance",
      }
    );

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(checkDb.balance, 300, "Balance must remain unchanged at 300");
    assert.strictEqual(checkDb.transactions.length, 0);
  });

  // =========================================================
  // TEST 4: Concurrent debit
  // =========================================================
  test("TEST 4 — Concurrent debit: No negative balance, only valid requests succeed", async () => {
    const user = await createTestUser();
    await Wallet.create({ userId: user._id, balance: 1000, transactions: [] });

    // Request A: 800, Request B: 500 (Total = 1300 > 1000)
    const results = await Promise.allSettled([
      debitWallet({
        userId: user._id,
        amount: 800,
        reason: "wallet_payment",
        description: "Concurrent debit A (800)",
      }),
      debitWallet({
        userId: user._id,
        amount: 500,
        reason: "wallet_payment",
        description: "Concurrent debit B (500)",
      }),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    assert.strictEqual(successes.length, 1, "Exactly one debit must succeed");
    assert.strictEqual(failures.length, 1, "Exactly one debit must fail");
    assert.match(failures[0].reason.message, /Insufficient wallet balance/);

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.ok(checkDb.balance >= 0, "Balance must never be negative");
    assert.ok(
      checkDb.balance === 200 || checkDb.balance === 500,
      `Balance must be either 200 or 500, got ${checkDb.balance}`
    );
    assert.strictEqual(checkDb.transactions.length, 1);
  });

  // =========================================================
  // TEST 5: Concurrent credit
  // =========================================================
  test("TEST 5 — Concurrent credit: All credits reflected, no lost updates", async () => {
    const user = await createTestUser();
    await Wallet.create({ userId: user._id, balance: 1000, transactions: [] });

    // Two simultaneous credits of 500
    const results = await Promise.allSettled([
      creditWallet({
        userId: user._id,
        amount: 500,
        reason: "manual_credit",
        description: "Credit A",
      }),
      creditWallet({
        userId: user._id,
        amount: 500,
        reason: "manual_credit",
        description: "Credit B",
      }),
    ]);

    assert.strictEqual(results[0].status, "fulfilled");
    assert.strictEqual(results[1].status, "fulfilled");

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(
      checkDb.balance,
      2000,
      "Final balance must be exactly 1000 + 500 + 500 = 2000"
    );
    assert.strictEqual(checkDb.transactions.length, 2);

    const balancesAfter = checkDb.transactions.map((t) => t.balanceAfterTransaction).sort((a, b) => a - b);
    assert.strictEqual(balancesAfter[0], 1500);
    assert.strictEqual(balancesAfter[1], 2000);
  });

  // =========================================================
  // TEST 6: Refund credit
  // =========================================================
  test("TEST 6 — Refund credit: Wallet increases once", async () => {
    const user = await createTestUser();
    const orderId = new mongoose.Types.ObjectId();

    const result = await creditWallet({
      userId: user._id,
      amount: 750,
      reason: "order_cancellation_refund",
      description: "Refund for cancelled order ORD-TEST-6",
      orderId,
      orderNumber: "ORD-TEST-6",
    });

    assert.strictEqual(result.alreadyCredited, false);
    assert.strictEqual(result.wallet.balance, 750);
    assert.strictEqual(result.transaction.amount, 750);
    assert.strictEqual(result.transaction.reason, "order_cancellation_refund");

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(checkDb.balance, 750);
    assert.strictEqual(checkDb.transactions.length, 1);
  });

  // =========================================================
  // TEST 7: Duplicate refund attempt
  // =========================================================
  test("TEST 7 — Duplicate refund attempt: No duplicate wallet transaction", async () => {
    const user = await createTestUser();
    const orderId = new mongoose.Types.ObjectId();

    // First refund call
    const result1 = await creditWallet({
      userId: user._id,
      amount: 450,
      reason: "order_cancellation_refund",
      description: "Refund for order ORD-DUP-7",
      orderId,
      orderNumber: "ORD-DUP-7",
    });

    assert.strictEqual(result1.alreadyCredited, false);
    assert.strictEqual(result1.wallet.balance, 450);

    // Second duplicate refund call
    const result2 = await creditWallet({
      userId: user._id,
      amount: 450,
      reason: "order_cancellation_refund",
      description: "Refund for order ORD-DUP-7",
      orderId,
      orderNumber: "ORD-DUP-7",
    });

    assert.strictEqual(result2.alreadyCredited, true);

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(
      checkDb.balance,
      450,
      "Balance must remain 450 (not credited twice to 900)"
    );
    assert.strictEqual(checkDb.transactions.length, 1, "Must contain exactly 1 transaction");
  });

  // =========================================================
  // TEST 8: Existing checkout wallet payment
  // =========================================================
  test("TEST 8 — Existing checkout wallet payment: Still works cleanly with createOrder", async () => {
    const user = await createTestUser();

    // Create address
    const address = await Address.create({
      userId: user._id,
      fullName: "Goku Son",
      phone: "9876543210",
      addressLine: "Mount Paozu 439",
      city: "Kanto",
      state: "Tokyo",
      pincode: "100001",
    });

    // Create Category & Product
    const category = await Category.create({
      name: "Dragon Ball Merch",
      description: "Test Cat",
      isDeleted: false,
    });

    const product = await Product.create({
      name: "Dragon Ball Gi",
      description: "Orange gi",
      category: category._id,
      anime: "Dragon Ball",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 1000,
      variants: [
        {
          sku: `GI-M-${Date.now()}`,
          size: "M",
          color: "Orange",
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });
    const variantId = product.variants[0]._id;

    // Credit user's wallet with 1500
    await Wallet.create({
      userId: user._id,
      balance: 1500,
      transactions: [],
    });

    // Place order using paymentMethod = wallet
    const req = {
      user: { userId: user._id },
      body: {
        addressId: address._id,
        paymentMethod: "wallet",
        deliveryMethod: "standard",
        items: [{ productId: product._id, variantId, quantity: 1 }],
      },
    };
    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.order.paymentStatus, "paid");

    const checkWallet = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(checkWallet.balance, 500, "1500 - 1000 = 500");
    assert.strictEqual(checkWallet.transactions.length, 1);
    assert.strictEqual(checkWallet.transactions[0].type, "debit");
    assert.strictEqual(checkWallet.transactions[0].reason, "wallet_payment");
  });

  // =========================================================
  // TEST 9: Existing referral reward credit
  // =========================================================
  test("TEST 9 — Existing referral reward credit: Still works seamlessly", async () => {
    const user = await createTestUser();
    await Wallet.create({ userId: user._id, balance: 100, transactions: [] });

    const result = await creditWallet({
      userId: user._id,
      amount: 350,
      reason: "referral_reward",
      description: "Referral reward for referring user",
    });

    assert.strictEqual(result.alreadyCredited, false);
    assert.strictEqual(result.wallet.balance, 450);
    assert.strictEqual(result.transaction.amount, 350);
    assert.strictEqual(result.transaction.reason, "referral_reward");
    assert.strictEqual(result.transaction.balanceAfterTransaction, 450);

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(checkDb.balance, 450);
    assert.strictEqual(checkDb.transactions.length, 1);
  });

  // =========================================================
  // BONUS TEST 10: Concurrent credit and debit
  // =========================================================
  test("TEST 10 — Concurrent credit and debit: Final balance is mathematically exact", async () => {
    const user = await createTestUser();
    await Wallet.create({ userId: user._id, balance: 1000, transactions: [] });

    // Credit 500 and Debit 300 concurrently
    const results = await Promise.allSettled([
      creditWallet({
        userId: user._id,
        amount: 500,
        reason: "manual_credit",
        description: "Concurrent credit 500",
      }),
      debitWallet({
        userId: user._id,
        amount: 300,
        reason: "wallet_payment",
        description: "Concurrent debit 300",
      }),
    ]);

    assert.strictEqual(results[0].status, "fulfilled");
    assert.strictEqual(results[1].status, "fulfilled");

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(
      checkDb.balance,
      1200,
      "Final balance must be exactly 1000 + 500 - 300 = 1200"
    );
    assert.strictEqual(checkDb.transactions.length, 2);
  });

  // =========================================================
  // BONUS TEST 11: Concurrent duplicate top-up with razorpayPaymentId
  // =========================================================
  test("TEST 11 — Concurrent duplicate top-up: Only one credits, second returns alreadyCredited", async () => {
    const user = await createTestUser();
    await Wallet.create({ userId: user._id, balance: 200, transactions: [] });

    const duplicatePaymentId = `pay_concurrent_dup_${Date.now()}`;

    // Two simultaneous calls with the exact same razorpayPaymentId
    const results = await Promise.all([
      creditWallet({
        userId: user._id,
        amount: 500,
        reason: "wallet_topup",
        description: "Topup attempt 1",
        razorpayPaymentId: duplicatePaymentId,
      }),
      creditWallet({
        userId: user._id,
        amount: 500,
        reason: "wallet_topup",
        description: "Topup attempt 2",
        razorpayPaymentId: duplicatePaymentId,
      }),
    ]);

    const alreadyCreditedCount = results.filter((r) => r.alreadyCredited === true).length;
    const newlyCreditedCount = results.filter((r) => r.alreadyCredited === false).length;

    assert.strictEqual(newlyCreditedCount, 1, "Exactly one call should perform credit");
    assert.strictEqual(alreadyCreditedCount, 1, "Exactly one call should return alreadyCredited");

    const checkDb = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(
      checkDb.balance,
      700,
      "Balance should increase by 500 only once: 200 + 500 = 700"
    );
    assert.strictEqual(checkDb.transactions.length, 1);
  });
});
