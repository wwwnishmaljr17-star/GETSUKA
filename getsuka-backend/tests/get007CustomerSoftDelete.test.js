import { test, before, after, beforeEach, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import User from "../src/features/auth/models/User.js";
import Order from "../src/features/order/models/Order.js";
import Payment from "../src/features/payment/models/Payment.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import Referral from "../src/features/referral/models/referral.js";
import Review from "../src/features/review/models/Review.js";
import Address from "../src/features/address/models/Address.js";
import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";

import {
  deleteUser,
  getUsers,
  getUserById,
  blockUser,
  unblockUser,
} from "../src/features/admin/controllers/adminUserController.js";
import {
  loginUser,
  registerUser,
  forgotPassword,
  resetPassword,
} from "../src/features/auth/controllers/authController.js";
import { getAdminDashboardData } from "../src/features/admin/controllers/adminDashboardController.js";
import userAuthMiddleware from "../src/middlewares/userAuthMiddleware.js";
import adminAuthMiddleware from "../src/middlewares/adminAuthMiddleware.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_get007_customer_soft_delete";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_super_secret_key";

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
    set(key, value) {
      headers[key.toLowerCase()] = value;
      return this;
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

describe("GET-007: Customer Account Deletion & Soft-Delete Lifecycle Tests", () => {
  let adminId;
  let adminToken;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    adminId = new mongoose.Types.ObjectId();
    adminToken = jwt.sign(
      {
        id: adminId,
        adminId,
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear collections between test cases
    await User.deleteMany({});
    await Order.deleteMany({});
    await Payment.deleteMany({});
    await Wallet.deleteMany({});
    await Referral.deleteMany({});
    await Review.deleteMany({});
    await Address.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
  });

  /* =========================================================================
     TEST 1: Admin successfully soft-deletes a customer
     ========================================================================= */
  test("TEST 1: Admin successfully soft-deletes a customer without removing User document", async () => {
    const user = await User.create({
      fullName: "Alice Smith",
      email: "alice@example.com",
      password: await bcrypt.hash("Password123!", 10),
      isVerified: true,
      isBlocked: false,
    });

    const req = {
      params: { id: user._id.toString() },
      admin: { _id: adminId },
    };
    const res = createMockRes();

    await deleteUser(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.message, "User deleted successfully");

    // Verify document still exists in DB
    const fetchedUser = await User.findById(user._id);
    assert.ok(fetchedUser, "User document must not be removed from the database");
    assert.strictEqual(fetchedUser.isDeleted, true);
    assert.ok(fetchedUser.deletedAt instanceof Date);
    assert.strictEqual(fetchedUser.deletedBy.toString(), adminId.toString());
  });

  /* =========================================================================
     TEST 2: Unauthorized deletion attempts are rejected
     ========================================================================= */
  test("TEST 2: Unauthorized deletion attempts and invalid user IDs are rejected", async () => {
    // 2a: Missing authorization token on adminAuthMiddleware
    const unauthReq = {
      headers: {},
    };
    const unauthRes = createMockRes();
    let nextCalled = false;
    await adminAuthMiddleware(unauthReq, unauthRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(unauthRes.statusCode, 401);

    // 2b: Non-admin token used on adminAuthMiddleware
    const customerToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId(), role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    const userReq = {
      headers: { authorization: `Bearer ${customerToken}` },
    };
    const userRes = createMockRes();
    nextCalled = false;
    await adminAuthMiddleware(userReq, userRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false);
    assert.strictEqual(userRes.statusCode, 403);

    // 2c: Invalid ObjectId format in deleteUser
    const invalidIdReq = {
      params: { id: "not-a-valid-objectid" },
      admin: { _id: adminId },
    };
    const invalidIdRes = createMockRes();
    await deleteUser(invalidIdReq, invalidIdRes);
    assert.strictEqual(invalidIdRes.statusCode, 400);
    assert.strictEqual(invalidIdRes.body.message, "Invalid user ID");

    // 2d: Non-existent user ID
    const notFoundReq = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      admin: { _id: adminId },
    };
    const notFoundRes = createMockRes();
    await deleteUser(notFoundReq, notFoundRes);
    assert.strictEqual(notFoundRes.statusCode, 404);
  });

  /* =========================================================================
     TEST 3: Deleted customers cannot authenticate or register
     ========================================================================= */
  test("TEST 3: Soft-deleted customers cannot log in, register, or request password reset", async () => {
    const rawPassword = "StrongPassword123!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await User.create({
      fullName: "Bob Deactivated",
      email: "bob.deactivated@example.com",
      password: hashedPassword,
      isVerified: true,
      isBlocked: false,
      isDeleted: true,
      deletedAt: new Date(),
    });

    // 3a: Password login rejected
    const loginReq = {
      body: {
        email: user.email,
        password: rawPassword,
      },
    };
    const loginRes = createMockRes();
    await loginUser(loginReq, loginRes);
    assert.strictEqual(loginRes.statusCode, 403);
    assert.strictEqual(loginRes.body.success, false);
    assert.match(loginRes.body.message, /deleted or deactivated/i);

    // 3b: Registration with same email rejected to protect historical identity
    const regReq = {
      body: {
        fullName: "Bob Impersonator",
        email: user.email,
        password: "NewPassword999!",
      },
    };
    const regRes = createMockRes();
    await registerUser(regReq, regRes);
    assert.strictEqual(regRes.statusCode, 403);
    assert.match(regRes.body.message, /deactivated/i);

    // 3c: Forgot password rejected
    const forgotReq = {
      body: { email: user.email },
    };
    const forgotRes = createMockRes();
    await forgotPassword(forgotReq, forgotRes);
    assert.strictEqual(forgotRes.statusCode, 404);
  });

  /* =========================================================================
     TEST 4: Existing JWT tokens are rejected immediately after soft deletion
     ========================================================================= */
  test("TEST 4: Active JWTs are accepted before deletion and rejected with 403 after deletion", async () => {
    const user = await User.create({
      fullName: "Charlie Token",
      email: "charlie@example.com",
      password: await bcrypt.hash("Password123!", 10),
      isVerified: true,
      isBlocked: false,
      isDeleted: false,
    });

    const userToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: "user",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Verify token works before deletion
    const activeReq = {
      headers: { authorization: `Bearer ${userToken}` },
    };
    const activeRes = createMockRes();
    let nextCalled = false;
    await userAuthMiddleware(activeReq, activeRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, "Active user token must pass middleware");
    assert.strictEqual(activeReq.user.userId, user._id.toString());

    // Admin soft-deletes user
    const delReq = {
      params: { id: user._id.toString() },
      admin: { _id: adminId },
    };
    const delRes = createMockRes();
    await deleteUser(delReq, delRes);
    assert.strictEqual(delRes.statusCode, 200);

    // Try same token again after deletion
    const deletedReq = {
      headers: { authorization: `Bearer ${userToken}` },
    };
    const deletedRes = createMockRes();
    nextCalled = false;
    await userAuthMiddleware(deletedReq, deletedRes, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, false, "Deleted user token must NOT pass middleware");
    assert.strictEqual(deletedRes.statusCode, 403);
    assert.strictEqual(deletedRes.body.success, false);
    assert.match(deletedRes.body.message, /deleted/i);
  });

  /* =========================================================================
     TEST 5: Historical orders remain accessible to administrators
     ========================================================================= */
  test("TEST 5: Historical orders remain fully linked and intact after customer deletion", async () => {
    const user = await User.create({
      fullName: "David Shopper",
      email: "david@example.com",
      password: await bcrypt.hash("Password123!", 10),
      isVerified: true,
      isBlocked: false,
    });

    const category = await Category.create({ name: "Apparel", isDeleted: false });
    const product = await Product.create({
      name: "GETSUKA Hoodie",
      category: category._id,
      description: "Comfortable hoodie",
      anime: "Jujutsu Kaisen",
      price: 1500,
      variants: [{ size: "M", color: "Black", sku: `HOOD-BLK-M-${Date.now()}`, stock: 10, price: 1500 }],
      images: [
        "https://res.cloudinary.com/demo/image/upload/sample1.jpg",
        "https://res.cloudinary.com/demo/image/upload/sample2.jpg",
        "https://res.cloudinary.com/demo/image/upload/sample3.jpg",
      ],
    });

    const address = await Address.create({
      userId: user._id,
      fullName: user.fullName,
      phone: "9876543210",
      addressLine: "123 High Street",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
    });

    const order = await Order.create({
      userId: user._id,
      orderNumber: `ORD-TEST-${Date.now()}`,
      items: [
        {
          productId: product._id,
          variantId: product.variants[0]._id,
          productName: product.name,
          sku: product.variants[0].sku,
          size: "M",
          color: "Black",
          quantity: 1,
          price: 1500,
          totalPrice: 1500,
        },
      ],
      shippingAddress: {
        addressId: address._id,
        fullName: user.fullName,
        phone: "9876543210",
        addressLine: "123 High Street",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      },
      paymentMethod: "cod",
      orderStatus: "delivered",
      subtotal: 1500,
      totalAmount: 1500,
    });

    // Soft delete customer
    const delReq = { params: { id: user._id.toString() }, admin: { _id: adminId } };
    const delRes = createMockRes();
    await deleteUser(delReq, delRes);
    assert.strictEqual(delRes.statusCode, 200);

    // Verify order is intact
    const fetchedOrder = await Order.findById(order._id);
    assert.ok(fetchedOrder, "Order must still exist in DB");
    assert.strictEqual(fetchedOrder.userId.toString(), user._id.toString());
    assert.strictEqual(fetchedOrder.totalAmount, 1500);

    // Verify customer reference still resolves
    const orderUser = await User.findById(fetchedOrder.userId);
    assert.ok(orderUser, "Customer reference must still resolve");
    assert.strictEqual(orderUser.fullName, "David Shopper");
    assert.strictEqual(orderUser.isDeleted, true);
  });

  /* =========================================================================
     TEST 6: Payment and refund audit records remain intact
     ========================================================================= */
  test("TEST 6: Payment and refund records retain ownership and financial auditability", async () => {
    const user = await User.create({
      fullName: "Eva Payer",
      email: "eva@example.com",
      password: await bcrypt.hash("Password123!", 10),
      isVerified: true,
      isBlocked: false,
    });

    const payment = await Payment.create({
      userId: user._id,
      razorpayOrderId: `order_test_${Date.now()}`,
      razorpayPaymentId: `pay_test_${Date.now()}`,
      razorpaySignature: "dummy_signature_hash",
      amount: 2500,
      currency: "INR",
      status: "captured",
      paymentType: "order_checkout",
    });

    // Soft delete user
    const delReq = { params: { id: user._id.toString() }, admin: { _id: adminId } };
    const delRes = createMockRes();
    await deleteUser(delReq, delRes);

    // Verify payment record
    const fetchedPayment = await Payment.findById(payment._id);
    assert.ok(fetchedPayment, "Payment record must not be deleted");
    assert.strictEqual(fetchedPayment.userId.toString(), user._id.toString());
    assert.strictEqual(fetchedPayment.amount, 2500);
    assert.strictEqual(fetchedPayment.status, "captured");
  });

  /* =========================================================================
     TEST 7: Wallet and referral references remain consistent
     ========================================================================= */
  test("TEST 7: Wallet balance history and referral connections remain intact", async () => {
    const referrer = await User.create({
      fullName: "Referrer Frank",
      email: "frank@example.com",
      password: await bcrypt.hash("Password123!", 10),
      referralCode: "FRANK123",
      isVerified: true,
      isBlocked: false,
    });

    const referee = await User.create({
      fullName: "Referee Grace",
      email: "grace@example.com",
      password: await bcrypt.hash("Password123!", 10),
      isVerified: true,
      isBlocked: false,
    });

    const wallet = await Wallet.create({
      userId: referrer._id,
      balance: 700,
      transactions: [
        {
          type: "credit",
          amount: 700,
          reason: "referral_reward",
          description: "Referral bonus",
          balanceAfterTransaction: 700,
        },
      ],
    });

    const referral = await Referral.create({
      referrer: referrer._id,
      referredUser: referee._id,
      referralCode: "FRANK123",
      referralLink: "https://getsuka.com/signup?ref=FRANK123",
      status: "completed",
      rewardAmount: 350,
      rewardCredited: true,
    });

    // Soft delete referee
    await deleteUser({ params: { id: referee._id.toString() }, admin: { _id: adminId } }, createMockRes());

    // Verify wallet
    const fetchedWallet = await Wallet.findOne({ userId: referrer._id });
    assert.ok(fetchedWallet);
    assert.strictEqual(fetchedWallet.balance, 700);
    assert.strictEqual(fetchedWallet.transactions.length, 1);

    // Verify referral integrity
    const fetchedReferral = await Referral.findById(referral._id);
    assert.ok(fetchedReferral);
    assert.strictEqual(fetchedReferral.referrer.toString(), referrer._id.toString());
    assert.strictEqual(fetchedReferral.referredUser.toString(), referee._id.toString());

    // References still resolve in database
    const resolvedReferee = await User.findById(fetchedReferral.referredUser);
    assert.ok(resolvedReferee);
    assert.strictEqual(resolvedReferee.isDeleted, true);
  });

  /* =========================================================================
     TEST 8: Reviews and addresses remain consistent without null dereference
     ========================================================================= */
  test("TEST 8: Reviews and addresses remain linked to preserved User document", async () => {
    const user = await User.create({
      fullName: "Hannah Reviewer",
      email: "hannah@example.com",
      password: await bcrypt.hash("Password123!", 10),
      isVerified: true,
      isBlocked: false,
    });

    const category = await Category.create({ name: "Footwear", isDeleted: false });
    const product = await Product.create({
      name: "GETSUKA Running Shoes",
      category: category._id,
      description: "Running performance shoes",
      anime: "Demon Slayer",
      price: 3200,
      variants: [{ size: "9", color: "White", sku: `SHOE-WHT-9-${Date.now()}`, stock: 5, price: 3200 }],
      images: [
        "https://res.cloudinary.com/demo/image/upload/shoe1.jpg",
        "https://res.cloudinary.com/demo/image/upload/shoe2.jpg",
        "https://res.cloudinary.com/demo/image/upload/shoe3.jpg",
      ],
    });

    const review = await Review.create({
      user: user._id,
      product: product._id,
      rating: 5,
      comment: "Amazing fit and build quality!",
    });

    const address = await Address.create({
      userId: user._id,
      fullName: user.fullName,
      phone: "9988776655",
      addressLine: "456 Marine Drive",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400020",
    });

    // Soft delete user
    await deleteUser({ params: { id: user._id.toString() }, admin: { _id: adminId } }, createMockRes());

    // Populate review user
    const populatedReview = await Review.findById(review._id).populate("user", "fullName isDeleted");
    assert.ok(populatedReview.user, "Populated review user must not be null");
    assert.strictEqual(populatedReview.user.fullName, "Hannah Reviewer");
    assert.strictEqual(populatedReview.user.isDeleted, true);

    // Address remains intact
    const fetchedAddress = await Address.findById(address._id);
    assert.ok(fetchedAddress);
    assert.strictEqual(fetchedAddress.userId.toString(), user._id.toString());
  });

  /* =========================================================================
     TEST 9: Repeated deletion attempts are idempotent
     ========================================================================= */
  test("TEST 9: Repeated deletion attempts are idempotent and do not corrupt data", async () => {
    const user = await User.create({
      fullName: "Ian Idempotent",
      email: "ian@example.com",
      password: await bcrypt.hash("Password123!", 10),
      isVerified: true,
      isBlocked: false,
    });

    const req = { params: { id: user._id.toString() }, admin: { _id: adminId } };

    // 1st deletion
    const res1 = createMockRes();
    await deleteUser(req, res1);
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body.message, "User deleted successfully");

    const userAfterFirst = await User.findById(user._id);
    const firstDeletedAt = userAfterFirst.deletedAt;

    // 2nd deletion
    const res2 = createMockRes();
    await deleteUser(req, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body.message, "User is already deleted");

    // 3rd deletion
    const res3 = createMockRes();
    await deleteUser(req, res3);
    assert.strictEqual(res3.statusCode, 200);
    assert.strictEqual(res3.body.message, "User is already deleted");

    const userAfterThird = await User.findById(user._id);
    assert.strictEqual(userAfterThird.isDeleted, true);
    assert.strictEqual(userAfterThird.deletedAt.getTime(), firstDeletedAt.getTime(), "deletedAt timestamp must remain immutable");
  });

  /* =========================================================================
     TEST 10: Customer listings and searches exclude soft-deleted accounts
     ========================================================================= */
  test("TEST 10: Customer listings and searches exclude soft-deleted accounts", async () => {
    await User.create([
      { fullName: "Active User One", email: "active1@example.com", password: "Password123!", isVerified: true, isDeleted: false },
      { fullName: "Active User Two", email: "active2@example.com", password: "Password123!", isVerified: true, isDeleted: false },
      { fullName: "Soft Deleted Three", email: "deleted3@example.com", password: "Password123!", isVerified: true, isDeleted: true, deletedAt: new Date() },
    ]);

    // List all users
    const listReq = { query: { page: 1, limit: 10 } };
    const listRes = createMockRes();
    await getUsers(listReq, listRes);

    assert.strictEqual(listRes.statusCode, 200);
    assert.strictEqual(listRes.body.pagination.totalUsers, 2, "Only active users should be counted");
    assert.strictEqual(listRes.body.users.length, 2);
    assert.ok(listRes.body.users.every((u) => u.email !== "deleted3@example.com"));

    // Search query matching deleted user
    const searchReq = { query: { search: "deleted3", page: 1, limit: 10 } };
    const searchRes = createMockRes();
    await getUsers(searchReq, searchRes);
    assert.strictEqual(searchRes.statusCode, 200);
    assert.strictEqual(searchRes.body.pagination.totalUsers, 0);
    assert.strictEqual(searchRes.body.users.length, 0);
  });

  /* =========================================================================
     TEST 11: Admin dashboard analytics count only active customers
     ========================================================================= */
  test("TEST 11: Admin dashboard analytics count only active customers", async () => {
    await User.create([
      { fullName: "Dashboard User 1", email: "dash1@example.com", password: "Password123!", isVerified: true, isDeleted: false },
      { fullName: "Dashboard User 2", email: "dash2@example.com", password: "Password123!", isVerified: true, isDeleted: false },
      { fullName: "Dashboard User 3", email: "dash3@example.com", password: "Password123!", isVerified: true, isDeleted: true, deletedAt: new Date() },
    ]);

    const req = { query: {} };
    const res = createMockRes();
    await getAdminDashboardData(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.summary.totalUsers, 2, "totalUsers in dashboard summary must exclude deleted accounts");
  });

  /* =========================================================================
     TEST 12: Existing customer management functionality continues working
     ========================================================================= */
  test("TEST 12: Blocking, unblocking, and detail retrieval continue working safely", async () => {
    const user = await User.create({
      fullName: "Management Test",
      email: "manage@example.com",
      password: "Password123!",
      isVerified: true,
      isBlocked: false,
      isDeleted: false,
    });

    // Block user
    const blockRes = createMockRes();
    await blockUser({ params: { id: user._id.toString() } }, blockRes);
    assert.strictEqual(blockRes.statusCode, 200);
    assert.strictEqual(blockRes.body.user.isBlocked, true);

    // Unblock user
    const unblockRes = createMockRes();
    await unblockUser({ params: { id: user._id.toString() } }, unblockRes);
    assert.strictEqual(unblockRes.statusCode, 200);
    assert.strictEqual(unblockRes.body.user.isBlocked, false);

    // Soft delete user
    await deleteUser({ params: { id: user._id.toString() }, admin: { _id: adminId } }, createMockRes());

    // Attempt to block deleted user
    const blockDeletedRes = createMockRes();
    await blockUser({ params: { id: user._id.toString() } }, blockDeletedRes);
    assert.strictEqual(blockDeletedRes.statusCode, 400);
    assert.strictEqual(blockDeletedRes.body.message, "Cannot block a deleted customer account");

    // getUserById still allows admin audit review
    const detailRes = createMockRes();
    await getUserById({ params: { id: user._id.toString() } }, detailRes);
    assert.strictEqual(detailRes.statusCode, 200);
    assert.strictEqual(detailRes.body.user.isDeleted, true);
    assert.strictEqual(detailRes.body.user.fullName, "Management Test");
  });
});
