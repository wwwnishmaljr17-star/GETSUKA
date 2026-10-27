import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import Order from "../src/features/order/models/Order.js";
import Product from "../src/features/product/models/Product.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import User from "../src/features/auth/models/User.js";
import Category from "../src/features/category/models/Category.js";

import {
  cancelUserOrder,
  updateAdminOrderStatus,
} from "../src/features/order/controllers/orderController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_cancel_phase2";

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

describe("GETSUKA — Phase 2: Full Cancellation Refund & Stock Safety Tests", () => {
  let user;
  let category;
  let product;
  let variantId;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    user = await User.create({
      fullName: "Phase2 Test User",
      email: `phase2_user_${Date.now()}@example.com`,
      password: "hashedpassword123",
      isVerified: true,
      referralCode: `REF-P2-${Date.now()}`,
    });

    category = await Category.create({
      name: "Merchandise",
      isDeleted: false,
    });

    product = await Product.create({
      name: "Demon Slayer Katana",
      description: "Authentic Katana Replica",
      category: category._id,
      anime: "Demon Slayer",
      images: ["katana1.jpg", "katana2.jpg", "katana3.jpg"],
      price: 2000,
      variants: [
        {
          sku: `KATANA-${Date.now()}`,
          size: "Standard",
          color: "Black",
          stock: 20,
        },
      ],
      isListed: true,
      isDeleted: false,
    });
    variantId = product.variants[0]._id;
  });

  after(async () => {
    try {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    } catch {
      // Best effort cleanup
    }
  });

  // Helper to create test orders
  const seedOrder = async (overrides = {}) => {
    const addressId = new mongoose.Types.ObjectId();
    const subtotal = overrides.subtotal !== undefined ? overrides.subtotal : 2000;
    const totalAmount = overrides.totalAmount !== undefined ? overrides.totalAmount : 2000;
    const discount = overrides.discount !== undefined ? overrides.discount : 0;

    const orderData = {
      userId: user._id,
      orderNumber: `ORD-P2-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      items: [
        {
          productId: product._id,
          variantId,
          productName: product.name,
          sku: product.variants[0].sku,
          quantity: 2,
          price: 1000,
          totalPrice: 2000,
          itemStatus: "active",
          cancelledQuantity: 0,
        },
      ],
      shippingAddress: {
        addressId,
        fullName: "Test Customer",
        phone: "9876543210",
        addressLine: "Street 1",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
      },
      deliveryMethod: "standard",
      shippingCharge: 0,
      subtotal,
      originalSubtotal: overrides.originalSubtotal !== undefined ? overrides.originalSubtotal : subtotal,
      discount,
      originalDiscount: overrides.originalDiscount !== undefined ? overrides.originalDiscount : discount,
      tax: 0,
      totalAmount,
      originalTotalAmount: overrides.originalTotalAmount !== undefined ? overrides.originalTotalAmount : totalAmount,
      totalRefundedAmount: 0,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
      ...overrides,
    };

    return await Order.create(orderData);
  };

  // =========================================================================
  // TEST 1: Customer Cancellation with Express Delivery excludes express fee
  // =========================================================================
  test("TEST 1: Paid express-delivery cancellation strictly excludes express fee (₹2,149 order refunds ₹2,000)", async () => {
    // Reset product stock to 10
    await Product.updateOne(
      { _id: product._id, "variants._id": variantId },
      { $set: { "variants.$.stock": 10 } }
    );

    // Initial wallet balance = 0
    await Wallet.deleteMany({ userId: user._id });
    await Wallet.create({ userId: user._id, balance: 0, transactions: [] });

    // Create order with express delivery (₹149 fee)
    const order = await seedOrder({
      deliveryMethod: "express",
      shippingCharge: 149,
      subtotal: 2000,
      originalSubtotal: 2000,
      totalAmount: 2149,
      originalTotalAmount: 2149,
    });

    const req = {
      user: { userId: user._id.toString() },
      params: { orderId: order._id.toString() },
      body: { cancellationReason: "Customer changed mind" },
    };
    const res = createMockRes();

    await cancelUserOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.refund.amount, 2000, "Refund must be exactly ₹2,000 (excluding ₹149 fee)");
    assert.strictEqual(res.body.refund.walletBalance, 2000, "Wallet balance must be ₹2,000");

    // Order status & shippingCharge
    const updatedOrder = await Order.findById(order._id);
    assert.strictEqual(updatedOrder.status, "cancelled");
    assert.strictEqual(updatedOrder.paymentStatus, "refunded");
    assert.strictEqual(updatedOrder.shippingCharge, 149, "shippingCharge must NOT be set to zero");
    assert.strictEqual(updatedOrder.totalRefundedAmount, 2000);

    // Items must be marked cancelled
    assert.strictEqual(updatedOrder.items[0].itemStatus, "cancelled");
    assert.strictEqual(updatedOrder.items[0].refundStatus, "refunded");
    assert.strictEqual(updatedOrder.items[0].refundedAmount, 2000);

    // Stock must be restored: 10 + 2 = 12
    const updatedProduct = await Product.findById(product._id);
    assert.strictEqual(updatedProduct.variants[0].stock, 12, "Stock must be incremented by 2");
  });

  // =========================================================================
  // TEST 2: Customer Cancellation with Standard Delivery refunds full amount
  // =========================================================================
  test("TEST 2: Paid standard-delivery cancellation refunds full order product amount", async () => {
    await Product.updateOne(
      { _id: product._id, "variants._id": variantId },
      { $set: { "variants.$.stock": 10 } }
    );

    await Wallet.deleteMany({ userId: user._id });
    await Wallet.create({ userId: user._id, balance: 100, transactions: [] });

    const order = await seedOrder({
      deliveryMethod: "standard",
      shippingCharge: 0,
      subtotal: 2000,
      totalAmount: 2000,
    });

    const req = {
      user: { userId: user._id.toString() },
      params: { orderId: order._id.toString() },
      body: { cancellationReason: "Need another size" },
    };
    const res = createMockRes();

    await cancelUserOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.refund.amount, 2000);
    assert.strictEqual(res.body.refund.walletBalance, 2100, "100 + 2000 = 2100");

    const updatedProduct = await Product.findById(product._id);
    assert.strictEqual(updatedProduct.variants[0].stock, 12);
  });

  // =========================================================================
  // TEST 3: Unpaid COD Cancellation issues NO refund
  // =========================================================================
  test("TEST 3: Unpaid COD cancellation restores stock but issues zero wallet refund", async () => {
    await Product.updateOne(
      { _id: product._id, "variants._id": variantId },
      { $set: { "variants.$.stock": 10 } }
    );

    await Wallet.deleteMany({ userId: user._id });
    await Wallet.create({ userId: user._id, balance: 50, transactions: [] });

    const order = await seedOrder({
      paymentMethod: "cod",
      paymentStatus: "pending", // Unpaid
      deliveryMethod: "express",
      shippingCharge: 149,
      totalAmount: 2149,
    });

    const req = {
      user: { userId: user._id.toString() },
      params: { orderId: order._id.toString() },
      body: { cancellationReason: "Not needed anymore" },
    };
    const res = createMockRes();

    await cancelUserOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.refund, null, "Refund object must be null for unpaid COD");
    assert.strictEqual(res.body.message, "Order cancelled successfully");

    // Wallet balance must remain unchanged
    const wallet = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(wallet.balance, 50);
    assert.strictEqual(wallet.transactions.length, 0, "No refund transaction created for unpaid COD");

    // Stock must still be restored
    const updatedProduct = await Product.findById(product._id);
    assert.strictEqual(updatedProduct.variants[0].stock, 12);

    // Items marked cancelled without refund
    const updatedOrder = await Order.findById(order._id);
    assert.strictEqual(updatedOrder.status, "cancelled");
    assert.strictEqual(updatedOrder.items[0].refundStatus, "none");
    assert.strictEqual(updatedOrder.items[0].refundedAmount, 0);
  });

  // =========================================================================
  // TEST 4: Admin cancellation restores stock & refunds paid express order safely
  // =========================================================================
  test("TEST 4: Admin cancellation restores active stock and excludes express shipping fee", async () => {
    await Product.updateOne(
      { _id: product._id, "variants._id": variantId },
      { $set: { "variants.$.stock": 5 } }
    );

    await Wallet.deleteMany({ userId: user._id });
    await Wallet.create({ userId: user._id, balance: 0, transactions: [] });

    const order = await seedOrder({
      deliveryMethod: "express",
      shippingCharge: 149,
      subtotal: 2000,
      originalSubtotal: 2000,
      totalAmount: 2149,
      originalTotalAmount: 2149,
    });

    const req = {
      params: { orderId: order._id.toString() },
      body: { status: "cancelled", cancellationReason: "Product out of production" },
    };
    const res = createMockRes();

    await updateAdminOrderStatus(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.order.status, "cancelled");
    assert.strictEqual(res.body.order.paymentStatus, "refunded");

    // Wallet credited with ₹2,000 (excluding ₹149 express fee)
    const wallet = await Wallet.findOne({ userId: user._id });
    assert.strictEqual(wallet.balance, 2000);

    // Stock restored: 5 + 2 = 7
    const updatedProduct = await Product.findById(product._id);
    assert.strictEqual(updatedProduct.variants[0].stock, 7);
  });

  // =========================================================================
  // TEST 5: Repeated admin cancellation does not restore stock twice
  // =========================================================================
  test("TEST 5: Repeated admin cancellation request returns 400 and does NOT restore stock twice", async () => {
    await Product.updateOne(
      { _id: product._id, "variants._id": variantId },
      { $set: { "variants.$.stock": 5 } }
    );

    const order = await seedOrder({
      status: "placed",
    });

    // 1. First admin cancellation -> succeeds
    const req1 = {
      params: { orderId: order._id.toString() },
      body: { status: "cancelled" },
    };
    const res1 = createMockRes();
    await updateAdminOrderStatus(req1, res1);
    assert.strictEqual(res1.statusCode, 200);

    // Stock becomes 5 + 2 = 7
    let prod = await Product.findById(product._id);
    assert.strictEqual(prod.variants[0].stock, 7);

    // 2. Second admin cancellation -> rejected with 400
    const req2 = {
      params: { orderId: order._id.toString() },
      body: { status: "cancelled" },
    };
    const res2 = createMockRes();
    await updateAdminOrderStatus(req2, res2);

    assert.strictEqual(res2.statusCode, 400);
    assert.match(res2.body.message, /invalid order status transition.*cancelled/i);

    // Stock must remain 7 (NOT 9)
    prod = await Product.findById(product._id);
    assert.strictEqual(prod.variants[0].stock, 7, "Stock must NOT be restored a second time");
  });

  // =========================================================================
  // TEST 6: Previously cancelled items are NOT restocked again on order cancellation
  // =========================================================================
  test("TEST 6: Previously cancelled items are NOT restocked again during full cancellation", async () => {
    await Product.updateOne(
      { _id: product._id, "variants._id": variantId },
      { $set: { "variants.$.stock": 10 } }
    );

    // Order with 2 items: Item 1 was already cancelled earlier, Item 2 is still active
    const addressId = new mongoose.Types.ObjectId();
    const order = await Order.create({
      userId: user._id,
      orderNumber: `ORD-PARTIAL-PREV-${Date.now()}`,
      items: [
        {
          productId: product._id,
          variantId,
          productName: "Item 1 (Already Cancelled)",
          sku: "ITEM-1-SKU",
          quantity: 2,
          price: 1000,
          totalPrice: 2000,
          itemStatus: "cancelled", // Already cancelled!
          cancelledQuantity: 2,
          refundStatus: "refunded",
          refundedAmount: 1000,
        },
        {
          productId: product._id,
          variantId,
          productName: "Item 2 (Still Active)",
          sku: "ITEM-2-SKU",
          quantity: 3,
          price: 1000,
          totalPrice: 3000,
          itemStatus: "active",
          cancelledQuantity: 0,
        },
      ],
      shippingAddress: {
        addressId,
        fullName: "User",
        phone: "123",
        addressLine: "Line",
        city: "City",
        state: "State",
        pincode: "123456",
      },
      deliveryMethod: "standard",
      shippingCharge: 0,
      subtotal: 5000,
      originalSubtotal: 5000,
      totalAmount: 3000,
      originalTotalAmount: 5000,
      totalRefundedAmount: 1000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    const req = {
      user: { userId: user._id.toString() },
      params: { orderId: order._id.toString() },
      body: { cancellationReason: "Cancel remaining" },
    };
    const res = createMockRes();

    await cancelUserOrder(req, res);

    assert.strictEqual(res.statusCode, 200);

    // Only Item 2's quantity (3) should be restored, NOT Item 1's quantity (2)
    // 10 + 3 = 13 (NOT 10 + 2 + 3 = 15)
    const prod = await Product.findById(product._id);
    assert.strictEqual(prod.variants[0].stock, 13, "Only remaining active items must be restocked");
  });

  // =========================================================================
  // TEST 7: Concurrent Customer Cancellations do not double-restore stock
  // =========================================================================
  test("TEST 7: Two concurrent cancellation requests result in exactly 1 cancellation and no double stock restoration", async () => {
    await Product.updateOne(
      { _id: product._id, "variants._id": variantId },
      { $set: { "variants.$.stock": 10 } }
    );

    const order = await seedOrder({
      status: "placed",
    });

    const reqA = {
      user: { userId: user._id.toString() },
      params: { orderId: order._id.toString() },
      body: { cancellationReason: "Parallel A" },
    };
    const resA = createMockRes();

    const reqB = {
      user: { userId: user._id.toString() },
      params: { orderId: order._id.toString() },
      body: { cancellationReason: "Parallel B" },
    };
    const resB = createMockRes();

    // Fire in parallel
    await Promise.all([
      cancelUserOrder(reqA, resA),
      cancelUserOrder(reqB, resB),
    ]);

    const results = [resA, resB];
    const successes = results.filter((r) => r.statusCode === 200);
    const failures = results.filter((r) => r.statusCode === 400);

    assert.strictEqual(successes.length, 1, "Exactly one parallel request must succeed");
    assert.strictEqual(failures.length, 1, "Competing request must receive 400");

    // Stock must be restored exactly once: 10 + 2 = 12 (NOT 10 + 2 + 2 = 14)
    const prod = await Product.findById(product._id);
    assert.strictEqual(prod.variants[0].stock, 12, "Stock must be restored exactly once");
  });
});
