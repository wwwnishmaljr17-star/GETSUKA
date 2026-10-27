import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import User from "../src/features/auth/models/User.js";
import OtpVerification from "../src/features/auth/models/otpVerification.js";
import {
  loginUser,
  registerUser,
  googleLogin,
} from "../src/features/auth/controllers/authController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_auth_regression";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_regression_test_secret_key";

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

describe("Authentication Emergency Fix Regression Tests", () => {
  let counter = 0;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.GOOGLE_CLIENT_ID = "10351951726-ent9lnlds87h6b95uklm3bgo4ifk7jde.apps.googleusercontent.com";
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();
    
    // Ensure index on test database
    await User.collection.createIndex(
      { referralCode: 1 },
      { unique: true, partialFilterExpression: { referralCode: { $type: "string" } } }
    );
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================================
  // LOGIN TESTS
  // =========================================================================

  test("TEST 1: Valid login succeeds with correct credentials", async () => {
    counter++;
    const email = `valid.login.${counter}@example.com`;
    const password = "ValidPassword123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName: "Valid User",
      email,
      password: hashedPassword,
      authProvider: "local",
      isVerified: true,
      isBlocked: false,
    });

    const req = { body: { email, password } };
    const res = createMockRes();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.ok(res.body?.token, "Token should be present in response");
    assert.strictEqual(res.body?.user?.email, email);
    assert.strictEqual(res.body?.user?.isVerified, true);
    assert.strictEqual(res.body?.user?.authProvider, "local");

    // Verify token validity
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    assert.strictEqual(decoded.userId, user._id.toString());
    assert.strictEqual(decoded.email, email);
  });

  test("TEST 2: Login rejects incorrect password with 401 Unauthorized", async () => {
    counter++;
    const email = `wrong.pass.${counter}@example.com`;
    const password = "CorrectPassword123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      fullName: "Wrong Pass User",
      email,
      password: hashedPassword,
      authProvider: "local",
      isVerified: true,
      isBlocked: false,
    });

    const req = { body: { email, password: "WrongPassword999!" } };
    const res = createMockRes();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Invalid email or password");
    assert.strictEqual(res.body?.token, undefined);
  });

  test("TEST 3: Login rejects unknown account with 401 Unauthorized", async () => {
    const req = { body: { email: "nonexistent.user.999@example.com", password: "SomePassword123!" } };
    const res = createMockRes();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Invalid email or password");
  });

  test("TEST 4: Login rejects unverified account with 403 Forbidden", async () => {
    counter++;
    const email = `unverified.${counter}@example.com`;
    const password = "ValidPassword123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      fullName: "Unverified User",
      email,
      password: hashedPassword,
      authProvider: "local",
      isVerified: false,
      isBlocked: false,
    });

    const req = { body: { email, password } };
    const res = createMockRes();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /verify your email/i);
  });

  test("TEST 5: Login rejects blocked account with 403 Forbidden", async () => {
    counter++;
    const email = `blocked.${counter}@example.com`;
    const password = "ValidPassword123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      fullName: "Blocked User",
      email,
      password: hashedPassword,
      authProvider: "local",
      isVerified: true,
      isBlocked: true,
    });

    const req = { body: { email, password } };
    const res = createMockRes();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /blocked/i);
  });

  test("TEST 6: Login rejects password auth for Google-only account with 401", async () => {
    counter++;
    const email = `google.user.${counter}@example.com`;

    await User.create({
      fullName: "Google Authenticated User",
      email,
      password: "google_1234567890",
      authProvider: "google",
      googleId: "1234567890",
      isVerified: true,
      isBlocked: false,
    });

    const req = { body: { email, password: "AttemptedPassword123!" } };
    const res = createMockRes();

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /Google login/i);
  });

  // =========================================================================
  // REGISTRATION TESTS
  // =========================================================================

  test("TEST 7: Valid registration creates unverified user and generates OTP without duplicate referralCode crash", async () => {
    counter++;
    const email = `reg.test.${counter}@example.com`;

    const req = {
      body: {
        fullName: "New Register User",
        email,
        password: "ValidPassword123!",
      },
    };
    const res = createMockRes();

    await registerUser(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.email, email);

    // Verify user in database
    const createdUser = await User.findOne({ email });
    assert.ok(createdUser, "User must be created in DB");
    assert.strictEqual(createdUser.isVerified, false, "New user must be unverified initially");
    assert.strictEqual(createdUser.referralCode, undefined, "referralCode must be undefined, not null");

    // Verify OTP in database
    const otpRecord = await OtpVerification.findOne({ email });
    assert.ok(otpRecord, "OTP record must be stored");
    assert.match(otpRecord.otp, /^\d{6}$/, "OTP must be 6 digits");
  });

  test("TEST 8: Second user registration without referral code succeeds without E11000 duplicate key error", async () => {
    counter++;
    const email1 = `second.user.a.${counter}@example.com`;
    const email2 = `second.user.b.${counter}@example.com`;

    const req1 = { body: { fullName: "User One", email: email1, password: "Password123!" } };
    const res1 = createMockRes();
    await registerUser(req1, res1);
    assert.strictEqual(res1.statusCode, 201);

    const req2 = { body: { fullName: "User Two", email: email2, password: "Password123!" } };
    const res2 = createMockRes();
    await registerUser(req2, res2);
    assert.strictEqual(res2.statusCode, 201, "Second registration must not crash with duplicate key error");

    const user1 = await User.findOne({ email: email1 });
    const user2 = await User.findOne({ email: email2 });
    assert.ok(user1);
    assert.ok(user2);
    assert.strictEqual(user1.referralCode, undefined);
    assert.strictEqual(user2.referralCode, undefined);
  });

  test("TEST 9: Duplicate registration for verified user returns 409 Conflict", async () => {
    counter++;
    const email = `existing.verified.${counter}@example.com`;

    await User.create({
      fullName: "Existing Verified",
      email,
      password: "HashedPassword123!",
      authProvider: "local",
      isVerified: true,
      isBlocked: false,
    });

    const req = { body: { fullName: "Duplicate Attempt", email, password: "NewPassword123!" } };
    const res = createMockRes();

    await registerUser(req, res);

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body?.success, false);
    assert.match(res.body?.message, /already exists/i);
  });

  test("TEST 10: Invalid registration payload returns 400 Validation Error", async () => {
    const req = {
      body: {
        fullName: "A", // too short
        email: "not-an-email",
        password: "short", // too short, no uppercase, no special char
      },
    };
    const res = createMockRes();

    await registerUser(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Validation failed");
    assert.ok(res.body?.errors, "Validation field errors must be provided");
  });

  // =========================================================================
  // GOOGLE AUTHENTICATION TESTS
  // =========================================================================

  test("TEST 11: Google login rejects missing credential with 400 Bad Request", async () => {
    const req = { body: {} };
    const res = createMockRes();

    await googleLogin(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Google credential is required");
  });

  test("TEST 12: Google login rejects invalid/fake credential with 401 Unauthorized", async () => {
    const req = { body: { credential: "fake_invalid_google_jwt_token" } };
    const res = createMockRes();

    await googleLogin(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body?.success, false);
    assert.strictEqual(res.body?.message, "Invalid or expired Google token");
  });

  test("TEST 13: Google login succeeds with a valid verified credential, creating new user without duplicate referralCode crash", async () => {
    const { OAuth2Client } = await import("google-auth-library");
    counter++;
    const googleEmail = `new.google.${counter}@example.com`;
    const googleId = `gid_${Date.now()}_${counter}`;

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: googleId,
        email: googleEmail,
        name: "Google Anime Fan",
        email_verified: true,
      }),
    });

    try {
      const req = { body: { credential: "valid_mock_credential_token" } };
      const res = createMockRes();

      await googleLogin(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.user?.email, googleEmail);
      assert.strictEqual(res.body?.user?.authProvider, "google");
      assert.ok(res.body?.token, "JWT token must be returned");

      // Verify in DB
      const createdGoogleUser = await User.findOne({ email: googleEmail });
      assert.ok(createdGoogleUser);
      assert.strictEqual(createdGoogleUser.authProvider, "google");
      assert.strictEqual(createdGoogleUser.isVerified, true);
      assert.strictEqual(createdGoogleUser.googleId, googleId);
      assert.strictEqual(createdGoogleUser.referralCode, undefined, "referralCode must be undefined, not null");
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  test("TEST 14: Google login succeeds for an existing user and returns valid token", async () => {
    const { OAuth2Client } = await import("google-auth-library");
    counter++;
    const googleEmail = `existing.google.${counter}@example.com`;
    const googleId = `gid_exist_${counter}`;

    await User.create({
      fullName: "Existing User",
      email: googleEmail,
      password: "hashed_pass_123",
      authProvider: "google",
      googleId,
      isVerified: true,
      isBlocked: false,
    });

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: googleId,
        email: googleEmail,
        name: "Existing User",
        email_verified: true,
      }),
    });

    try {
      const req = { body: { credential: "mock_existing_credential" } };
      const res = createMockRes();

      await googleLogin(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.user?.email, googleEmail);
      assert.ok(res.body?.token);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  test("TEST 15: Google login rejects unverified Google email with 400 Bad Request", async () => {
    const { OAuth2Client } = await import("google-auth-library");
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "unverified_sub_123",
        email: "unverified.google@example.com",
        name: "Unverified Google",
        email_verified: false, // NOT verified by Google
      }),
    });

    try {
      const req = { body: { credential: "unverified_email_token" } };
      const res = createMockRes();

      await googleLogin(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /could not be verified/i);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  test("TEST 16: Google login rejects blocked user with 403 Forbidden", async () => {
    const { OAuth2Client } = await import("google-auth-library");
    counter++;
    const googleEmail = `blocked.google.${counter}@example.com`;

    await User.create({
      fullName: "Blocked Google User",
      email: googleEmail,
      password: "google_pass_123",
      authProvider: "google",
      googleId: "blocked_gid_123",
      isVerified: true,
      isBlocked: true, // Blocked
    });

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "blocked_gid_123",
        email: googleEmail,
        name: "Blocked User",
        email_verified: true,
      }),
    });

    try {
      const req = { body: { credential: "mock_blocked_credential" } };
      const res = createMockRes();

      await googleLogin(req, res);

      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body?.success, false);
      assert.match(res.body?.message, /blocked/i);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });
});
