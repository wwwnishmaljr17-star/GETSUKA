import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import Order from "../src/features/order/models/Order.js";
import User from "../src/features/auth/models/User.js";
import Category from "../src/features/category/models/Category.js";
import Product from "../src/features/product/models/Product.js";

import { getAdminReturns } from "../src/features/order/controllers/orderController.js";
import { getAdminReturns as getAdminReturnsFromReturnController } from "../src/features/order/controllers/returnController.js";
import adminAuthMiddleware from "../src/middlewares/adminAuthMiddleware.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_admin_returns";
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

describe("Admin Returns Implementation & Consolidation Tests (Step 9)", () => {
  let user;
  let category;
  let product;
  let createdOrders = [];

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    user = await User.create({
      fullName: "Return Customer",
      email: `customer_${Date.now()}@example.com`,
      password: "hashedpassword123",
      isVerified: true,
      referralCode: `GETSUKA-RET-${Date.now()}`,
    });

    category = await Category.create({
      name: "Return Test Anime",
      isDeleted: false,
    });

    product = await Product.create({
      name: "Demon Slayer Katana Replica",
      description: "Replica Sword",
      category: category._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 2500,
      variants: [
        {
          color: "Steel",
          size: "Standard",
          sku: `SWORD-${Date.now()}`,
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    // Helper to seed test orders
    const seedOrder = async (orderNumber, returnStatus, returnReason, requestedAtOffsetHours = 0) => {
      const requestedDate = returnStatus !== "none"
        ? new Date(Date.now() - requestedAtOffsetHours * 3600 * 1000)
        : null;

      const order = await Order.create({
        userId: user._id,
        orderNumber,
        items: [
          {
            productId: product._id,
            variantId: product.variants[0]._id,
            productName: product.name,
            sku: product.variants[0].sku,
            quantity: 1,
            price: 2500,
            totalPrice: 2500,
            itemStatus: "active",
          },
        ],
        shippingAddress: {
          addressId: new mongoose.Types.ObjectId(),
          fullName: "Tanjiro Kamado",
          phone: "9876543210",
          addressLine: "Mountain Village",
          city: "Tokyo",
          state: "Tokyo",
          pincode: "100001",
        },
        deliveryMethod: "standard",
        subtotal: 2500,
        totalAmount: 2500,
        paymentMethod: "cod",
        paymentStatus: "paid",
        status: returnStatus === "none" ? "delivered" : (returnStatus === "completed" ? "returned" : "delivered"),
        returnStatus,
        returnReason: returnReason || "",
        returnRequestedAt: requestedDate,
      });
      createdOrders.push(order);
      return order;
    };

    // 1. Order without return
    await seedOrder("ORD-NO-RETURN", "none", "");

    // 2. Pending return
    await seedOrder("ORD-RET-PENDING-1", "pending", "Wrong size requested", 5);

    // 3. Approved return
    await seedOrder("ORD-RET-APPROVED-1", "approved", "Defective sheath", 10);

    // 4. Completed return
    await seedOrder("ORD-RET-COMPLETED-1", "completed", "Changed mind after delivery", 20);

    // 5. Rejected return
    await seedOrder("ORD-RET-REJECTED-1", "rejected", "Policy expired", 1);
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================================
  // TEST 6: Single Source of Truth — No Duplicate Implementation
  // =========================================================================
  test("TEST 6: Single source of truth — getAdminReturns in returnController is the identical exported function from orderController", () => {
    assert.strictEqual(
      getAdminReturns,
      getAdminReturnsFromReturnController,
      "returnController.js must re-export the canonical getAdminReturns from orderController.js"
    );
  });

  // =========================================================================
  // TEST 1: Admin fetches return list
  // =========================================================================
  test("TEST 1: Admin fetches return list — only returns orders with active return requests", async () => {
    const req = {
      query: {},
    };
    const res = createMockRes();

    await getAdminReturns(req, res);

    assert.strictEqual(res.statusCode, 200, "Should return 200 OK");
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.returns?.length, 4, "Should return the 4 orders with returnStatus !== 'none'");

    // Verify order without return is NOT in the returns list
    const hasNonReturn = res.body.returns.some((r) => r.orderNumber === "ORD-NO-RETURN");
    assert.strictEqual(hasNonReturn, false, "Orders without return status must not be returned");

    // Check payload structure
    const firstReturn = res.body.returns[0];
    assert.ok(firstReturn._id);
    assert.ok(firstReturn.orderNumber);
    assert.ok(firstReturn.customer?.name);
    assert.ok(firstReturn.customer?.phone);
    assert.ok(firstReturn.returnStatus);
    assert.ok(firstReturn.returnReason !== undefined);
  });

  // =========================================================================
  // TEST 2: Returns with different statuses (filtering)
  // =========================================================================
  test("TEST 2A: Filter by specific return status (pending)", async () => {
    const req = {
      query: { status: "pending" },
    };
    const res = createMockRes();

    await getAdminReturns(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.returns?.length, 1);
    assert.strictEqual(res.body?.returns[0]?.returnStatus, "pending");
    assert.strictEqual(res.body?.returns[0]?.orderNumber, "ORD-RET-PENDING-1");
  });

  test("TEST 2B: Filter with status 'all' returns all active returns", async () => {
    const req = {
      query: { status: "all" },
    };
    const res = createMockRes();

    await getAdminReturns(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.success, true);
    assert.strictEqual(res.body?.returns?.length, 4);
  });

  test("TEST 2C: Search filter finds returns matching order number or reason", async () => {
    const req = {
      query: { search: "sheath" },
    };
    const res = createMockRes();

    await getAdminReturns(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body?.returns?.length, 1);
    assert.strictEqual(res.body?.returns[0]?.orderNumber, "ORD-RET-APPROVED-1");
  });

  // =========================================================================
  // TEST 3: Pagination
  // =========================================================================
  test("TEST 3: Pagination works accurately with page and limit parameters", async () => {
    // Page 1 with limit 2
    const req1 = {
      query: { page: "1", limit: "2" },
    };
    const res1 = createMockRes();
    await getAdminReturns(req1, res1);

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body?.returns?.length, 2);
    assert.strictEqual(res1.body?.pagination?.currentPage, 1);
    assert.strictEqual(res1.body?.pagination?.limit, 2);
    assert.strictEqual(res1.body?.pagination?.totalReturns, 4);
    assert.strictEqual(res1.body?.pagination?.totalPages, 2);

    // Page 2 with limit 2
    const req2 = {
      query: { page: "2", limit: "2" },
    };
    const res2 = createMockRes();
    await getAdminReturns(req2, res2);

    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body?.returns?.length, 2);
    assert.strictEqual(res2.body?.pagination?.currentPage, 2);
  });

  // =========================================================================
  // TEST 4: Admin Authorization
  // =========================================================================
  test("TEST 4A: Unauthorized request without admin token is rejected by adminAuthMiddleware", async () => {
    const req = {
      headers: {},
    };
    const res = createMockRes();
    let nextCalled = false;

    adminAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, "adminAuthMiddleware must reject missing token");
    assert.strictEqual(res.statusCode, 401);
  });

  test("TEST 4B: Regular user token is rejected with 403 by adminAuthMiddleware", async () => {
    const userToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: "user",
      },
      JWT_SECRET
    );

    const req = {
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    adminAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false, "adminAuthMiddleware must reject non-admin roles");
    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body?.message, /admin access required/i);
  });

  test("TEST 4C: Valid admin token passes adminAuthMiddleware", async () => {
    const adminToken = jwt.sign(
      {
        adminId: new mongoose.Types.ObjectId(),
        email: "admin@getsuka.com",
        role: "admin",
      },
      JWT_SECRET
    );

    const req = {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    adminAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true, "adminAuthMiddleware must pass valid admin token");
    assert.strictEqual(req.admin?.role, "admin");
  });

  // =========================================================================
  // TEST 5: Sorting options
  // =========================================================================
  test("TEST 5: Sorting by newest and oldest works as expected", async () => {
    // Newest first (default)
    const reqNewest = { query: { sort: "newest" } };
    const resNewest = createMockRes();
    await getAdminReturns(reqNewest, resNewest);

    // The order requested 1 hour ago should come before the one requested 20 hours ago
    const newestOrder = resNewest.body?.returns[0];
    assert.strictEqual(newestOrder?.orderNumber, "ORD-RET-REJECTED-1");

    // Oldest first
    const reqOldest = { query: { sort: "oldest" } };
    const resOldest = createMockRes();
    await getAdminReturns(reqOldest, resOldest);

    // The order requested 20 hours ago should come first
    const oldestOrder = resOldest.body?.returns[0];
    assert.strictEqual(oldestOrder?.orderNumber, "ORD-RET-COMPLETED-1");
  });
});
