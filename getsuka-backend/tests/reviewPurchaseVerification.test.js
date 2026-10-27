import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../src/features/auth/models/User.js";
import Category from "../src/features/category/models/Category.js";
import Product from "../src/features/product/models/Product.js";
import Order from "../src/features/order/models/Order.js";
import Review from "../src/features/review/models/Review.js";
import PasswordResetOtp from "../src/features/auth/models/PasswordResetOtp.js";

import {
  addReview,
  getProductReviews,
} from "../src/features/review/controllers/reviewController.js";
import {
  loginUser,
  resetPassword,
} from "../src/features/auth/controllers/authController.js";
import {
  changePassword,
} from "../src/features/profile/controllers/userProfileController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_review_verification";

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

describe("Product Review Verified Purchase Security Tests (Step 7)", () => {
  let userCounter = 0;
  let categoryId;
  let product1;
  let product2;

  const createTestUser = async (overrides = {}) => {
    userCounter++;
    const uniqueSuffix = `${Date.now()}_${userCounter}`;
    return await User.create({
      fullName: `Review User ${userCounter}`,
      email: `review_user_${uniqueSuffix}@example.com`,
      password: "hashedpassword123",
      phone: "9876543210",
      profileImage: `https://example.com/avatar_${userCounter}.jpg`,
      referralCode: `GETSUKA-REV-${uniqueSuffix}`,
      isVerified: true,
      isBlocked: false,
      ...overrides,
    });
  };

  const createTestOrder = async ({
    userId,
    product,
    status = "delivered",
    itemStatus = "active",
  }) => {
    return await Order.create({
      userId,
      orderNumber: `ORD-REV-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      items: [
        {
          productId: product._id,
          variantId: product.variants[0]._id,
          productName: product.name,
          sku: product.variants[0].sku,
          quantity: 1,
          price: product.price,
          totalPrice: product.price,
          itemStatus,
        },
      ],
      shippingAddress: {
        addressId: new mongoose.Types.ObjectId(),
        fullName: "Test Customer",
        phone: "9876543210",
        addressLine: "123 Street",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560001",
      },
      deliveryMethod: "standard",
      subtotal: product.price,
      totalAmount: product.price,
      paymentMethod: "cod",
      paymentStatus: status === "delivered" ? "paid" : "pending",
      status,
    });
  };

  before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "getsuka_super_secret_key";
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    const category = await Category.create({
      name: "Review Test Anime",
      isDeleted: false,
    });
    categoryId = category._id;

    product1 = await Product.create({
      name: "Jujutsu Kaisen Hoodie",
      description: "Test Hoodie",
      category: categoryId,
      anime: "Jujutsu Kaisen",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 1200,
      variants: [
        {
          color: "Black",
          size: "L",
          sku: `HOODIE-L-${Date.now()}`,
          stock: 15,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    product2 = await Product.create({
      name: "Chainsaw Man Tee",
      description: "Test Tee",
      category: categoryId,
      anime: "Chainsaw Man",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 799,
      variants: [
        {
          color: "White",
          size: "M",
          sku: `TEE-M-${Date.now()}`,
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

  // =========================================================================
  // TEST 1: User has delivered order containing product -> Review succeeds
  // =========================================================================
  test("TEST 1: User has a delivered order for the product -> Review succeeds with 201 Created", async () => {
    const user = await createTestUser();
    await createTestOrder({
      userId: user._id,
      product: product1,
      status: "delivered",
    });

    const req = {
      user: { userId: user._id.toString() },
      params: { productId: product1._id.toString() },
      body: {
        rating: 5,
        comment: "Excellent hoodie! Fabric quality is truly premium.",
      },
    };
    const res = createMockRes();

    await addReview(req, res);

    assert.strictEqual(res.statusCode, 201, "Expected 201 Created for verified purchaser");
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.data?.rating, 5);
    assert.strictEqual(res.body?.data?.isVerifiedPurchase, true);

    const savedReview = await Review.findOne({
      user: user._id,
      product: product1._id,
    });
    assert.ok(savedReview, "Review must be saved in database");
    assert.strictEqual(savedReview.rating, 5);
  });

  // =========================================================================
  // TEST 2: User has no order for product -> Review rejected
  // =========================================================================
  test("TEST 2: User has never ordered the product -> Review rejected with 403 Forbidden", async () => {
    const user = await createTestUser();
    // User has no orders at all

    const req = {
      user: { userId: user._id.toString() },
      params: { productId: product1._id.toString() },
      body: {
        rating: 4,
        comment: "I never bought this but want to leave a rating.",
      },
    };
    const res = createMockRes();

    await addReview(req, res);

    assert.strictEqual(res.statusCode, 403, "Expected 403 Forbidden for non-purchaser");
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /purchased and received/i);

    const reviewInDb = await Review.findOne({
      user: user._id,
      product: product1._id,
    });
    assert.strictEqual(reviewInDb, null, "No review should be saved in database");
  });

  // =========================================================================
  // TEST 3: User has pending order -> Review rejected
  // =========================================================================
  test("TEST 3: User has order with status 'placed' / 'shipped' (not yet delivered) -> Review rejected with 403", async () => {
    const user = await createTestUser();
    await createTestOrder({
      userId: user._id,
      product: product2,
      status: "shipped", // On the way, but not yet delivered
    });

    const req = {
      user: { userId: user._id.toString() },
      params: { productId: product2._id.toString() },
      body: {
        rating: 5,
        comment: "Can't wait to receive this item!",
      },
    };
    const res = createMockRes();

    await addReview(req, res);

    assert.strictEqual(res.statusCode, 403, "Expected 403 Forbidden for undelivered order");
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /purchased and received/i);
  });

  // =========================================================================
  // TEST 4: User has cancelled order -> Review rejected
  // =========================================================================
  test("TEST 4: User ordered but order was cancelled -> Review rejected with 403 Forbidden", async () => {
    const user = await createTestUser();
    await createTestOrder({
      userId: user._id,
      product: product2,
      status: "cancelled", // Entire order was cancelled
    });

    const req = {
      user: { userId: user._id.toString() },
      params: { productId: product2._id.toString() },
      body: {
        rating: 1,
        comment: "Cancelled my order but leaving a bad review anyway.",
      },
    };
    const res = createMockRes();

    await addReview(req, res);

    assert.strictEqual(res.statusCode, 403, "Expected 403 Forbidden for cancelled order");
    assert.strictEqual(res.body?.success, false);
  });

  test("TEST 4B: Order was delivered but the specific item was cancelled -> Review rejected with 403", async () => {
    const user = await createTestUser();
    await createTestOrder({
      userId: user._id,
      product: product2,
      status: "delivered",
      itemStatus: "cancelled", // Item was cancelled before delivery
    });

    const req = {
      user: { userId: user._id.toString() },
      params: { productId: product2._id.toString() },
      body: {
        rating: 1,
        comment: "Item was cancelled before shipping.",
      },
    };
    const res = createMockRes();

    await addReview(req, res);

    assert.strictEqual(res.statusCode, 403, "Expected 403 Forbidden for cancelled item in order");
    assert.strictEqual(res.body?.success, false);
  });

  // =========================================================================
  // TEST 5: User sends fake order ID or client manipulation -> Rejected
  // =========================================================================
  test("TEST 5: Client injects fake order ID in body -> Backend ignores it and rejects with 403", async () => {
    const user = await createTestUser();

    const req = {
      user: { userId: user._id.toString() },
      params: { productId: product2._id.toString() },
      body: {
        rating: 5,
        comment: "Forged order ID in body payload.",
        orderId: new mongoose.Types.ObjectId().toString(),
        isDelivered: true,
      },
    };
    const res = createMockRes();

    await addReview(req, res);

    assert.strictEqual(res.statusCode, 403, "Fake orderId must be ignored and request rejected");
    assert.strictEqual(res.body?.success, false);
  });

  // =========================================================================
  // TEST 6: User tries reviewing another user's purchased product -> Rejected
  // =========================================================================
  test("TEST 6: User A tries reviewing product bought and received by User B -> Rejected with 403", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    // User B bought and received product2
    await createTestOrder({
      userId: userB._id,
      product: product2,
      status: "delivered",
    });

    // User A tries to review product2
    const req = {
      user: { userId: userA._id.toString() },
      params: { productId: product2._id.toString() },
      body: {
        rating: 5,
        comment: "Trying to review what user B bought.",
      },
    };
    const res = createMockRes();

    await addReview(req, res);

    assert.strictEqual(res.statusCode, 403, "User A cannot review product purchased by User B");
    assert.strictEqual(res.body?.success, false);
  });

  // =========================================================================
  // TEST 7: Existing product review display works normally
  // =========================================================================
  test("TEST 7: Existing review display (getProductReviews) works normally", async () => {
    // product1 has 1 review from TEST 1
    const req = {
      params: { productId: product1._id.toString() },
    };
    const res = createMockRes();

    await getProductReviews(req, res);

    assert.strictEqual(res.statusCode, 200, "Expected 200 OK for getProductReviews");
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.data?.totalReviews, 1);
    assert.strictEqual(res.body?.data?.averageRating, 5);
    assert.strictEqual(res.body?.data?.reviews?.length, 1);
  });

  // =========================================================================
  // TEST 8: Existing product rating calculation works accurately
  // =========================================================================
  test("TEST 8: Product rating calculation is exact when multiple verified reviews exist", async () => {
    const user2 = await createTestUser();
    await createTestOrder({
      userId: user2._id,
      product: product1,
      status: "delivered",
    });

    // User 2 adds a 3-star review
    const addReq = {
      user: { userId: user2._id.toString() },
      params: { productId: product1._id.toString() },
      body: {
        rating: 3,
        comment: "Decent product, fits a bit loose.",
      },
    };
    const addRes = createMockRes();
    await addReview(addReq, addRes);
    assert.strictEqual(addRes.statusCode, 201);

    // Fetch reviews: (5 + 3) / 2 = 4.0
    const getReq = {
      params: { productId: product1._id.toString() },
    };
    const getRes = createMockRes();
    await getProductReviews(getReq, getRes);

    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body?.data?.totalReviews, 2);
    assert.strictEqual(getRes.body?.data?.averageRating, 4.0);
  });

  // =========================================================================
  // TEST 9: Duplicate review attempt -> 409 Conflict
  // =========================================================================
  test("TEST 9: Verified purchaser trying to review the same product twice -> Rejected with 409 Conflict", async () => {
    const user = await createTestUser();
    await createTestOrder({
      userId: user._id,
      product: product2,
      status: "delivered",
    });

    // First review succeeds
    const req1 = {
      user: { userId: user._id.toString() },
      params: { productId: product2._id.toString() },
      body: {
        rating: 5,
        comment: "First review: loved it!",
      },
    };
    const res1 = createMockRes();
    await addReview(req1, res1);
    assert.strictEqual(res1.statusCode, 201);

    // Second review attempt
    const req2 = {
      user: { userId: user._id.toString() },
      params: { productId: product2._id.toString() },
      body: {
        rating: 4,
        comment: "Second review attempt on same product.",
      },
    };
    const res2 = createMockRes();
    await addReview(req2, res2);

    assert.strictEqual(res2.statusCode, 409, "Duplicate review must be rejected with 409 Conflict");
    assert.strictEqual(res2.body?.success, false);
    assert.match(res2.body?.message, /already reviewed/i);
  });

  // =========================================================================
  // TEST 10: Security — Public review endpoint exposes only safe reviewer fields
  // =========================================================================
  test("TEST 10: Public review endpoint (getProductReviews) exposes only safe fields and excludes password, email, phone", async () => {
    // Unauthenticated request - no req.user
    const req = {
      params: { productId: product1._id.toString() },
    };
    const res = createMockRes();

    await getProductReviews(req, res);

    assert.strictEqual(res.statusCode, 200, "Unauthenticated visitor must be able to retrieve public reviews");
    assert.strictEqual(res.body?.success, true);
    assert.ok(Array.isArray(res.body?.data?.reviews));
    assert.ok(res.body.data.reviews.length > 0);

    for (const rev of res.body.data.reviews) {
      assert.ok(rev.user, "Review must have populated user object");
      // 1. Display name remains available
      assert.ok(typeof rev.user.fullName === "string" && rev.user.fullName.length > 0, "Reviewer fullName must be available");
      // 2. Profile image field remains available
      assert.ok(rev.user.profileImage !== undefined, "Reviewer profileImage field must be available");

      // 3. Sensitive fields must be completely ABSENT
      assert.strictEqual(rev.user.password, undefined, "Password hash must NOT be in public review response");
      assert.strictEqual(rev.user.email, undefined, "Email must NOT be in public review response");
      assert.strictEqual(rev.user.phone, undefined, "Phone must NOT be in public review response");
      assert.strictEqual(rev.user.referralCode, undefined, "Referral code must NOT be in public review response");
      assert.strictEqual(rev.user.isBlocked, undefined, "isBlocked flag must NOT be in public review response");
      assert.strictEqual(rev.user.authProvider, undefined, "authProvider must NOT be in public review response");
      assert.strictEqual(rev.user.googleId, undefined, "googleId must NOT be in public review response");
      assert.strictEqual(rev.user.dateOfBirth, undefined, "dateOfBirth must NOT be in public review response");
    }
  });

  // =========================================================================
  // TEST 11: Security — Creating review response also excludes sensitive user fields
  // =========================================================================
  test("TEST 11: Adding a review returns populated reviewer with only safe fields", async () => {
    const user = await createTestUser({
      fullName: "Sensitive Test Reviewer",
      phone: "1122334455",
      profileImage: "https://example.com/sensitive_avatar.png",
    });

    await createTestOrder({
      userId: user._id,
      product: product2,
      status: "delivered",
    });

    const req = {
      user: { userId: user._id.toString() },
      params: { productId: product2._id.toString() },
      body: {
        rating: 5,
        comment: "Excellent quality and fast shipping!",
      },
    };
    const res = createMockRes();

    await addReview(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body?.success, true);
    const createdUser = res.body?.data?.user;
    assert.ok(createdUser, "Created review must populate user");
    assert.strictEqual(createdUser.fullName, "Sensitive Test Reviewer");
    assert.strictEqual(createdUser.profileImage, "https://example.com/sensitive_avatar.png");
    assert.strictEqual(createdUser.password, undefined, "Password must not be in addReview response");
    assert.strictEqual(createdUser.email, undefined, "Email must not be in addReview response");
    assert.strictEqual(createdUser.phone, undefined, "Phone must not be in addReview response");
    assert.strictEqual(createdUser.referralCode, undefined, "Referral code must not be in addReview response");
  });

  // =========================================================================
  // TEST 12: Authentication — Login still functions when password field is select: false
  // =========================================================================
  test("TEST 12: Login succeeds with select: false password and does not leak password hash in response", async () => {
    const rawPassword = "TestPassword@123";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const uniqueEmail = `login_test_${Date.now()}@example.com`;

    await createTestUser({
      email: uniqueEmail,
      password: hashedPassword,
    });

    // 1. Valid credentials login succeeds
    const loginReq = {
      body: {
        email: uniqueEmail,
        password: rawPassword,
      },
    };
    const loginRes = createMockRes();
    await loginUser(loginReq, loginRes);

    assert.strictEqual(loginRes.statusCode, 200, "Login must succeed with correct credentials");
    assert.strictEqual(loginRes.body?.success, true);
    assert.ok(loginRes.body?.token, "Token must be returned on login");
    assert.strictEqual(loginRes.body?.user?.email, uniqueEmail);
    assert.strictEqual(loginRes.body?.user?.password, undefined, "Password must not be in login response");

    // 2. Invalid password login fails
    const invalidReq = {
      body: {
        email: uniqueEmail,
        password: "WrongPassword999",
      },
    };
    const invalidRes = createMockRes();
    await loginUser(invalidReq, invalidRes);

    assert.strictEqual(invalidRes.statusCode, 401, "Login must fail with incorrect password");
    assert.strictEqual(invalidRes.body?.success, false);
  });

  // =========================================================================
  // TEST 13: Authentication — Password change flow still functions with select: false
  // =========================================================================
  test("TEST 13: Password verification in changePassword succeeds with select: false", async () => {
    const originalPassword = "InitialPassword@123";
    const newPassword = "UpdatedPassword@456";
    const hashedPassword = await bcrypt.hash(originalPassword, 10);
    const uniqueEmail = `pw_change_${Date.now()}@example.com`;

    const user = await createTestUser({
      email: uniqueEmail,
      password: hashedPassword,
    });

    // 1. Incorrect current password rejected
    const failReq = {
      user: { userId: user._id.toString() },
      body: {
        currentPassword: "IncorrectPassword",
        newPassword,
        confirmPassword: newPassword,
      },
    };
    const failRes = createMockRes();
    await changePassword(failReq, failRes);
    assert.strictEqual(failRes.statusCode, 400);
    assert.match(failRes.body?.message, /current password is incorrect/i);

    // 2. Correct current password succeeds
    const successReq = {
      user: { userId: user._id.toString() },
      body: {
        currentPassword: originalPassword,
        newPassword,
        confirmPassword: newPassword,
      },
    };
    const successRes = createMockRes();
    await changePassword(successReq, successRes);
    assert.strictEqual(successRes.statusCode, 200);
    assert.strictEqual(successRes.body?.success, true);

    // 3. Can login with new password
    const loginReq = {
      body: {
        email: uniqueEmail,
        password: newPassword,
      },
    };
    const loginRes = createMockRes();
    await loginUser(loginReq, loginRes);
    assert.strictEqual(loginRes.statusCode, 200);
    assert.strictEqual(loginRes.body?.success, true);
  });

  // =========================================================================
  // TEST 14: Authentication — Password reset flow still functions with select: false
  // =========================================================================
  test("TEST 14: Password reset flow still functions and allows logging in with reset password", async () => {
    const originalPassword = "ResetTestOriginal@1";
    const resetPasswordVal = "ResetTestNewPassword@2";
    const hashedPassword = await bcrypt.hash(originalPassword, 10);
    const uniqueEmail = `pw_reset_${Date.now()}@example.com`;

    await createTestUser({
      email: uniqueEmail,
      password: hashedPassword,
    });

    const otp = "889900";
    await PasswordResetOtp.create({
      email: uniqueEmail,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    const resetReq = {
      body: {
        email: uniqueEmail,
        otp,
        password: resetPasswordVal,
        confirmPassword: resetPasswordVal,
      },
    };
    const resetRes = createMockRes();
    await resetPassword(resetReq, resetRes);
    assert.strictEqual(resetRes.statusCode, 200);
    assert.strictEqual(resetRes.body?.success, true);

    // Verify login with new password
    const loginReq = {
      body: {
        email: uniqueEmail,
        password: resetPasswordVal,
      },
    };
    const loginRes = createMockRes();
    await loginUser(loginReq, loginRes);
    assert.strictEqual(loginRes.statusCode, 200);
    assert.strictEqual(loginRes.body?.success, true);
  });
});
