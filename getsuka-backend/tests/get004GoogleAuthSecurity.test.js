import { test, before, after, beforeEach, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

import User from "../src/features/auth/models/User.js";
import {
  googleLogin,
  loginUser,
  forgotPassword,
  resetPassword,
} from "../src/features/auth/controllers/authController.js";
import {
  changePassword,
  sendEmailChangeOtp,
  verifyEmailChangeOtp,
} from "../src/features/profile/controllers/userProfileController.js";
import { validateEnvironment } from "../src/config/envValidation.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_get004_google_auth";
const TEST_JWT_SECRET = "test_jwt_secret_get004_super_secure_32chars";
const TEST_GOOGLE_CLIENT_ID = "10351951726-testclientid.apps.googleusercontent.com";

process.env.JWT_SECRET = TEST_JWT_SECRET;
process.env.GOOGLE_CLIENT_ID = TEST_GOOGLE_CLIENT_ID;

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

describe("GET-004: Google Authentication Security Verification Suite", () => {
  let counter = 0;

  before(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(TEST_DB_URI);
    await User.deleteMany({ email: /get004/ });
  });

  after(async () => {
    try {
      await User.deleteMany({ email: /get004/ });
      await mongoose.disconnect();
    } catch {}
  });

  // =========================================================================
  // TEST 1: Missing credential returns 400 Bad Request
  // =========================================================================
  test("TEST 1: Missing or blank credential parameter returns 400 Bad Request", async () => {
    const reqEmpty = { body: {} };
    const resEmpty = createMockRes();
    await googleLogin(reqEmpty, resEmpty);
    assert.strictEqual(resEmpty.statusCode, 400);
    assert.strictEqual(resEmpty.body?.message, "Google credential is required");

    const reqBlank = { body: { credential: "   " } };
    const resBlank = createMockRes();
    await googleLogin(reqBlank, resBlank);
    assert.strictEqual(resBlank.statusCode, 400);
    assert.strictEqual(resBlank.body?.message, "Google credential is required");
  });

  // =========================================================================
  // TEST 2: Missing server configuration fails safely with 500
  // =========================================================================
  test("TEST 2: Missing GOOGLE_CLIENT_ID on server returns 500 safely without crashing", async () => {
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    try {
      delete process.env.GOOGLE_CLIENT_ID;
      const req = { body: { credential: "some_id_token" } };
      const res = createMockRes();
      await googleLogin(req, res);
      assert.strictEqual(res.statusCode, 500);
      assert.match(res.body?.message, /not configured/i);
    } finally {
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    }
  });

  // =========================================================================
  // TEST 3: Invalid token signature rejected with 401
  // =========================================================================
  test("TEST 3: Token that fails Google signature verification returns 401 Unauthorized", async () => {
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => {
      throw new Error("Invalid token signature");
    };

    try {
      const req = { body: { credential: "forged_or_invalid_jwt_token" } };
      const res = createMockRes();
      await googleLogin(req, res);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.body?.message, "Invalid or expired Google token");
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 4: Expired token rejected with 401
  // =========================================================================
  test("TEST 4: Expired Google token is rejected with 401 Unauthorized", async () => {
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "gid_expired_123",
        email: "expired.user.get004@example.com",
        name: "Expired User",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
      }),
    });

    try {
      const req = { body: { credential: "expired_jwt_token" } };
      const res = createMockRes();
      await googleLogin(req, res);
      assert.strictEqual(res.statusCode, 401);
      assert.match(res.body?.message, /expired/i);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 5: Audience mismatch rejected with 401
  // =========================================================================
  test("TEST 5: Token issued for another application (audience mismatch) is rejected with 401", async () => {
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "gid_attacker_app_123",
        email: "attacker.user.get004@example.com",
        name: "Attacker App User",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: "some_other_application_client_id.apps.googleusercontent.com", // Wrong audience
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    try {
      const req = { body: { credential: "token_for_other_app" } };
      const res = createMockRes();
      await googleLogin(req, res);
      assert.strictEqual(res.statusCode, 401);
      assert.match(res.body?.message, /audience mismatch/i);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 6: Invalid token issuer rejected with 401
  // =========================================================================
  test("TEST 6: Token with invalid issuer is rejected with 401", async () => {
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "gid_fake_iss_123",
        email: "fake.iss.get004@example.com",
        name: "Fake Issuer User",
        email_verified: true,
        iss: "https://evil-untrusted-issuer.com",
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    try {
      const req = { body: { credential: "token_from_evil_issuer" } };
      const res = createMockRes();
      await googleLogin(req, res);
      assert.strictEqual(res.statusCode, 401);
      assert.match(res.body?.message, /invalid token issuer/i);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 7: Unverified Google email rejected with 400
  // =========================================================================
  test("TEST 7: Token with email_verified = false is rejected with 400", async () => {
    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: "gid_unverified_123",
        email: "unverified.get004@example.com",
        name: "Unverified User",
        email_verified: false,
        iss: "https://accounts.google.com",
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    try {
      const req = { body: { credential: "unverified_email_token" } };
      const res = createMockRes();
      await googleLogin(req, res);
      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body?.message, /could not be verified/i);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 8: Valid Google login creates new user WITHOUT dummy/plaintext password
  // =========================================================================
  test("TEST 8: Valid Google sign-in creates account WITHOUT dummy, predictable, or plaintext password", async () => {
    counter++;
    const googleEmail = `new.user.get004.${counter}@example.com`;
    const googleId = `gid_sub_${counter}_98765`;

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: googleId,
        email: googleEmail,
        name: "Valid Anime Fan",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    try {
      const req = { body: { credential: "valid_id_token_xyz" } };
      const res = createMockRes();
      await googleLogin(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body?.success, true);
      assert.strictEqual(res.body?.user?.email, googleEmail);
      assert.strictEqual(res.body?.user?.authProvider, "google");
      assert.ok(res.body?.token, "JWT must be returned");

      // Verify JWT claims
      const decoded = jwt.verify(res.body.token, TEST_JWT_SECRET);
      assert.strictEqual(decoded.email, googleEmail);
      assert.strictEqual(decoded.role, "user");

      // Check database record directly
      const dbUser = await User.findOne({ email: googleEmail }).select("+password");
      assert.ok(dbUser);
      assert.strictEqual(dbUser.authProvider, "google");
      assert.strictEqual(dbUser.googleId, googleId);
      assert.strictEqual(dbUser.isVerified, true);

      // Verify NO dummy or predictable password was saved
      assert.notStrictEqual(dbUser.password, `google_${googleId}`, "Must NOT contain predictable dummy password");
      assert.strictEqual(dbUser.password, undefined, "Google account password should be empty/undefined");
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 9: Blocked Google user is rejected with 403 Forbidden
  // =========================================================================
  test("TEST 9: Blocked Google account is rejected with 403 Forbidden", async () => {
    counter++;
    const googleEmail = `blocked.get004.${counter}@example.com`;
    const googleId = `gid_blocked_${counter}`;

    await User.create({
      fullName: "Blocked User",
      email: googleEmail,
      authProvider: "google",
      googleId,
      isVerified: true,
      isBlocked: true,
    });

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: googleId,
        email: googleEmail,
        name: "Blocked User",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    try {
      const req = { body: { credential: "blocked_user_token" } };
      const res = createMockRes();
      await googleLogin(req, res);
      assert.strictEqual(res.statusCode, 403);
      assert.match(res.body?.message, /blocked/i);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 10: Existing local account securely links Google and preserves password login
  // =========================================================================
  test("TEST 10: Existing local password user securely links Google ID and preserves password login", async () => {
    counter++;
    const userEmail = `local.link.get004.${counter}@example.com`;
    const userPlainPassword = "MyStrongPassword123!";
    const hashedPassword = await bcrypt.hash(userPlainPassword, 10);
    const googleId = `gid_linked_${counter}`;

    const localUser = await User.create({
      fullName: "Local User Linking Google",
      email: userEmail,
      password: hashedPassword,
      authProvider: "local",
      googleId: "",
      isVerified: false, // Initially unverified before Google verification
    });

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: googleId,
        email: userEmail,
        name: "Local User Linking Google",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    try {
      // 1. Log in via Google
      const reqGoogle = { body: { credential: "link_google_token" } };
      const resGoogle = createMockRes();
      await googleLogin(reqGoogle, resGoogle);

      assert.strictEqual(resGoogle.statusCode, 200);
      assert.strictEqual(resGoogle.body?.success, true);
      assert.ok(resGoogle.body?.token);

      // Check DB: googleId linked, isVerified set to true, authProvider preserved as local
      const updatedUser = await User.findById(localUser._id).select("+password");
      assert.strictEqual(updatedUser.googleId, googleId);
      assert.strictEqual(updatedUser.isVerified, true);
      assert.strictEqual(updatedUser.authProvider, "local");
      assert.strictEqual(updatedUser.password, hashedPassword, "Password hash must remain untouched");

      // 2. Log in via standard email/password endpoint
      const reqPassword = { body: { email: userEmail, password: userPlainPassword } };
      const resPassword = createMockRes();
      await loginUser(reqPassword, resPassword);

      assert.strictEqual(resPassword.statusCode, 200);
      assert.strictEqual(resPassword.body?.success, true);
      assert.ok(resPassword.body?.token);

      // 3. Wrong password still rejected with 401
      const reqWrongPass = { body: { email: userEmail, password: "WrongPassword999!" } };
      const resWrongPass = createMockRes();
      await loginUser(reqWrongPass, resWrongPass);
      assert.strictEqual(resWrongPass.statusCode, 401);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 11: Google login rejected if account is linked to a different Google ID
  // =========================================================================
  test("TEST 11: Google sign-in rejected with 409 if account is already linked to a different Google ID", async () => {
    counter++;
    const email = `mismatch.google.get004.${counter}@example.com`;
    const originalGoogleId = `gid_original_${counter}`;
    const conflictingGoogleId = `gid_different_${counter}`;

    await User.create({
      fullName: "Already Linked User",
      email,
      authProvider: "local",
      googleId: originalGoogleId,
      isVerified: true,
      password: await bcrypt.hash("Password123!", 10),
    });

    const originalVerify = OAuth2Client.prototype.verifyIdToken;
    OAuth2Client.prototype.verifyIdToken = async () => ({
      getPayload: () => ({
        sub: conflictingGoogleId,
        email,
        name: "Conflicting Google User",
        email_verified: true,
        iss: "https://accounts.google.com",
        aud: process.env.GOOGLE_CLIENT_ID,
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    });

    try {
      const req = { body: { credential: "conflicting_token" } };
      const res = createMockRes();
      await googleLogin(req, res);
      assert.strictEqual(res.statusCode, 409);
      assert.match(res.body?.message, /already linked to a different Google identity/i);
    } finally {
      OAuth2Client.prototype.verifyIdToken = originalVerify;
    }
  });

  // =========================================================================
  // TEST 12: Google-only user cannot authenticate via password endpoint
  // =========================================================================
  test("TEST 12: Google-only account cannot authenticate via password endpoint (401 + Google login message)", async () => {
    counter++;
    const googleEmail = `google.only.get004.${counter}@example.com`;

    await User.create({
      fullName: "Google Only User",
      email: googleEmail,
      authProvider: "google",
      googleId: `gid_${counter}`,
      isVerified: true,
    });

    const req = { body: { email: googleEmail, password: "AnyAttemptedPassword123!" } };
    const res = createMockRes();
    await loginUser(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body?.message, /Google login/i);
  });

  // =========================================================================
  // TEST 13: Google-only user cannot reset or change password
  // =========================================================================
  test("TEST 13: Google-only user cannot reset or change password via password APIs", async () => {
    counter++;
    const googleEmail = `google.pwd.get004.${counter}@example.com`;

    const user = await User.create({
      fullName: "Google Password Protected User",
      email: googleEmail,
      authProvider: "google",
      googleId: `gid_pwd_${counter}`,
      isVerified: true,
    });

    // 1. forgotPassword API rejected
    const reqForgot = { body: { email: googleEmail } };
    const resForgot = createMockRes();
    await forgotPassword(reqForgot, resForgot);
    assert.strictEqual(resForgot.statusCode, 400);
    assert.match(resForgot.body?.message, /Google login/i);

    // 2. changePassword API rejected
    const reqChange = {
      user: { userId: user._id.toString() },
      body: { currentPassword: "OldPassword1!", newPassword: "NewPassword2!", confirmPassword: "NewPassword2!" },
    };
    const resChange = createMockRes();
    await changePassword(reqChange, resChange);
    assert.strictEqual(resChange.statusCode, 400);
    assert.match(resChange.body?.message, /Google login accounts cannot change their password/i);
  });

  // =========================================================================
  // TEST 14: Google-only user cannot change email address away from Google identity
  // =========================================================================
  test("TEST 14: Google-only user cannot change email address via profile email OTP endpoints", async () => {
    counter++;
    const googleEmail = `google.email.get004.${counter}@example.com`;

    const user = await User.create({
      fullName: "Google Email Protected User",
      email: googleEmail,
      authProvider: "google",
      googleId: `gid_email_${counter}`,
      isVerified: true,
    });

    // 1. sendEmailChangeOtp rejected
    const reqSend = {
      user: { userId: user._id.toString() },
      body: { newEmail: "new.target.email@example.com" },
    };
    const resSend = createMockRes();
    await sendEmailChangeOtp(reqSend, resSend);
    assert.strictEqual(resSend.statusCode, 400);
    assert.match(resSend.body?.message, /Google login accounts cannot change their email address/i);

    // 2. verifyEmailChangeOtp rejected
    const reqVerify = {
      user: { userId: user._id.toString() },
      body: { otp: "123456" },
    };
    const resVerify = createMockRes();
    await verifyEmailChangeOtp(reqVerify, resVerify);
    assert.strictEqual(resVerify.statusCode, 400);
    assert.match(resVerify.body?.message, /Google login accounts cannot change their email address/i);
  });
});
