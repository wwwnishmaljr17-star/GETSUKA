import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import Product from "../src/features/product/models/Product.js";
import Order from "../src/features/order/models/Order.js";
import Address from "../src/features/address/models/Address.js";
import Category from "../src/features/category/models/Category.js";
import User from "../src/features/auth/models/User.js";
import Coupon from "../src/features/coupon/models/Coupon.js";
import { getAdminDashboardData } from "../src/features/admin/controllers/adminDashboardController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_dashboard";

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

describe("Admin Dashboard Real Data API Tests", () => {
  let testCategory;
  let testUser;
  let testAddress;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================
  // CASE 6 — EMPTY DATABASE
  // =========================================================
  test("CASE 6 — EMPTY DATABASE: Dashboard loads without errors and returns zero values", async () => {
    const req = { admin: { id: "admin1", role: "admin" } };
    const res = createMockRes();

    await getAdminDashboardData(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);

    // Summary
    assert.strictEqual(res.body.summary.totalOrders, 0);
    assert.strictEqual(res.body.summary.totalRevenue, 0);
    assert.strictEqual(res.body.summary.pendingOrders, 0);
    assert.strictEqual(res.body.summary.completedOrders, 0);
    assert.strictEqual(res.body.summary.cancelledOrders, 0);
    assert.strictEqual(res.body.summary.totalUsers, 0);
    assert.strictEqual(res.body.summary.totalProducts, 0);

    // Revenue
    assert.strictEqual(res.body.revenue.today, 0);
    assert.strictEqual(res.body.revenue.thisWeek, 0);
    assert.strictEqual(res.body.revenue.thisMonth, 0);
    assert.strictEqual(res.body.revenue.thisYear, 0);

    // Arrays
    assert.deepStrictEqual(res.body.recentOrders, []);
    assert.deepStrictEqual(res.body.lowStockProducts, []);
    assert.deepStrictEqual(res.body.pendingReturns, []);

    // Charts
    assert.strictEqual(res.body.charts.salesOverview.length, 7);
    assert.strictEqual(res.body.charts.salesValues.length, 7);
    assert.ok(res.body.charts.salesValues.every((v) => v === 0));
  });

  // =========================================================
  // CASE 1 — DATABASE HAS ORDERS
  // =========================================================
  test("CASE 1 — DATABASE HAS ORDERS: Dashboard numbers accurately reflect database values", async () => {
    testCategory = await Category.create({
      name: "Dashboard Category",
      isDeleted: false,
    });

    testUser = await User.create({
      fullName: "Levi Ackerman",
      email: `levi-${Date.now()}@example.com`,
      password: "password123",
      isVerified: true,
    });

    testAddress = await Address.create({
      userId: testUser._id,
      fullName: "Levi Ackerman",
      phone: "9876543210",
      addressLine: "Wall Rose",
      city: "Shiganshina",
      state: "Paradis",
      pincode: "100001",
    });

    const product = await Product.create({
      name: "Survey Corps Cloak",
      description: "Cloak",
      category: testCategory._id,
      anime: "Attack on Titan",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 2500,
      variants: [
        {
          color: "Green",
          size: "L",
          sku: `SURVEY-${Date.now()}`,
          stock: 20,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    // Create 2 valid orders
    await Order.create({
      userId: testUser._id,
      orderNumber: `ORD-DASH-1-${Date.now()}`,
      items: [
        {
          productId: product._id,
          variantId: product.variants[0]._id,
          productName: product.name,
          sku: product.variants[0].sku,
          quantity: 1,
          price: 2500,
          totalPrice: 2500,
        },
      ],
      shippingAddress: {
        addressId: testAddress._id,
        fullName: testAddress.fullName,
        phone: testAddress.phone,
        addressLine: testAddress.addressLine,
        city: testAddress.city,
        state: testAddress.state,
        pincode: testAddress.pincode,
      },
      subtotal: 2500,
      totalAmount: 2500,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    await Order.create({
      userId: testUser._id,
      orderNumber: `ORD-DASH-2-${Date.now()}`,
      items: [
        {
          productId: product._id,
          variantId: product.variants[0]._id,
          productName: product.name,
          sku: product.variants[0].sku,
          quantity: 2,
          price: 2500,
          totalPrice: 5000,
        },
      ],
      shippingAddress: {
        addressId: testAddress._id,
        fullName: testAddress.fullName,
        phone: testAddress.phone,
        addressLine: testAddress.addressLine,
        city: testAddress.city,
        state: testAddress.state,
        pincode: testAddress.pincode,
      },
      subtotal: 5000,
      totalAmount: 5000,
      paymentMethod: "wallet",
      paymentStatus: "paid",
      status: "confirmed",
    });

    const req = { admin: { id: "admin1", role: "admin" } };
    const res = createMockRes();

    await getAdminDashboardData(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.summary.totalOrders, 2);
    assert.strictEqual(res.body.summary.totalRevenue, 7500); // 2500 + 5000
    assert.strictEqual(res.body.summary.pendingOrders, 1); // placed
    assert.strictEqual(res.body.summary.processingOrders, 1); // confirmed
    assert.strictEqual(res.body.summary.totalUsers, 1);
    assert.strictEqual(res.body.summary.totalProducts, 1);
    assert.strictEqual(res.body.recentOrders.length, 2);
    assert.strictEqual(res.body.revenue.today, 7500);
  });

  // =========================================================
  // CASE 2 — CANCELLED ORDER DOES NOT INCREASE REVENUE
  // =========================================================
  test("CASE 2 — CANCELLED ORDER: Adding a cancelled order does NOT increase revenue", async () => {
    const preRes = createMockRes();
    await getAdminDashboardData({}, preRes);
    const initialRevenue = preRes.body.summary.totalRevenue;
    const initialOrders = preRes.body.summary.totalOrders;

    // Create a cancelled order
    await Order.create({
      userId: testUser._id,
      orderNumber: `ORD-CANCEL-${Date.now()}`,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          variantId: new mongoose.Types.ObjectId(),
          productName: "Cancelled Item",
          sku: "CANCELLED-SKU",
          quantity: 1,
          price: 9999,
          totalPrice: 9999,
        },
      ],
      shippingAddress: {
        addressId: testAddress._id,
        fullName: testAddress.fullName,
        phone: testAddress.phone,
        addressLine: testAddress.addressLine,
        city: testAddress.city,
        state: testAddress.state,
        pincode: testAddress.pincode,
      },
      subtotal: 9999,
      totalAmount: 9999,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "cancelled",
      cancellationReason: "Customer changed mind",
    });

    const postRes = createMockRes();
    await getAdminDashboardData({}, postRes);

    assert.strictEqual(
      postRes.body.summary.totalRevenue,
      initialRevenue,
      "Revenue must NOT increase for cancelled orders"
    );
    assert.strictEqual(
      postRes.body.summary.totalOrders,
      initialOrders + 1,
      "Total order count increases by 1"
    );
    assert.strictEqual(
      postRes.body.summary.cancelledOrders,
      1,
      "Cancelled orders count must be 1"
    );
  });

  // =========================================================
  // CASE 3 — DELIVERED ORDER UPDATES REVENUE
  // =========================================================
  test("CASE 3 — DELIVERED ORDER: Successful delivered order updates revenue and completed count", async () => {
    const preRes = createMockRes();
    await getAdminDashboardData({}, preRes);
    const initialRevenue = preRes.body.summary.totalRevenue;
    const initialCompleted = preRes.body.summary.completedOrders;

    await Order.create({
      userId: testUser._id,
      orderNumber: `ORD-DELIVERED-${Date.now()}`,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          variantId: new mongoose.Types.ObjectId(),
          productName: "Delivered Item",
          sku: "DELIVERED-SKU",
          quantity: 1,
          price: 1500,
          totalPrice: 1500,
        },
      ],
      shippingAddress: {
        addressId: testAddress._id,
        fullName: testAddress.fullName,
        phone: testAddress.phone,
        addressLine: testAddress.addressLine,
        city: testAddress.city,
        state: testAddress.state,
        pincode: testAddress.pincode,
      },
      subtotal: 1500,
      totalAmount: 1500,
      paymentMethod: "cod",
      paymentStatus: "paid",
      status: "delivered",
      deliveredAt: new Date(),
    });

    const postRes = createMockRes();
    await getAdminDashboardData({}, postRes);

    assert.strictEqual(
      postRes.body.summary.totalRevenue,
      initialRevenue + 1500,
      "Revenue must increase by 1500"
    );
    assert.strictEqual(
      postRes.body.summary.completedOrders,
      initialCompleted + 1,
      "Completed orders count must increase by 1"
    );
  });

  // =========================================================
  // CASE 4 — LOW STOCK PRODUCT
  // =========================================================
  test("CASE 4 — LOW STOCK PRODUCT: Product variant with stock <= 5 appears in low-stock section", async () => {
    const lowStockProduct = await Product.create({
      name: "Gojo Satoru Eye Mask",
      description: "Blindfold",
      category: testCategory._id,
      anime: "Jujutsu Kaisen",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 499,
      variants: [
        {
          color: "Black",
          size: "OneSize",
          sku: `GOJO-MASK-${Date.now()}`,
          stock: 3, // <= 5
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const res = createMockRes();
    await getAdminDashboardData({}, res);

    assert.strictEqual(res.statusCode, 200);
    const lowStockItem = res.body.lowStockProducts.find(
      (p) => p.name === "Gojo Satoru Eye Mask"
    );

    assert.ok(lowStockItem, "Low stock product must appear in dashboard");
    assert.strictEqual(lowStockItem.stock, 3);
    assert.strictEqual(lowStockItem.variant, "Black / OneSize");
  });

  // =========================================================
  // CASE 5 — PENDING RETURN REQUEST
  // =========================================================
  test("CASE 5 — PENDING RETURN REQUEST: Order with returnStatus = pending appears in pendingReturns", async () => {
    const returnOrderNumber = `ORD-RET-${Date.now()}`;

    await Order.create({
      userId: testUser._id,
      orderNumber: returnOrderNumber,
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          variantId: new mongoose.Types.ObjectId(),
          productName: "Defective Merch",
          sku: "DEFECT-SKU",
          quantity: 1,
          price: 2200,
          totalPrice: 2200,
        },
      ],
      shippingAddress: {
        addressId: testAddress._id,
        fullName: "Eren Yeager",
        phone: "5555555555",
        addressLine: "Wall Maria",
        city: "Shiganshina",
        state: "Paradis",
        pincode: "100001",
      },
      subtotal: 2200,
      totalAmount: 2200,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "delivered",
      returnStatus: "pending",
      returnReason: "Wrong size sent",
      returnRequestedAt: new Date(),
    });

    const res = createMockRes();
    await getAdminDashboardData({}, res);

    assert.strictEqual(res.statusCode, 200);
    const returnItem = res.body.pendingReturns.find(
      (r) => r.id === returnOrderNumber
    );

    assert.ok(returnItem, "Pending return order must appear in pendingReturns");
    assert.strictEqual(returnItem.customer, "Eren Yeager");
    assert.strictEqual(returnItem.amount, 2200);
    assert.strictEqual(returnItem.status, "pending");
    assert.strictEqual(returnItem.reason, "Wrong size sent");
  });
});
