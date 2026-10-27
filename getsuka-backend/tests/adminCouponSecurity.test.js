import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import express from "express";
import jwt from "jsonwebtoken";

import Coupon from "../src/features/coupon/models/Coupon.js";
import couponRoutes from "../src/features/coupon/routes/couponRoutes.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_coupon_security";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_super_secret_key";

describe("Phase 1 Step 2: Admin Coupon API Authorization Security Tests", () => {
  let server;
  let baseUrl;
  let activeCouponId;
  let inactiveCouponId;

  const createAdminToken = () => {
    return jwt.sign(
      {
        adminId: new mongoose.Types.ObjectId().toString(),
        email: "admin@getsuka.com",
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  };

  const createUserToken = () => {
    return jwt.sign(
      {
        userId: new mongoose.Types.ObjectId().toString(),
        email: "customer@getsuka.com",
        role: "user",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  };

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    // Start Express test server
    const app = express();
    app.use(express.json());
    app.use("/api/admin/coupons", couponRoutes);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api/admin/coupons`;
        resolve();
      });
    });

    // Create an initial active coupon
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    const activeCoupon = await Coupon.create({
      code: "WELCOME20",
      discountType: "percentage",
      discountValue: 20,
      minOrderAmount: 500,
      maxDiscountAmount: 200,
      validFrom,
      validUntil,
      usageLimit: 100,
      usedCount: 0,
      oneUsePerUser: true,
      isActive: true,
    });
    activeCouponId = activeCoupon._id.toString();

    // Create an inactive coupon
    const inactiveCoupon = await Coupon.create({
      code: "SECRETINACTIVE",
      discountType: "fixed",
      discountValue: 150,
      minOrderAmount: 300,
      validFrom,
      validUntil,
      usageLimit: 50,
      usedCount: 0,
      oneUsePerUser: true,
      isActive: false,
    });
    inactiveCouponId = inactiveCoupon._id.toString();
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================================
  // 1. UNAUTHENTICATED REQUESTS ARE BLOCKED ON ADMIN ENDPOINTS
  // =========================================================================

  test("TEST 1: Unauthenticated request cannot create coupon (POST /) -> 401", async () => {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "HACKED99",
        discountType: "percentage",
        discountValue: 99,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401, "Expected 401 for unauthenticated create");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /authorization token is required/i);
  });

  test("TEST 2: Unauthenticated request cannot update coupon (PUT /:id) -> 401", async () => {
    const res = await fetch(`${baseUrl}/${activeCouponId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        discountValue: 90,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401, "Expected 401 for unauthenticated update");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /authorization token is required/i);
  });

  test("TEST 3: Unauthenticated request cannot delete coupon (DELETE /:id) -> 401", async () => {
    const res = await fetch(`${baseUrl}/${activeCouponId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401, "Expected 401 for unauthenticated delete");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /authorization token is required/i);
  });

  test("TEST 4: Unauthenticated request cannot toggle coupon status (PATCH /:id/status) -> 401", async () => {
    const res = await fetch(`${baseUrl}/${activeCouponId}/status`, {
      method: "PATCH",
    });

    const data = await res.json();
    assert.strictEqual(res.status, 401, "Expected 401 for unauthenticated toggle status");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /authorization token is required/i);
  });

  test("TEST 5: Unauthenticated request cannot view admin coupon details (GET /:id) -> 401", async () => {
    const res = await fetch(`${baseUrl}/${activeCouponId}`);

    const data = await res.json();
    assert.strictEqual(res.status, 401, "Expected 401 for unauthenticated getById");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /authorization token is required/i);
  });

  test("TEST 6: Unauthenticated request cannot access admin coupon management list (GET /) -> 401", async () => {
    const res = await fetch(baseUrl);

    const data = await res.json();
    assert.strictEqual(res.status, 401, "Expected 401 for unauthenticated admin list");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /authorization token is required/i);
  });

  // =========================================================================
  // 2. AUTHENTICATED NON-ADMIN (USER ROLE) IS BLOCKED ON ADMIN ENDPOINTS
  // =========================================================================

  test("TEST 7: Non-admin customer cannot create coupon (POST /) -> 403", async () => {
    const token = createUserToken();
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        code: "USERCREATED",
        discountType: "percentage",
        discountValue: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403, "Expected 403 for non-admin user");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /admin access required/i);
  });

  test("TEST 8: Non-admin customer cannot update coupon (PUT /:id) -> 403", async () => {
    const token = createUserToken();
    const res = await fetch(`${baseUrl}/${activeCouponId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        discountValue: 80,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403, "Expected 403 for non-admin update");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /admin access required/i);
  });

  test("TEST 9: Non-admin customer cannot delete coupon (DELETE /:id) -> 403", async () => {
    const token = createUserToken();
    const res = await fetch(`${baseUrl}/${activeCouponId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403, "Expected 403 for non-admin delete");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /admin access required/i);
  });

  test("TEST 10: Non-admin customer cannot toggle coupon status (PATCH /:id/status) -> 403", async () => {
    const token = createUserToken();
    const res = await fetch(`${baseUrl}/${activeCouponId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403, "Expected 403 for non-admin toggle");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /admin access required/i);
  });

  test("TEST 11: Non-admin customer cannot view admin single coupon details (GET /:id) -> 403", async () => {
    const token = createUserToken();
    const res = await fetch(`${baseUrl}/${activeCouponId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403, "Expected 403 for non-admin getById");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /admin access required/i);
  });

  test("TEST 12: Non-admin customer cannot view admin coupon list (GET /) -> 403", async () => {
    const token = createUserToken();
    const res = await fetch(baseUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 403, "Expected 403 for non-admin list");
    assert.strictEqual(data.success, false);
    assert.match(data.message, /admin access required/i);
  });

  // =========================================================================
  // 3. AUTHORIZED ADMINS CAN PERFORM ALL COUPON OPERATIONS
  // =========================================================================

  test("TEST 13: Authorized admin can create a new coupon (POST /) -> 201", async () => {
    const adminToken = createAdminToken();
    const validFrom = new Date();
    const validUntil = new Date(Date.now() + 15 * 86400000);

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: "ADMINGIFT10",
        discountType: "percentage",
        discountValue: 10,
        minOrderAmount: 200,
        maxDiscountAmount: 100,
        validFrom,
        validUntil,
        usageLimit: 200,
        oneUsePerUser: true,
        isActive: true,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 201, "Expected 201 for admin create coupon");
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.coupon?.code, "ADMINGIFT10");
  });

  test("TEST 14: Authorized admin can list all coupons including inactive (GET /) -> 200", async () => {
    const adminToken = createAdminToken();
    const res = await fetch(`${baseUrl}?status=all`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.coupons));
    const codes = data.coupons.map((c) => c.code);
    assert.ok(codes.includes("WELCOME20"), "Admin should see active coupon");
    assert.ok(codes.includes("SECRETINACTIVE"), "Admin should see inactive coupon");
  });

  test("TEST 15: Authorized admin can view single coupon by ID (GET /:id) -> 200", async () => {
    const adminToken = createAdminToken();
    const res = await fetch(`${baseUrl}/${activeCouponId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.coupon?._id, activeCouponId);
    assert.strictEqual(data.coupon?.code, "WELCOME20");
  });

  test("TEST 16: Authorized admin can update coupon (PUT /:id) -> 200", async () => {
    const adminToken = createAdminToken();
    const res = await fetch(`${baseUrl}/${activeCouponId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: "WELCOME20",
        discountType: "percentage",
        discountValue: 20,
        minOrderAmount: 600,
        maxDiscountAmount: 200,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 86400000),
        usageLimit: 100,
        oneUsePerUser: true,
        isActive: true,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.coupon?.minOrderAmount, 600);
  });

  test("TEST 17: Authorized admin can toggle coupon status (PATCH /:id/status) -> 200", async () => {
    const adminToken = createAdminToken();
    // Toggle active coupon to inactive
    const res1 = await fetch(`${baseUrl}/${activeCouponId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const data1 = await res1.json();
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(data1.success, true);
    assert.strictEqual(data1.coupon?.isActive, false);

    // Toggle back to active
    const res2 = await fetch(`${baseUrl}/${activeCouponId}/status`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const data2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(data2.coupon?.isActive, true);
  });

  test("TEST 18: Authorized admin can delete coupon (DELETE /:id) -> 200", async () => {
    const adminToken = createAdminToken();
    // Create temporary coupon to delete
    const tempCoupon = await Coupon.create({
      code: "TEMPDELETE",
      discountType: "fixed",
      discountValue: 50,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 86400000),
      isActive: true,
    });

    const res = await fetch(`${baseUrl}/${tempCoupon._id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);

    // Confirm it's gone
    const check = await Coupon.findById(tempCoupon._id);
    assert.strictEqual(check, null);
  });

  // =========================================================================
  // 4. PUBLIC COUPON VALIDATION (POST /validate) FOR CUSTOMER CHECKOUT
  // =========================================================================

  test("TEST 19: Unauthenticated customer can validate active coupon (POST /validate) -> 200", async () => {
    const res = await fetch(`${baseUrl}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "WELCOME20",
        orderAmount: 1000,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200, "Expected 200 for public coupon validation");
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.coupon?.code, "WELCOME20");
    // 20% of 1000 is 200, max discount is 200 -> discount is 200
    assert.strictEqual(data.discountAmount, 200);
    assert.strictEqual(data.finalAmount, 800);
  });

  test("TEST 20: Public coupon validation rejects inactive coupon (POST /validate) -> 400", async () => {
    const res = await fetch(`${baseUrl}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "SECRETINACTIVE",
        orderAmount: 1000,
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.message, /inactive/i);
  });

  test("TEST 21: Public coupon validation rejects below minimum order amount -> 400", async () => {
    const res = await fetch(`${baseUrl}/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: "WELCOME20",
        orderAmount: 100, // minOrderAmount is 600 from TEST 16
      }),
    });

    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.match(data.message, /minimum order amount/i);
  });

  // =========================================================================
  // 5. PUBLIC AVAILABLE COUPONS (GET /available) FOR CUSTOMER CHECKOUT MODAL
  // =========================================================================

  test("TEST 22: Unauthenticated customer can fetch active available coupons (GET /available) -> 200", async () => {
    const res = await fetch(`${baseUrl}/available`);

    const data = await res.json();
    assert.strictEqual(res.status, 200, "Expected 200 for public available coupons");
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.coupons));

    const codes = data.coupons.map((c) => c.code);
    assert.ok(codes.includes("WELCOME20"), "Must include active valid coupon");
    assert.ok(!codes.includes("SECRETINACTIVE"), "Must NEVER include inactive coupon");

    // Verify all returned coupons are active
    for (const c of data.coupons) {
      assert.strictEqual(c.isActive, true, "All returned coupons must be active");
    }
  });

  test("TEST 23: Authenticated non-admin customer can also fetch active coupons (GET /available) -> 200", async () => {
    const userToken = createUserToken();
    const res = await fetch(`${baseUrl}/available`, {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    });

    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.coupons));
    const codes = data.coupons.map((c) => c.code);
    assert.ok(codes.includes("WELCOME20"));
    assert.ok(!codes.includes("SECRETINACTIVE"));
  });
});
