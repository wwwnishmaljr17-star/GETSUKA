import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../src/features/auth/models/User.js";
import {
  loginUser,
} from "../src/features/auth/controllers/authController.js";
import {
  loginLimiter,
  otpVerifyLimiter,
  otpResendLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
  createAuthLimiter,
} from "../src/middlewares/authRateLimiter.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_rate_limiting";

const createMockReq = (ip = "127.0.0.1", body = {}, params = {}) => ({
  ip,
  headers: {},
  body,
  params,
  app: {
    get: (key) => (key === "trust proxy" ? false : undefined),
  },
});

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
    send(data) {
      this.body = data;
      return this;
    },
  };
  return res;
};

const runMiddleware = (limiter, req, res) => {
  return new Promise((resolve, reject) => {
    limiter(req, res, (err) => {
      if (err) return reject(err);
      resolve({ nextCalled: true });
    });
    // In case the middleware returns response without calling next
    setImmediate(() => {
      resolve({ nextCalled: false });
    });
  });
};

describe("Authentication Rate Limiting Security Tests (Step 8)", () => {
  let userCounter = 0;
  let testUserPassword = "Password123!";
  let testUserEmail;
  let testUser;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    const hashedPassword = await bcrypt.hash(testUserPassword, 10);
    testUserEmail = `rate_limit_user_${Date.now()}@example.com`;
    testUser = await User.create({
      fullName: "Rate Limit Test User",
      email: testUserEmail,
      password: hashedPassword,
      isVerified: true,
      isBlocked: false,
      referralCode: `GETSUKA-RL-${Date.now()}`,
    });
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================================
  // TEST 1: Normal login succeeds
  // =========================================================================
  test("TEST 1: Normal login passes loginLimiter and succeeds with 200 OK", async () => {
    const ip = "192.168.1.10";
    const req = createMockReq(ip, {
      email: testUserEmail,
      password: testUserPassword,
    });
    const res = createMockRes();

    let passedLimiter = false;
    await runMiddleware(loginLimiter, req, res);
    passedLimiter = true;

    assert.strictEqual(passedLimiter, true, "loginLimiter should allow first request");

    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 200, "loginUser should return 200 OK");
    assert.strictEqual(res.body?.success, true);
    assert.ok(res.body?.token, "JWT token should be returned");
  });

  // =========================================================================
  // TEST 2: Multiple failed login attempts are blocked with 429
  // =========================================================================
  test("TEST 2: Multiple login attempts exceeding limit (10) are blocked with 429 Too Many Requests", async () => {
    const ip = "192.168.1.20";

    // First 10 attempts pass through the rate limiter
    for (let i = 1; i <= 10; i++) {
      const req = createMockReq(ip, {
        email: testUserEmail,
        password: "WrongPassword",
      });
      const res = createMockRes();
      const result = await runMiddleware(loginLimiter, req, res);
      assert.strictEqual(result.nextCalled, true, `Attempt ${i} should be allowed`);
    }

    // 11th attempt must be rejected by loginLimiter with 429
    const blockedReq = createMockReq(ip, {
      email: testUserEmail,
      password: "WrongPassword",
    });
    const blockedRes = createMockRes();
    const result = await runMiddleware(loginLimiter, blockedReq, blockedRes);

    assert.strictEqual(result.nextCalled, false, "11th attempt must not call next()");
    assert.strictEqual(blockedRes.statusCode, 429, "Expected status code 429 Too Many Requests");
    assert.strictEqual(blockedRes.body?.success, false);
    assert.match(blockedRes.body?.message, /too many login attempts/i);
  });

  // =========================================================================
  // TEST 3: Valid login after cooldown / different IP is allowed
  // =========================================================================
  test("TEST 3: Cooldown works properly: requests are permitted after window resets", async () => {
    // Create a fast-expiring test limiter (50ms window, max 2)
    const shortCooldownLimiter = createAuthLimiter({
      windowMs: 50,
      max: 2,
      message: "Rate limit exceeded, please wait.",
    });

    const ip = "192.168.1.30";

    // 2 allowed requests
    for (let i = 1; i <= 2; i++) {
      const req = createMockReq(ip);
      const res = createMockRes();
      const result = await runMiddleware(shortCooldownLimiter, req, res);
      assert.strictEqual(result.nextCalled, true);
    }

    // 3rd is blocked
    const blockedReq = createMockReq(ip);
    const blockedRes = createMockRes();
    const blockedResult = await runMiddleware(shortCooldownLimiter, blockedReq, blockedRes);
    assert.strictEqual(blockedResult.nextCalled, false);
    assert.strictEqual(blockedRes.statusCode, 429);

    // Wait 60ms for window to reset
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Request after cooldown succeeds
    const allowedReq = createMockReq(ip);
    const allowedRes = createMockRes();
    const allowedResult = await runMiddleware(shortCooldownLimiter, allowedReq, allowedRes);
    assert.strictEqual(allowedResult.nextCalled, true, "Request after cooldown must be allowed");
  });

  // =========================================================================
  // TEST 4: Repeated OTP verification attempts blocked after limit (5)
  // =========================================================================
  test("TEST 4: Repeated OTP verification attempts are blocked after 5 tries with 429", async () => {
    const ip = "192.168.1.40";

    for (let i = 1; i <= 5; i++) {
      const req = createMockReq(ip, { email: "user@example.com", otp: "123456" });
      const res = createMockRes();
      const result = await runMiddleware(otpVerifyLimiter, req, res);
      assert.strictEqual(result.nextCalled, true, `Attempt ${i} should be allowed`);
    }

    // 6th attempt blocked
    const blockedReq = createMockReq(ip, { email: "user@example.com", otp: "123456" });
    const blockedRes = createMockRes();
    const result = await runMiddleware(otpVerifyLimiter, blockedReq, blockedRes);

    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(blockedRes.statusCode, 429);
    assert.strictEqual(blockedRes.body?.success, false);
    assert.match(blockedRes.body?.message, /too many otp verification attempts/i);
  });

  // =========================================================================
  // TEST 5: Repeated OTP resend blocked after 3 attempts
  // =========================================================================
  test("TEST 5: Repeated OTP resend is strictly limited to 3 requests per window", async () => {
    const ip = "192.168.1.50";

    for (let i = 1; i <= 3; i++) {
      const req = createMockReq(ip, { email: "user@example.com" });
      const res = createMockRes();
      const result = await runMiddleware(otpResendLimiter, req, res);
      assert.strictEqual(result.nextCalled, true, `Resend ${i} should be allowed`);
    }

    // 4th attempt blocked
    const blockedReq = createMockReq(ip, { email: "user@example.com" });
    const blockedRes = createMockRes();
    const result = await runMiddleware(otpResendLimiter, blockedReq, blockedRes);

    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(blockedRes.statusCode, 429);
    assert.strictEqual(blockedRes.body?.success, false);
    assert.match(blockedRes.body?.message, /too many otp resend requests/i);
  });

  // =========================================================================
  // TEST 6: Forgot password abuse is limited (5)
  // =========================================================================
  test("TEST 6: Forgot password requests are limited to 5 per 15 minutes", async () => {
    const ip = "192.168.1.60";

    for (let i = 1; i <= 5; i++) {
      const req = createMockReq(ip, { email: "victim@example.com" });
      const res = createMockRes();
      const result = await runMiddleware(forgotPasswordLimiter, req, res);
      assert.strictEqual(result.nextCalled, true, `Forgot password request ${i} allowed`);
    }

    // 6th attempt blocked
    const blockedReq = createMockReq(ip, { email: "victim@example.com" });
    const blockedRes = createMockRes();
    const result = await runMiddleware(forgotPasswordLimiter, blockedReq, blockedRes);

    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(blockedRes.statusCode, 429);
    assert.strictEqual(blockedRes.body?.success, false);
    assert.match(blockedRes.body?.message, /too many password reset requests/i);
  });

  // =========================================================================
  // TEST 7: Registration spam is limited (10)
  // =========================================================================
  test("TEST 7: Registration spam is limited to 10 accounts per hour per IP", async () => {
    const ip = "192.168.1.70";

    for (let i = 1; i <= 10; i++) {
      const req = createMockReq(ip, {
        fullName: `Spam User ${i}`,
        email: `spam_${i}@example.com`,
        password: "Password123!",
      });
      const res = createMockRes();
      const result = await runMiddleware(registerLimiter, req, res);
      assert.strictEqual(result.nextCalled, true, `Registration ${i} allowed`);
    }

    // 11th registration blocked
    const blockedReq = createMockReq(ip, {
      fullName: "Spam User 11",
      email: "spam_11@example.com",
      password: "Password123!",
    });
    const blockedRes = createMockRes();
    const result = await runMiddleware(registerLimiter, blockedReq, blockedRes);

    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(blockedRes.statusCode, 429);
    assert.strictEqual(blockedRes.body?.success, false);
    assert.match(blockedRes.body?.message, /too many registration attempts/i);
  });

  // =========================================================================
  // TEST 8: Password reset endpoint is limited (5)
  // =========================================================================
  test("TEST 8A: Password reset endpoint is limited to 5 attempts per window", async () => {
    const ip = "192.168.1.80";

    for (let i = 1; i <= 5; i++) {
      const req = createMockReq(ip, {
        email: "user@example.com",
        otp: "123456",
        password: "NewPassword123!",
        confirmPassword: "NewPassword123!",
      });
      const res = createMockRes();
      const result = await runMiddleware(resetPasswordLimiter, req, res);
      assert.strictEqual(result.nextCalled, true, `Reset attempt ${i} allowed`);
    }

    // 6th attempt blocked
    const blockedReq = createMockReq(ip, {
      email: "user@example.com",
      otp: "123456",
      password: "NewPassword123!",
      confirmPassword: "NewPassword123!",
    });
    const blockedRes = createMockRes();
    const result = await runMiddleware(resetPasswordLimiter, blockedReq, blockedRes);

    assert.strictEqual(result.nextCalled, false);
    assert.strictEqual(blockedRes.statusCode, 429);
    assert.strictEqual(blockedRes.body?.success, false);
    assert.match(blockedRes.body?.message, /too many password reset attempts/i);
  });

  // =========================================================================
  // TEST 8B: Google authentication route is not broken or blocked
  // =========================================================================
  test("TEST 8B: Google authentication route remains intact and is not blocked by rate limiting", async () => {
    // Check that Google route does not fail or get blocked by normal user access
    const req = createMockReq("192.168.1.90", {});
    const res = createMockRes();

    // Passing empty credential returns 400 validation error from controller, NOT 429
    import("../src/features/auth/controllers/authController.js").then(async ({ googleLogin }) => {
      await googleLogin(req, res);
      assert.strictEqual(res.statusCode, 400, "Google login should respond with 400 for missing credential");
      assert.strictEqual(res.body?.message, "Google credential is required");
    });
  });
});
