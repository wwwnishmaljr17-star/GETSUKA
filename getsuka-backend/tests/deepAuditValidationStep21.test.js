import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";

import User from "../src/features/auth/models/User.js";
import Category from "../src/features/category/models/Category.js";
import Address from "../src/features/address/models/Address.js";

import { registerSchema } from "../src/validations/authValidation.js";
import { updateUserProfile } from "../src/features/profile/controllers/userProfileController.js";
import { addAddress, updateAddress } from "../src/features/address/controllers/addressController.js";
import { addCategory } from "../src/features/category/controllers/categoryController.js";
import { verifyOtp, resetPassword } from "../src/features/auth/controllers/authController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_deep_audit_step21";
const JWT_SECRET = process.env.JWT_SECRET || "deep_audit_test_secret_123";

describe("Deep Audit Step 21 — Input Validation, Unicode, Boundaries & Edge Cases", () => {
  let server;
  let baseUrl;
  let testUser;
  let userToken;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    testUser = await User.create({
      fullName: "Tanjiro Kamado",
      email: "tanjiro@getsuka.com",
      password: "HashedPassword123!",
      role: "user",
      isVerified: true,
      isBlocked: false,
    });

    userToken = jwt.sign(
      { userId: testUser._id.toString(), email: testUser.email, role: "user" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const app = express();
    app.use(express.json());

    // Middleware to simulate auth
    const authenticate = (req, res, next) => {
      req.user = { userId: testUser._id.toString(), role: "user" };
      next();
    };

    // Routes
    app.post("/api/auth/register-check", (req, res) => {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.flatten().fieldErrors,
        });
      }
      res.status(200).json({ success: true, message: "Valid registration data" });
    });

    app.put("/api/user/profile", authenticate, updateUserProfile);
    app.post("/api/user/address", authenticate, addAddress);
    app.put("/api/user/address/:id", authenticate, updateAddress);
    app.post("/api/admin/categories", authenticate, addCategory);
    app.post("/api/auth/verify-otp", verifyOtp);
    app.post("/api/auth/reset-password", resetPassword);

    // Global error handler
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error",
      });
    });

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // ==========================================================
  // 1. REGISTRATION INPUT BOUNDARIES & UNICODE
  // ==========================================================
  describe("Registration Validation Rules", () => {
    test("Accepts valid Unicode names (French, Nordic, Portuguese, Japanese romaji/apostrophe)", async () => {
      const validNames = [
        "René Descartes",
        "Søren Kierkegaard",
        "João da Silva",
        "D'Angelo Russell",
        "Jean-Luc Picard",
      ];

      for (const fullName of validNames) {
        const res = await fetch(`${baseUrl}/api/auth/register-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email: "valid.user@getsuka.com",
            password: "StrongPassword123!",
            confirmPassword: "StrongPassword123!",
          }),
        });

        const data = await res.json();
        assert.strictEqual(
          res.status,
          200,
          `Failed for valid Unicode name '${fullName}': ${data.message}`
        );
        assert.strictEqual(data.success, true);
      }
    });

    test("Rejects names with digits or invalid symbols", async () => {
      const invalidNames = [
        "Kenji 99",
        "User<script>",
        "Name@Symbol",
        "   ",
        "A", // Too short (< 3)
        "A".repeat(51), // Too long (> 50)
      ];

      for (const fullName of invalidNames) {
        const res = await fetch(`${baseUrl}/api/auth/register-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email: "valid.user@getsuka.com",
            password: "StrongPassword123!",
            confirmPassword: "StrongPassword123!",
          }),
        });

        assert.strictEqual(
          res.status,
          400,
          `Should have rejected invalid name: '${fullName}'`
        );
      }
    });

    test("Rejects email exceeding 100 characters", async () => {
      const longEmail = "a".repeat(95) + "@test.com";
      const res = await fetch(`${baseUrl}/api/auth/register-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Valid Name",
          email: longEmail,
          password: "StrongPassword123!",
          confirmPassword: "StrongPassword123!",
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.errors?.email?.some((msg) => /100 characters/i.test(msg)));
    });

    test("Rejects password exceeding 128 characters", async () => {
      const longPass = "Aa1!" + "x".repeat(126);
      const res = await fetch(`${baseUrl}/api/auth/register-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Valid Name",
          email: "valid@getsuka.com",
          password: longPass,
          confirmPassword: longPass,
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
      assert.ok(data.errors?.password?.some((msg) => /128 characters/i.test(msg)));
    });
  });

  // ==========================================================
  // 2. USER PROFILE VALIDATIONS (Unicode & Future DOB)
  // ==========================================================
  describe("User Profile Validation Rules", () => {
    test("Accepts Unicode names in profile update", async () => {
      const res = await fetch(`${baseUrl}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fullName: "Giyu Tomioka-san",
          email: "tanjiro@getsuka.com",
          phone: "9876543210",
        }),
      });

      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
    });

    test("Rejects profile update with invalid name symbols", async () => {
      const res = await fetch(`${baseUrl}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fullName: "Invalid123!",
          email: "tanjiro@getsuka.com",
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.success, false);
    });

    test("Rejects profile update with future date of birth", async () => {
      const futureDate = new Date(Date.now() + 86400000 * 365).toISOString().split("T")[0];
      const res = await fetch(`${baseUrl}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fullName: "Valid Name",
          email: "tanjiro@getsuka.com",
          dateOfBirth: futureDate,
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /future/i);
    });
  });

  // ==========================================================
  // 3. ADDRESS RECIPIENT NAME BOUNDARIES
  // ==========================================================
  describe("Address Validation Rules", () => {
    test("Accepts valid recipient name and creates address", async () => {
      const res = await fetch(`${baseUrl}/api/user/address`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fullName: "Inosuke Hashibira",
          phone: "9876543210",
          pincode: "560001",
          addressLine: "Boar Cave 42",
          city: "Bengaluru",
          state: "Karnataka",
          addressType: "home",
        }),
      });

      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);
    });

    test("Rejects address recipient name with digits", async () => {
      const res = await fetch(`${baseUrl}/api/user/address`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          fullName: "Inosuke 999",
          phone: "9876543210",
          pincode: "560001",
          addressLine: "Boar Cave 42",
          city: "Bengaluru",
          state: "Karnataka",
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /letters/i);
    });
  });

  // ==========================================================
  // 4. CATEGORY REGEX METASYMBOL SAFETY
  // ==========================================================
  describe("Category Metasymbol and Boundary Validation", () => {
    test("Handles category names containing regex metacharacters without server crash", async () => {
      const categoryName = "Anime (Limited + Exclusive Edition)";
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: categoryName,
          description: "Special collection for limited series",
        }),
      });

      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);

      // Verify duplicate check handles parentheses safely
      const dupRes = await fetch(`${baseUrl}/api/admin/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          name: categoryName,
          description: "Duplicate attempt",
        }),
      });

      assert.strictEqual(dupRes.status, 409);
      const dupData = await dupRes.json();
      assert.strictEqual(dupData.success, false);
      assert.match(dupData.message, /already exists/i);
    });
  });

  // ==========================================================
  // 5. OTP FORMAT & WHITESPACE TRIMMING
  // ==========================================================
  describe("OTP Validation and Boundary Rules", () => {
    test("Rejects malformed or alphabetic OTPs", async () => {
      const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "tanjiro@getsuka.com",
          otp: "ABC123",
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.message, /Invalid OTP format/i);
    });

    test("Rejects short or long OTPs", async () => {
      for (const invalidOtp of ["123", "1234567", "12 34"]) {
        const res = await fetch(`${baseUrl}/api/auth/verify-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "tanjiro@getsuka.com",
            otp: invalidOtp,
          }),
        });

        assert.strictEqual(res.status, 400);
        const data = await res.json();
        assert.match(data.message, /Invalid OTP format/i);
      }
    });
  });
});
