import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import User from "../src/features/auth/models/User.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import {
  getWallet,
  getWalletTransactions,
  creditWallet,
  debitWallet,
} from "../src/features/wallet/controllers/walletController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_wallet_pagination";

const createMockRes = () => {
  const headers = {};
  const res = {
    statusCode: 200,
    body: null,
    setHeader(key, value) {
      headers[key.toLowerCase()] = value;
      return this;
    },
    getHeader(key) {
      return headers[key.toLowerCase()];
    },
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

describe("Wallet Transaction Pagination Tests (Step 12)", () => {
  let userFewTx;
  let userManyTx;
  let userEmpty;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    const timestamp = Date.now();

    // 1. User with 5 transactions
    userFewTx = await User.create({
      fullName: "Few Tx User",
      email: `few_tx_${timestamp}@example.com`,
      password: "hashedpassword123",
      isVerified: true,
      referralCode: `REF-FEW-${timestamp}`,
    });

    const fewTxArray = [];
    let runningBalanceFew = 0;
    for (let i = 1; i <= 5; i++) {
      runningBalanceFew += 100;
      fewTxArray.push({
        type: "credit",
        amount: 100,
        reason: "wallet_topup",
        description: `Few Tx Top-up #${i}`,
        balanceAfterTransaction: runningBalanceFew,
        createdAt: new Date(timestamp + i * 1000),
      });
    }

    await Wallet.create({
      userId: userFewTx._id,
      balance: runningBalanceFew,
      transactions: fewTxArray,
    });

    // 2. User with 100 transactions
    userManyTx = await User.create({
      fullName: "Many Tx User",
      email: `many_tx_${timestamp}@example.com`,
      password: "hashedpassword123",
      isVerified: true,
      referralCode: `REF-MANY-${timestamp}`,
    });

    const manyTxArray = [];
    let runningBalanceMany = 0;
    for (let i = 1; i <= 100; i++) {
      runningBalanceMany += 50;
      manyTxArray.push({
        type: "credit",
        amount: 50,
        reason: "wallet_topup",
        description: `Transaction #${i}`,
        balanceAfterTransaction: runningBalanceMany,
        createdAt: new Date(timestamp + i * 1000),
      });
    }

    await Wallet.create({
      userId: userManyTx._id,
      balance: runningBalanceMany,
      transactions: manyTxArray,
    });

    // 3. User with no transactions
    userEmpty = await User.create({
      fullName: "Empty Tx User",
      email: `empty_tx_${timestamp}@example.com`,
      password: "hashedpassword123",
      isVerified: true,
      referralCode: `REF-EMPTY-${timestamp}`,
    });

    await Wallet.create({
      userId: userEmpty._id,
      balance: 0,
      transactions: [],
    });
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test("TEST 1: User has 5 transactions -> Request page=1 limit=10 returns all 5 with pagination metadata", async () => {
    const req = {
      user: { userId: userFewTx._id.toString() },
      query: { page: "1", limit: "10" },
    };
    const res = createMockRes();

    await getWalletTransactions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.transactions.length, 5);
    assert.strictEqual(res.body.pagination.currentPage, 1);
    assert.strictEqual(res.body.pagination.totalPages, 1);
    assert.strictEqual(res.body.pagination.totalTransactions, 5);
    assert.strictEqual(res.body.pagination.hasNextPage, false);
    assert.strictEqual(res.body.pagination.hasPreviousPage, false);

    // Latest transaction (#5) must be first (index 0)
    assert.strictEqual(res.body.transactions[0].description, "Few Tx Top-up #5");
    assert.strictEqual(res.body.transactions[4].description, "Few Tx Top-up #1");
  });

  test("TEST 2: User has 100 transactions -> Request page=1 limit=10 returns only first 10 (latest first)", async () => {
    const req = {
      user: { userId: userManyTx._id.toString() },
      query: { page: "1", limit: "10" },
    };
    const res = createMockRes();

    await getWalletTransactions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.transactions.length, 10, "Should return exactly 10 transactions");
    assert.strictEqual(res.body.pagination.currentPage, 1);
    assert.strictEqual(res.body.pagination.totalPages, 10);
    assert.strictEqual(res.body.pagination.totalTransactions, 100);
    assert.strictEqual(res.body.pagination.hasNextPage, true);
    assert.strictEqual(res.body.pagination.hasPreviousPage, false);

    // Verify ordering: newest transactions first (100 down to 91)
    assert.strictEqual(res.body.transactions[0].description, "Transaction #100");
    assert.strictEqual(res.body.transactions[9].description, "Transaction #91");
  });

  test("TEST 3: Request page=2 limit=10 -> Returns next 10 transactions (90 down to 81)", async () => {
    const req = {
      user: { userId: userManyTx._id.toString() },
      query: { page: "2", limit: "10" },
    };
    const res = createMockRes();

    await getWalletTransactions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.transactions.length, 10);
    assert.strictEqual(res.body.pagination.currentPage, 2);
    assert.strictEqual(res.body.pagination.totalPages, 10);
    assert.strictEqual(res.body.pagination.hasNextPage, true);
    assert.strictEqual(res.body.pagination.hasPreviousPage, true);

    assert.strictEqual(res.body.transactions[0].description, "Transaction #90");
    assert.strictEqual(res.body.transactions[9].description, "Transaction #81");
  });

  test("TEST 4: Last page (page=10 limit=10) -> Correct hasNextPage=false and hasPreviousPage=true", async () => {
    const req = {
      user: { userId: userManyTx._id.toString() },
      query: { page: "10", limit: "10" },
    };
    const res = createMockRes();

    await getWalletTransactions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.transactions.length, 10);
    assert.strictEqual(res.body.pagination.currentPage, 10);
    assert.strictEqual(res.body.pagination.hasNextPage, false);
    assert.strictEqual(res.body.pagination.hasPreviousPage, true);

    // Earliest transactions (10 down to 1)
    assert.strictEqual(res.body.transactions[0].description, "Transaction #10");
    assert.strictEqual(res.body.transactions[9].description, "Transaction #1");
  });

  test("TEST 5: Beyond last page (page=11 limit=10) -> Returns empty transactions array without error", async () => {
    const req = {
      user: { userId: userManyTx._id.toString() },
      query: { page: "11", limit: "10" },
    };
    const res = createMockRes();

    await getWalletTransactions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.transactions.length, 0);
    assert.strictEqual(res.body.pagination.currentPage, 11);
    assert.strictEqual(res.body.pagination.hasNextPage, false);
    assert.strictEqual(res.body.pagination.hasPreviousPage, true);
  });

  test("TEST 6: No transactions -> Empty response without error", async () => {
    const req = {
      user: { userId: userEmpty._id.toString() },
      query: { page: "1", limit: "10" },
    };
    const res = createMockRes();

    await getWalletTransactions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.transactions.length, 0);
    assert.strictEqual(res.body.pagination.totalTransactions, 0);
    assert.strictEqual(res.body.pagination.totalPages, 0);
    assert.strictEqual(res.body.pagination.hasNextPage, false);
    assert.strictEqual(res.body.pagination.hasPreviousPage, false);
  });

  test("TEST 7: Existing wallet operations -> creditWallet and debitWallet still work and appear in paginated history", async () => {
    // 1. Credit wallet
    const creditResult = await creditWallet({
      userId: userEmpty._id,
      amount: 500,
      reason: "wallet_topup",
      description: "Automated test topup",
      razorpayPaymentId: `pay_test_${Date.now()}`,
    });

    assert.ok(creditResult.wallet, "Credit result should return updated wallet");
    assert.strictEqual(creditResult.wallet.balance, 500);

    // 2. Debit wallet
    const debitResult = await debitWallet({
      userId: userEmpty._id,
      amount: 200,
      reason: "wallet_payment",
      description: "Automated test purchase",
      orderNumber: "ORD-PAG-001",
    });

    assert.ok(debitResult.wallet, "Debit result should return updated wallet");
    assert.strictEqual(debitResult.wallet.balance, 300);

    // 3. Query paginated transactions
    const req = {
      user: { userId: userEmpty._id.toString() },
      query: { page: "1", limit: "10" },
    };
    const res = createMockRes();

    await getWalletTransactions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.balance, 300);
    assert.strictEqual(res.body.pagination.totalTransactions, 2);
    assert.strictEqual(res.body.transactions.length, 2);

    // Most recent is debit (#2), then credit (#1)
    assert.strictEqual(res.body.transactions[0].reason, "wallet_payment");
    assert.strictEqual(res.body.transactions[0].amount, 200);
    assert.strictEqual(res.body.transactions[1].reason, "wallet_topup");
    assert.strictEqual(res.body.transactions[1].amount, 500);
  });

  test("TEST 8: Bounded limit -> Limit higher than 100 is capped at 100", async () => {
    const req = {
      user: { userId: userManyTx._id.toString() },
      query: { page: "1", limit: "999" },
    };
    const res = createMockRes();

    await getWalletTransactions(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.pagination.limit, 100, "Limit must be capped at 100 to prevent payload exhaustion");
    assert.strictEqual(res.body.transactions.length, 100);
  });
});
