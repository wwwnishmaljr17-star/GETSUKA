import { test, before, after, beforeEach, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import Admin from "../src/features/admin/models/Admin.js";
import { bootstrapInitialAdmin } from "../src/features/admin/utils/bootstrapAdmin.js";
import { adminLogin } from "../src/features/admin/controllers/adminAuthController.js";
import adminAuthMiddleware from "../src/middlewares/adminAuthMiddleware.js";
import { validateEnvironment } from "../src/config/envValidation.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_get003_admin_credentials";
const JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_get003_secure_12345";
process.env.JWT_SECRET = JWT_SECRET;

const createMockRes = () => {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
    },
    set(name, val) {
      this.headers[name] = val;
    },
  };
};

describe("GET-003: Hardcoded Default Admin Credentials Remediation Verification", () => {
  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    await Admin.deleteMany({});
    delete process.env.INITIAL_ADMIN_EMAIL;
    delete process.env.INITIAL_ADMIN_PASSWORD;
    delete process.env.INITIAL_ADMIN_NAME;
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
  });

  // =========================================================================
  // TEST 1: STATIC SOURCE CODE AUDIT
  // =========================================================================
  test("TEST 1: Server and utility source files do not contain hardcoded default passwords", () => {
    const serverPath = path.resolve("src/server.js");
    const createAdminPath = path.resolve("src/utils/createAdmin.js");

    const serverContent = fs.readFileSync(serverPath, "utf-8");
    const createAdminContent = fs.readFileSync(createAdminPath, "utf-8");

    // Assert that the vulnerable hardcoded password is no longer present in source
    assert.strictEqual(
      serverContent.includes("Admin@12345"),
      false,
      "server.js must not contain hardcoded 'Admin@12345'"
    );

    assert.strictEqual(
      createAdminContent.includes("Admin@12345"),
      false,
      "createAdmin.js must not contain hardcoded 'Admin@12345'"
    );

    // Assert that hardcoded admin@getsuka.com fallback is removed from bootstrap logic
    assert.strictEqual(
      serverContent.includes('const defaultEmail = "admin@getsuka.com"'),
      false,
      "server.js must not have hardcoded default email assignment"
    );
  });

  // =========================================================================
  // TEST 2: MISSING BOOTSTRAP CONFIGURATION HANDLED SAFELY
  // =========================================================================
  test("TEST 2: Missing bootstrap configuration is handled safely without creating insecure accounts", async () => {
    // Neither INITIAL_ADMIN_EMAIL nor INITIAL_ADMIN_PASSWORD is set
    await bootstrapInitialAdmin();

    const count = await Admin.countDocuments();
    assert.strictEqual(count, 0, "No admin should be created when environment variables are omitted");
  });

  // =========================================================================
  // TEST 3: INSECURE / DEFAULT PASSWORDS REJECTED
  // =========================================================================
  test("TEST 3: Insecure default passwords and passwords under 10 chars are rejected by bootstrap", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "superadmin@getsuka.com";
    process.env.INITIAL_ADMIN_PASSWORD = "Admin@12345"; // Disallowed default

    await bootstrapInitialAdmin();

    let count = await Admin.countDocuments();
    assert.strictEqual(count, 0, "Default password 'Admin@12345' must be rejected");

    // Too short password
    process.env.INITIAL_ADMIN_PASSWORD = "Short9!";
    await bootstrapInitialAdmin();

    count = await Admin.countDocuments();
    assert.strictEqual(count, 0, "Passwords under 10 characters must be rejected");
  });

  // =========================================================================
  // TEST 4: MALFORMED EMAIL FORMAT REJECTED
  // =========================================================================
  test("TEST 4: Malformed email address is rejected by bootstrap", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "not-an-email";
    process.env.INITIAL_ADMIN_PASSWORD = "ValidStrongPassword123#";

    await bootstrapInitialAdmin();

    const count = await Admin.countDocuments();
    assert.strictEqual(count, 0, "Invalid email must not be inserted into database");
  });

  // =========================================================================
  // TEST 5: CONTROLLED BOOTSTRAP WITH VALID ENVIRONMENT CREDENTIALS
  // =========================================================================
  test("TEST 5: Valid environment variables bootstrap admin once with securely hashed password", async () => {
    process.env.INITIAL_ADMIN_EMAIL = "chief.officer@getsuka.com";
    process.env.INITIAL_ADMIN_PASSWORD = "StrongSecurePassword2026!";
    process.env.INITIAL_ADMIN_NAME = "Chief Security Officer";

    await bootstrapInitialAdmin();

    const count = await Admin.countDocuments();
    assert.strictEqual(count, 1, "Exactly one admin should be created");

    const createdAdmin = await Admin.findOne({ email: "chief.officer@getsuka.com" }).select("+password");
    assert.ok(createdAdmin, "Admin document must exist in database");
    assert.strictEqual(createdAdmin.fullName, "Chief Security Officer");
    assert.strictEqual(createdAdmin.email, "chief.officer@getsuka.com");
    assert.strictEqual(createdAdmin.role, "admin");
    assert.strictEqual(createdAdmin.isBlocked, false);

    // Verify password is NOT stored in plaintext
    assert.notStrictEqual(createdAdmin.password, "StrongSecurePassword2026!");
    assert.ok(createdAdmin.password.startsWith("$2"), "Password must be a valid bcrypt hash");

    // Verify bcrypt hash matches the password
    const isMatch = await bcrypt.compare("StrongSecurePassword2026!", createdAdmin.password);
    assert.strictEqual(isMatch, true, "Bcrypt hash must match the supplied password");
  });

  // =========================================================================
  // TEST 6: PRESERVE EXISTING ADMINISTRATORS (NO RESET ON RESTART)
  // =========================================================================
  test("TEST 6: Existing administrators are NOT overwritten or reset on application restart", async () => {
    // 1. Create an existing admin with an existing password
    const originalPasswordHash = await bcrypt.hash("OriginalAdminPass999#", 10);
    const existing = await Admin.create({
      fullName: "Pre-existing Admin",
      email: "existing.admin@getsuka.com",
      password: originalPasswordHash,
      role: "admin",
      isBlocked: false,
    });

    // 2. Configure new environment variables and simulate server restart
    process.env.INITIAL_ADMIN_EMAIL = "new.admin@getsuka.com";
    process.env.INITIAL_ADMIN_PASSWORD = "DifferentPassword123#";

    await bootstrapInitialAdmin();

    // 3. Verify no new admin was created because admins already exist
    const count = await Admin.countDocuments();
    assert.strictEqual(count, 1, "Admin count must remain 1 (no unwanted extra accounts)");

    // 4. Verify existing admin's password was completely untouched
    const reloaded = await Admin.findById(existing._id).select("+password");
    assert.strictEqual(reloaded.password, originalPasswordHash, "Existing admin password hash must not be mutated");

    const canLogin = await bcrypt.compare("OriginalAdminPass999#", reloaded.password);
    assert.strictEqual(canLogin, true, "Original password must continue to authenticate");
  });

  // =========================================================================
  // TEST 7: NO PUBLIC ADMIN CREATION ENDPOINT
  // =========================================================================
  test("TEST 7: No public endpoint exists allowing unauthorized users to create administrators", () => {
    const adminAuthRoutesPath = path.resolve("src/features/admin/routes/adminAuthRoutes.js");
    const routesContent = fs.readFileSync(adminAuthRoutesPath, "utf-8");

    assert.strictEqual(
      routesContent.includes("/register"),
      false,
      "adminAuthRoutes.js must not expose a public registration endpoint"
    );

    assert.strictEqual(
      routesContent.includes("/signup"),
      false,
      "adminAuthRoutes.js must not expose an admin signup endpoint"
    );
  });

  // =========================================================================
  // TEST 8: ADMIN AUTHENTICATION CONTINUES WORKING
  // =========================================================================
  test("TEST 8: Admin authentication continues working with secure credentials and rejects invalid ones", async () => {
    const strongPassword = "ValidAdminPassword2026#";
    const passwordHash = await bcrypt.hash(strongPassword, 10);
    await Admin.create({
      fullName: "Auth Test Admin",
      email: "auth.test@getsuka.com",
      password: passwordHash,
      role: "admin",
      isBlocked: false,
    });

    // A. Valid credentials
    const validReq = {
      body: {
        email: "auth.test@getsuka.com",
        password: strongPassword,
      },
    };
    const validRes = createMockRes();
    await adminLogin(validReq, validRes);

    assert.strictEqual(validRes.statusCode, 200);
    assert.strictEqual(validRes.body.success, true);
    assert.ok(validRes.body.token);
    assert.strictEqual(validRes.body.admin.email, "auth.test@getsuka.com");

    // B. Invalid credentials
    const invalidReq = {
      body: {
        email: "auth.test@getsuka.com",
        password: "WrongPassword123#",
      },
    };
    const invalidRes = createMockRes();
    await adminLogin(invalidReq, invalidRes);

    assert.strictEqual(invalidRes.statusCode, 401);
    assert.strictEqual(invalidRes.body.success, false);
    assert.strictEqual(invalidRes.body.message, "Invalid email or password");
  });

  // =========================================================================
  // TEST 9: ADMIN AUTHORIZATION MIDDLEWARE CONTINUES WORKING
  // =========================================================================
  test("TEST 9: Admin authorization middleware enforces admin role and rejects customers", async () => {
    const adminToken = jwt.sign(
      { adminId: new mongoose.Types.ObjectId(), email: "admin@test.com", role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const userToken = jwt.sign(
      { userId: new mongoose.Types.ObjectId(), email: "customer@test.com", role: "customer" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 1. Valid admin token
    let passedNext = false;
    const reqAdmin = { headers: { authorization: `Bearer ${adminToken}` } };
    const resAdmin = createMockRes();
    adminAuthMiddleware(reqAdmin, resAdmin, () => {
      passedNext = true;
    });
    assert.strictEqual(passedNext, true);
    assert.strictEqual(reqAdmin.admin.role, "admin");

    // 2. Regular customer token
    const reqCustomer = { headers: { authorization: `Bearer ${userToken}` } };
    const resCustomer = createMockRes();
    adminAuthMiddleware(reqCustomer, resCustomer, () => {
      assert.fail("Customer token should not pass admin middleware");
    });
    assert.strictEqual(resCustomer.statusCode, 403);
    assert.match(resCustomer.body.message, /Admin access required/i);

    // 3. Missing token
    const reqNoToken = { headers: {} };
    const resNoToken = createMockRes();
    adminAuthMiddleware(reqNoToken, resNoToken, () => {
      assert.fail("Missing token should not pass admin middleware");
    });
    assert.strictEqual(resNoToken.statusCode, 401);
  });

  // =========================================================================
  // TEST 10: ENVIRONMENT VALIDATION GUARDS IN PRODUCTION
  // =========================================================================
  test("TEST 10: Environment validation flags weak or default bootstrap passwords in production mode", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalExit = process.exit;
    let exitCalledWith = null;
    process.exit = (code) => {
      exitCalledWith = code;
    };

    try {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "production_super_secret_jwt_key_32chars_long";
      process.env.MONGO_URI = "mongodb://localhost:27017/test";
      process.env.INITIAL_ADMIN_PASSWORD = "Admin@12345"; // Insecure default

      const result = validateEnvironment();
      assert.strictEqual(result.valid, false);
      assert.strictEqual(exitCalledWith, 1);
      assert.ok(
        result.missing.some((m) => m.includes("INITIAL_ADMIN_PASSWORD")),
        "Production validation must flag insecure default admin passwords"
      );
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      process.exit = originalExit;
    }
  });
});
