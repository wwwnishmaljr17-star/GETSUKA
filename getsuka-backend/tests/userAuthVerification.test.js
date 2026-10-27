import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import User from "../src/features/auth/models/User.js";
import Category from "../src/features/category/models/Category.js";
import Product from "../src/features/product/models/Product.js";
import Address from "../src/features/address/models/Address.js";
import Order from "../src/features/order/models/Order.js";

import userAuthMiddleware from "../src/middlewares/userAuthMiddleware.js";
import {
  createOrder,
  getUserOrders,
} from "../src/features/order/controllers/orderController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_auth_verification";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_super_secret_key";

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

describe("User Authentication Middleware isVerified & Account Status Tests (Step 6)", () => {
  let userCounter = 0;
  let categoryId;
  let productId;
  let variantId;

  const createTestUser = async (overrides = {}) => {
    userCounter++;
    const uniqueSuffix = `${Date.now()}_${userCounter}`;
    return await User.create({
      fullName: `Auth User ${userCounter}`,
      email: `auth_user_${uniqueSuffix}@example.com`,
      password: "hashedpassword123",
      referralCode: `GETSUKA-AUTH-${uniqueSuffix}`,
      isVerified: true,
      isBlocked: false,
      ...overrides,
    });
  };

  const createToken = (userId, email = "test@example.com", role = "user", expiresIn = "7d") => {
    return jwt.sign(
      {
        userId,
        email,
        role,
      },
      JWT_SECRET,
      {
        expiresIn,
      }
    );
  };

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    const category = await Category.create({
      name: "Auth Test Category",
      isDeleted: false,
    });
    categoryId = category._id;

    const product = await Product.create({
      name: "Auth Test Kimono",
      description: "Test Kimono",
      category: categoryId,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 800,
      variants: [
        {
          color: "Green",
          size: "M",
          sku: `AUTH-TEST-M-${Date.now()}`,
          stock: 20,
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

  // =========================================================================
  // TEST 1: Verified user login -> Protected APIs work
  // =========================================================================
  test("TEST 1: Verified user with valid token passes userAuthMiddleware and accesses protected APIs", async () => {
    const user = await createTestUser({ isVerified: true, isBlocked: false });
    const token = createToken(user._id, user.email);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await userAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, "next() should be called for verified user");
    assert.ok(req.user, "req.user should be populated");
    assert.strictEqual(req.user.userId, user._id.toString());
    assert.strictEqual(req.user.email, user.email);
    assert.strictEqual(req.user.isVerified, true);
    assert.strictEqual(req.user.isBlocked, false);
  });

  // =========================================================================
  // TEST 2: Unverified user tries protected API -> Access denied
  // =========================================================================
  test("TEST 2: Unverified user tries protected API -> Rejected with 403 Forbidden", async () => {
    const unverifiedUser = await createTestUser({ isVerified: false });
    const token = createToken(unverifiedUser._id, unverifiedUser.email);

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await userAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, "next() must NOT be called for unverified user");
    assert.strictEqual(res.statusCode, 403, "Response status must be 403 Forbidden");
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /verify your email/i);
  });

  // =========================================================================
  // TEST 3: Valid token but deleted user -> Access denied
  // =========================================================================
  test("TEST 3: Valid token but deleted user in database -> Rejected with 401 Unauthorized", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const token = createToken(nonExistentId, "ghost@example.com");

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await userAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, "next() must NOT be called when user does not exist");
    assert.strictEqual(res.statusCode, 401, "Response status must be 401 Unauthorized");
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /user not found/i);
  });

  // =========================================================================
  // TEST 4: Valid token but user verification changed -> Database state respected
  // =========================================================================
  test("TEST 4: User was verified when token was issued, but database status changed to unverified -> Rejected with 403", async () => {
    const user = await createTestUser({ isVerified: true });
    const token = createToken(user._id, user.email);

    // Initial check passes
    const req1 = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res1 = createMockRes();
    let next1Called = false;
    await userAuthMiddleware(req1, res1, () => {
      next1Called = true;
    });
    assert.strictEqual(next1Called, true, "Verified user should pass initially");

    // Verification revoked in database
    await User.findByIdAndUpdate(user._id, { isVerified: false });

    // Same existing token now used
    const req2 = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res2 = createMockRes();
    let next2Called = false;
    await userAuthMiddleware(req2, res2, () => {
      next2Called = true;
    });

    assert.strictEqual(next2Called, false, "Token must be rejected after verification is revoked");
    assert.strictEqual(res2.statusCode, 403, "Response status must be 403 Forbidden");
    assert.strictEqual(res2.body?.success, false);
  });

  // =========================================================================
  // TEST 5: Expired token -> 401 response
  // =========================================================================
  test("TEST 5: Expired token -> Rejected with 401 Unauthorized", async () => {
    const user = await createTestUser({ isVerified: true });
    // Token that expired 1 second ago
    const expiredToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: "user",
      },
      JWT_SECRET,
      {
        expiresIn: "-1s",
      }
    );

    const req = {
      headers: {
        authorization: `Bearer ${expiredToken}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await userAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, "next() must NOT be called for expired token");
    assert.strictEqual(res.statusCode, 401, "Response status must be 401 Unauthorized");
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /invalid or expired token/i);
  });

  // =========================================================================
  // TEST 6: Invalid token -> 401 response
  // =========================================================================
  test("TEST 6: Malformed or forged token -> Rejected with 401 Unauthorized", async () => {
    const forgedToken = jwt.sign(
      {
        userId: new mongoose.Types.ObjectId(),
        email: "hacker@example.com",
        role: "user",
      },
      "wrong_secret_key"
    );

    const req = {
      headers: {
        authorization: `Bearer ${forgedToken}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await userAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, "next() must NOT be called for forged token");
    assert.strictEqual(res.statusCode, 401, "Response status must be 401 Unauthorized");
    assert.strictEqual(res.body?.success, false);
  });

  // =========================================================================
  // TEST 7: Existing checkout flow works normally with verified user
  // =========================================================================
  test("TEST 7: Existing checkout flow (createOrder) succeeds when passed through userAuthMiddleware", async () => {
    const user = await createTestUser({ isVerified: true });
    const token = createToken(user._id, user.email);

    const address = await Address.create({
      userId: user._id,
      fullName: "Auth Test User",
      phone: "9876543210",
      pincode: "560001",
      city: "Bangalore",
      state: "Karnataka",
      addressLine: "123 Test Street",
    });

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: {
        addressId: address._id.toString(),
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [
          {
            productId: productId.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };
    const res = createMockRes();

    // Pass through middleware first and await async controller
    await new Promise((resolve, reject) => {
      userAuthMiddleware(req, res, (err) => {
        if (err) return reject(err);
        createOrder(req, res).then(resolve).catch(reject);
      });
    });

    assert.strictEqual(res.statusCode, 201, "createOrder should succeed with 201 Created");
    assert.strictEqual(res.body?.success, true);
    assert.ok(res.body?.order, "Order should be created");
  });

  // =========================================================================
  // TEST 8: Existing order APIs work normally with verified user
  // =========================================================================
  test("TEST 8: Existing order APIs (getUserOrders) succeed when passed through userAuthMiddleware", async () => {
    const user = await createTestUser({ isVerified: true });
    const token = createToken(user._id, user.email);

    const address = await Address.create({
      userId: user._id,
      fullName: "Auth Test User",
      phone: "9876543210",
      pincode: "560001",
      city: "Bangalore",
      state: "Karnataka",
      addressLine: "123 Test Street",
    });

    // Create order via createOrder
    const createReq = {
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: {
        addressId: address._id.toString(),
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [
          {
            productId: productId.toString(),
            variantId: variantId.toString(),
            quantity: 1,
          },
        ],
      },
    };
    const createRes = createMockRes();
    await new Promise((resolve, reject) => {
      userAuthMiddleware(createReq, createRes, (err) => {
        if (err) return reject(err);
        createOrder(createReq, createRes).then(resolve).catch(reject);
      });
    });
    assert.strictEqual(createRes.statusCode, 201, "Order creation should succeed with 201 Created");

    // Fetch user orders via getUserOrders
    const getReq = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const getRes = createMockRes();

    // Pass through middleware first and await async controller
    await new Promise((resolve, reject) => {
      userAuthMiddleware(getReq, getRes, (err) => {
        if (err) return reject(err);
        getUserOrders(getReq, getRes).then(resolve).catch(reject);
      });
    });

    assert.strictEqual(getRes.statusCode, 200, "getUserOrders should succeed with 200 OK");
    assert.strictEqual(getRes.body?.success, true);
    assert.strictEqual(getRes.body?.orders?.length, 1);
  });

  // =========================================================================
  // CASE 4: User is blocked after login
  // =========================================================================
  test("CASE 4: User blocked after login -> Rejected with 403 Forbidden", async () => {
    const user = await createTestUser({ isVerified: true, isBlocked: false });
    const token = createToken(user._id, user.email);

    // Block the user in database
    await User.findByIdAndUpdate(user._id, { isBlocked: true });

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await userAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, "Blocked user must not proceed");
    assert.strictEqual(res.statusCode, 403, "Blocked user gets 403");
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /blocked/i);
  });

  // =========================================================================
  // CASE 7: Admin token accessing user route
  // =========================================================================
  test("CASE 7: Admin token accessing user route -> Rejected with 403 Forbidden", async () => {
    const adminToken = jwt.sign(
      {
        adminId: new mongoose.Types.ObjectId(),
        email: "admin@getsuka.com",
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const req = {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await userAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, "Admin token must not access user routes");
    assert.strictEqual(res.statusCode, 403, "Response status must be 403");
    assert.strictEqual(res.body?.success, false);
  });
});
