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
  cancelUserOrderItem,
  cancelUserOrderItems,
  returnUserOrder,
  updateAdminOrderStatus,
  approveReturnRequest,
  rejectReturnRequest,
  markReturnCollectionPending,
  markReturnCollected,
  completeReturn,
} from "../src/features/order/controllers/orderController.js";

import { creditWallet } from "../src/features/wallet/controllers/walletController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_complete_cancellation_refunds";

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

describe("GETSUKA — Complete Order Cancellation, Returns & Wallet Refunds Test Suite", () => {
  let userA;
  let userB;
  let category;
  let product1;
  let product2;
  let variant1A;
  let variant1B;
  let variant2;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    userA = await User.create({
      fullName: "Customer Alice",
      email: `alice_${Date.now()}@example.com`,
      password: "hashedpassword123",
      isVerified: true,
      referralCode: `REF-A-${Date.now()}`,
    });

    userB = await User.create({
      fullName: "Customer Bob",
      email: `bob_${Date.now()}@example.com`,
      password: "hashedpassword123",
      isVerified: true,
      referralCode: `REF-B-${Date.now()}`,
    });

    category = await Category.create({
      name: "Anime Gear",
      isDeleted: false,
    });

    // Product with 2 variants
    product1 = await Product.create({
      name: "Survey Corps Cloak",
      description: "Official Attack on Titan Cloak",
      category: category._id,
      anime: "Attack on Titan",
      images: ["cloak1.jpg", "cloak2.jpg", "cloak3.jpg"],
      price: 1500,
      variants: [
        {
          sku: `CLOAK-M-${Date.now()}`,
          size: "M",
          color: "Green",
          stock: 25,
        },
        {
          sku: `CLOAK-L-${Date.now()}`,
          size: "L",
          color: "Green",
          stock: 25,
        },
      ],
      isListed: true,
      isDeleted: false,
    });
    variant1A = product1.variants[0]._id;
    variant1B = product1.variants[1]._id;

    // Second product
    product2 = await Product.create({
      name: "Ichigo Bankai Sword",
      description: "Bleach replica sword",
      category: category._id,
      anime: "Bleach",
      images: ["sword1.jpg", "sword2.jpg", "sword3.jpg"],
      price: 1000,
      variants: [
        {
          sku: `SWORD-${Date.now()}`,
          size: "Standard",
          color: "Black",
          stock: 20,
        },
      ],
      isListed: true,
      isDeleted: false,
    });
    variant2 = product2.variants[0]._id;
  });

  after(async () => {
    try {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    } catch {
      // Best-effort cleanup
    }
  });

  // Seed Order helper
  const seedOrder = async (overrides = {}) => {
    const defaultAddress = {
      addressId: new mongoose.Types.ObjectId(),
      fullName: "Customer Alice",
      phone: "9876543210",
      addressLine: "123 Wall Rose",
      city: "Shiganshina",
      state: "Paradis",
      pincode: "123456",
    };

    const subtotal = overrides.subtotal !== undefined ? overrides.subtotal : 1500;
    const discount = overrides.discount !== undefined ? overrides.discount : 0;
    const shippingCharge = overrides.shippingCharge !== undefined ? overrides.shippingCharge : 0;
    const totalAmount = overrides.totalAmount !== undefined ? overrides.totalAmount : (subtotal - discount + shippingCharge);

    const defaultItems = [
      {
        productId: product1._id,
        variantId: variant1A,
        productName: "Survey Corps Cloak",
        sku: product1.variants[0].sku,
        size: "M",
        color: "Green",
        price: 1500,
        quantity: 1,
        totalPrice: 1500,
        itemStatus: "active",
        cancelledQuantity: 0,
        returnedQuantity: 0,
      },
    ];

    const orderData = {
      userId: userA._id,
      orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      items: defaultItems,
      shippingAddress: defaultAddress,
      subtotal,
      originalSubtotal: overrides.originalSubtotal !== undefined ? overrides.originalSubtotal : subtotal,
      discount,
      originalDiscount: overrides.originalDiscount !== undefined ? overrides.originalDiscount : discount,
      deliveryMethod: overrides.deliveryMethod || "standard",
      shippingCharge,
      totalAmount,
      originalTotalAmount: overrides.originalTotalAmount !== undefined ? overrides.originalTotalAmount : totalAmount,
      totalRefundedAmount: 0,
      paymentMethod: overrides.paymentMethod || "razorpay",
      paymentStatus: overrides.paymentStatus || "paid",
      status: overrides.status || "placed",
      ...overrides,
    };

    return await Order.create(orderData);
  };

  // =========================================================================
  // 1. Full cancellation of paid express order excludes the delivery fee (₹149)
  // =========================================================================
  test("1. Full cancellation of a paid express order excludes the ₹149 delivery fee", async () => {
    const order = await seedOrder({
      subtotal: 1500,
      deliveryMethod: "express",
      shippingCharge: 149,
      totalAmount: 1649,
      originalTotalAmount: 1649,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
    });

    const req = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString() },
      body: { cancellationReason: "Changed mind on express delivery" },
    };
    const res = createMockRes();

    await cancelUserOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.refund.amount, 1500, "Refund must exclude ₹149 express delivery fee");

    const updatedWallet = await Wallet.findOne({ userId: userA._id });
    assert.ok(updatedWallet);
    const tx = updatedWallet.transactions.find((t) => t.orderId?.toString() === order._id.toString());
    assert.strictEqual(tx.amount, 1500);

    const updatedOrder = await Order.findById(order._id);
    assert.strictEqual(updatedOrder.status, "cancelled");
    assert.strictEqual(updatedOrder.totalRefundedAmount, 1500);
    assert.strictEqual(updatedOrder.shippingCharge, 149, "Express delivery charge must remain 149");
  });

  // =========================================================================
  // 2. Full cancellation of standard-delivery order calculates correct refund
  // =========================================================================
  test("2. Full cancellation of a standard-delivery order calculates the correct refund", async () => {
    const order = await seedOrder({
      items: [
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          size: "Standard",
          color: "Black",
          price: 1000,
          quantity: 2,
          totalPrice: 2000,
          itemStatus: "active",
        },
      ],
      subtotal: 2000,
      shippingCharge: 0,
      totalAmount: 2000,
      paymentMethod: "wallet",
      paymentStatus: "paid",
    });

    const initialWallet = await Wallet.findOne({ userId: userA._id });
    const initialBalance = initialWallet ? initialWallet.balance : 0;

    const req = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString() },
      body: { cancellationReason: "Cancelled standard order" },
    };
    const res = createMockRes();

    await cancelUserOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.refund.amount, 2000);

    const updatedWallet = await Wallet.findOne({ userId: userA._id });
    assert.strictEqual(updatedWallet.balance, initialBalance + 2000);
  });

  // =========================================================================
  // 3. Unpaid COD cancellation produces no wallet refund
  // =========================================================================
  test("3. Unpaid COD cancellation produces no wallet refund and restores stock", async () => {
    const initialProduct = await Product.findById(product2._id);
    const initialStock = initialProduct.variants.id(variant2).stock;

    const order = await seedOrder({
      items: [
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          size: "Standard",
          color: "Black",
          price: 1000,
          quantity: 1,
          totalPrice: 1000,
          itemStatus: "active",
        },
      ],
      subtotal: 1000,
      shippingCharge: 0,
      totalAmount: 1000,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "placed",
    });

    const initialWallet = await Wallet.findOne({ userId: userA._id });
    const initialBalance = initialWallet.balance;
    const initialTxCount = initialWallet.transactions.length;

    const req = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString() },
      body: { cancellationReason: "No longer want COD" },
    };
    const res = createMockRes();

    await cancelUserOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.refund, null, "Refund must be null for unpaid COD");

    const updatedWallet = await Wallet.findOne({ userId: userA._id });
    assert.strictEqual(updatedWallet.balance, initialBalance, "Balance must not change");
    assert.strictEqual(updatedWallet.transactions.length, initialTxCount, "No transaction created");

    const updatedProduct = await Product.findById(product2._id);
    assert.strictEqual(updatedProduct.variants.id(variant2).stock, initialStock + 1, "Stock must be restored");
  });

  // =========================================================================
  // 4. Cancelling one selected item leaves other items active
  // =========================================================================
  test("4. Cancelling one selected item leaves other items active", async () => {
    const order = await seedOrder({
      items: [
        {
          productId: product1._id,
          variantId: variant1A,
          productName: "Survey Corps Cloak",
          sku: product1.variants[0].sku,
          size: "M",
          price: 1500,
          quantity: 1,
          totalPrice: 1500,
          itemStatus: "active",
        },
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          size: "Standard",
          price: 1000,
          quantity: 1,
          totalPrice: 1000,
          itemStatus: "active",
        },
      ],
      subtotal: 2500,
      totalAmount: 2500,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "confirmed",
    });

    const itemToCancelId = order.items[0]._id.toString();

    const req = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString(), itemId: itemToCancelId },
      body: { cancellationReason: "Only cancel the cloak" },
    };
    const res = createMockRes();

    await cancelUserOrderItem(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.refund.amount, 1500);

    const updatedOrder = await Order.findById(order._id);
    assert.strictEqual(updatedOrder.status, "confirmed", "Order remains confirmed because other item is active");
    assert.strictEqual(updatedOrder.items[0].itemStatus, "cancelled");
    assert.strictEqual(updatedOrder.items[1].itemStatus, "active", "Second item remains active");
  });

  // =========================================================================
  // 5. Cancelling one unit from quantity of three restores and refunds only one unit
  // =========================================================================
  test("5. Cancelling one unit from a quantity of three restores and refunds only one unit", async () => {
    const prodBefore = await Product.findById(product2._id);
    const stockBefore = prodBefore.variants.id(variant2).stock;

    const order = await seedOrder({
      items: [
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          size: "Standard",
          price: 1000,
          quantity: 3,
          totalPrice: 3000,
          itemStatus: "active",
        },
      ],
      subtotal: 3000,
      totalAmount: 3000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "confirmed",
    });

    const itemId = order.items[0]._id.toString();

    const req = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString(), itemId },
      body: { cancellationReason: "Cancel 1 unit", quantity: 1 },
    };
    const res = createMockRes();

    await cancelUserOrderItem(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.refund.amount, 1000, "Refund exactly 1 unit (1000)");

    const updatedProd = await Product.findById(product2._id);
    assert.strictEqual(updatedProd.variants.id(variant2).stock, stockBefore + 1, "Stock restored by exactly 1 unit");

    const updatedOrder = await Order.findById(order._id);
    assert.strictEqual(updatedOrder.items[0].cancelledQuantity, 1);
    assert.strictEqual(updatedOrder.items[0].itemStatus, "active", "Item status remains active as 2 units remain");
  });

  // =========================================================================
  // 6. Batch cancellation processes multiple selected items correctly
  // =========================================================================
  test("6. Batch cancellation processes multiple selected items correctly", async () => {
    const order = await seedOrder({
      items: [
        {
          productId: product1._id,
          variantId: variant1A,
          productName: "Survey Corps Cloak M",
          sku: product1.variants[0].sku,
          size: "M",
          price: 1500,
          quantity: 2,
          totalPrice: 3000,
          itemStatus: "active",
        },
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          size: "Standard",
          price: 1000,
          quantity: 2,
          totalPrice: 2000,
          itemStatus: "active",
        },
      ],
      subtotal: 5000,
      totalAmount: 5000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    const item1Id = order.items[0]._id.toString();
    const item2Id = order.items[1]._id.toString();

    const req = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString() },
      body: {
        cancellationReason: "Batch cancel 1 cloak and 2 swords",
        items: [
          { itemId: item1Id, quantity: 1 },
          { itemId: item2Id, quantity: 2 },
        ],
      },
    };
    const res = createMockRes();

    await cancelUserOrderItems(req, res);

    assert.strictEqual(res.statusCode, 200);
    // 1 cloak = 1500, 2 swords = 2000 -> Total 3500
    assert.strictEqual(res.body.refund.amount, 3500);

    const updatedOrder = await Order.findById(order._id);
    assert.strictEqual(updatedOrder.items[0].cancelledQuantity, 1);
    assert.strictEqual(updatedOrder.items[0].itemStatus, "active", "1 cloak remains active");
    assert.strictEqual(updatedOrder.items[1].cancelledQuantity, 2);
    assert.strictEqual(updatedOrder.items[1].itemStatus, "cancelled", "Swords fully cancelled");
  });

  // =========================================================================
  // 7. Proportional coupon discounts are allocated correctly
  // =========================================================================
  test("7. Proportional coupon discounts are allocated correctly", async () => {
    // Subtotal = 4000 (Item 1 = 3000 [75%], Item 2 = 1000 [25%])
    // Discount = 400 (Item 1 discountShare = 300, Item 2 discountShare = 100)
    // Paid total = 3600
    const order = await seedOrder({
      items: [
        {
          productId: product1._id,
          variantId: variant1A,
          productName: "Survey Corps Cloak M",
          sku: product1.variants[0].sku,
          price: 1500,
          quantity: 2,
          totalPrice: 3000,
          discountShare: 300,
          itemStatus: "active",
        },
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          price: 1000,
          quantity: 1,
          totalPrice: 1000,
          discountShare: 100,
          itemStatus: "active",
        },
      ],
      subtotal: 4000,
      originalSubtotal: 4000,
      discount: 400,
      originalDiscount: 400,
      totalAmount: 3600,
      originalTotalAmount: 3600,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    const item1Id = order.items[0]._id.toString();
    const item2Id = order.items[1]._id.toString();

    // Cancel 1 unit of Item 1: price = 1500, unit discount = 300 / 2 = 150 -> Net refund = 1350
    const req1 = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString(), itemId: item1Id },
      body: { cancellationReason: "Partial item cancel", quantity: 1 },
    };
    const res1 = createMockRes();
    await cancelUserOrderItem(req1, res1);

    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body.refund.amount, 1350, "1500 - 150 = 1350");

    // Cancel Item 2 completely: price = 1000, discount = 100 -> Net refund = 900
    const req2 = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString(), itemId: item2Id },
      body: { cancellationReason: "Cancel sword", quantity: 1 },
    };
    const res2 = createMockRes();
    await cancelUserOrderItem(req2, res2);

    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body.refund.amount, 900, "1000 - 100 = 900");
  });

  // =========================================================================
  // 8. Repeated cancellation cannot refund the same item quantity twice
  // =========================================================================
  test("8. Repeated cancellation cannot refund the same item quantity twice", async () => {
    const order = await seedOrder({
      items: [
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          price: 1000,
          quantity: 1,
          totalPrice: 1000,
          itemStatus: "active",
        },
      ],
      subtotal: 1000,
      totalAmount: 1000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    const itemId = order.items[0]._id.toString();

    // First cancellation
    const req1 = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString(), itemId },
      body: { cancellationReason: "First attempt" },
    };
    const res1 = createMockRes();
    await cancelUserOrderItem(req1, res1);
    assert.strictEqual(res1.statusCode, 200);

    // Second repeated cancellation attempt
    const req2 = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString(), itemId },
      body: { cancellationReason: "Second attempt (retry)" },
    };
    const res2 = createMockRes();
    await cancelUserOrderItem(req2, res2);

    assert.strictEqual(res2.statusCode, 400);
    assert.strictEqual(res2.body.success, false);
    assert.match(res2.body.message, /already cancelled|no available units|no longer be cancelled/i);
  });

  // =========================================================================
  // 9. Two variants with identical product names can both be refunded
  // =========================================================================
  test("9. Two variants with identical product names can both be refunded independently", async () => {
    const order = await seedOrder({
      items: [
        {
          productId: product1._id,
          variantId: variant1A,
          productName: "Survey Corps Cloak", // identical name
          sku: product1.variants[0].sku,
          size: "M",
          price: 1500,
          quantity: 1,
          totalPrice: 1500,
          itemStatus: "active",
        },
        {
          productId: product1._id,
          variantId: variant1B,
          productName: "Survey Corps Cloak", // identical name
          sku: product1.variants[1].sku,
          size: "L",
          price: 1500,
          quantity: 1,
          totalPrice: 1500,
          itemStatus: "active",
        },
      ],
      subtotal: 3000,
      totalAmount: 3000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    const item1Id = order.items[0]._id.toString();
    const item2Id = order.items[1]._id.toString();

    // Cancel variant 1
    const res1 = createMockRes();
    await cancelUserOrderItem(
      {
        user: { userId: userA._id.toString() },
        params: { orderId: order._id.toString(), itemId: item1Id },
        body: { cancellationReason: "Cancel size M" },
      },
      res1
    );
    assert.strictEqual(res1.statusCode, 200);
    assert.strictEqual(res1.body.refund.amount, 1500);

    // Cancel variant 2 (identical product name)
    const res2 = createMockRes();
    await cancelUserOrderItem(
      {
        user: { userId: userA._id.toString() },
        params: { orderId: order._id.toString(), itemId: item2Id },
        body: { cancellationReason: "Cancel size L" },
      },
      res2
    );
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body.refund.amount, 1500);

    const wallet = await Wallet.findOne({ userId: userA._id });
    const matchingTxs = wallet.transactions.filter((t) => t.orderId?.toString() === order._id.toString());
    assert.strictEqual(matchingTxs.length, 2, "Both variants must have separate wallet refund transactions");
    assert.notStrictEqual(matchingTxs[0].orderItemId?.toString(), matchingTxs[1].orderItemId?.toString());
  });

  // =========================================================================
  // 10. Concurrent requests cannot double-restock or double-credit
  // =========================================================================
  test("10. Concurrent cancellation requests cannot double-restock or double-credit", async () => {
    const prodBefore = await Product.findById(product2._id);
    const stockBefore = prodBefore.variants.id(variant2).stock;

    const order = await seedOrder({
      items: [
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          price: 1000,
          quantity: 1,
          totalPrice: 1000,
          itemStatus: "active",
        },
      ],
      subtotal: 1000,
      totalAmount: 1000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    const itemId = order.items[0]._id.toString();

    const makeReq = () => ({
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString(), itemId },
      body: { cancellationReason: "Concurrent race test" },
    });

    const resA = createMockRes();
    const resB = createMockRes();

    await Promise.all([
      cancelUserOrderItem(makeReq(), resA),
      cancelUserOrderItem(makeReq(), resB),
    ]);

    const successes = [resA, resB].filter((r) => r.statusCode === 200);
    const failures = [resA, resB].filter((r) => r.statusCode !== 200);

    assert.strictEqual(successes.length, 1, "Only one concurrent request can succeed");
    assert.strictEqual(failures.length, 1, "The competing request must fail safely");

    const prodAfter = await Product.findById(product2._id);
    assert.strictEqual(prodAfter.variants.id(variant2).stock, stockBefore + 1, "Stock restocked only once");
  });

  // =========================================================================
  // 11. Admin cancellation restores eligible stock exactly once
  // =========================================================================
  test("11. Admin cancellation restores eligible stock exactly once", async () => {
    const prodBefore = await Product.findById(product2._id);
    const stockBefore = prodBefore.variants.id(variant2).stock;

    const order = await seedOrder({
      items: [
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          price: 1000,
          quantity: 2,
          totalPrice: 2000,
          itemStatus: "active",
        },
      ],
      subtotal: 2000,
      totalAmount: 2000,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "confirmed",
    });

    const req = {
      params: { orderId: order._id.toString() },
      body: { status: "cancelled", cancellationReason: "Admin cancelled" },
    };
    const res = createMockRes();

    await updateAdminOrderStatus(req, res);

    assert.strictEqual(res.statusCode, 200);

    const prodAfterFirst = await Product.findById(product2._id);
    assert.strictEqual(prodAfterFirst.variants.id(variant2).stock, stockBefore + 2, "Stock restored by 2 units");

    // Second call to update status to cancelled again
    const res2 = createMockRes();
    await updateAdminOrderStatus(req, res2);

    const prodAfterSecond = await Product.findById(product2._id);
    assert.strictEqual(prodAfterSecond.variants.id(variant2).stock, stockBefore + 2, "Stock must NOT increase a second time");
  });

  // =========================================================================
  // 12. Returning one item does not restock a previously cancelled item
  // =========================================================================
  test("12. Returning one item does not restock a previously cancelled item", async () => {
    const prodCloakBefore = await Product.findById(product1._id);
    const stockCloakBefore = prodCloakBefore.variants.id(variant1A).stock;

    const prodSwordBefore = await Product.findById(product2._id);
    const stockSwordBefore = prodSwordBefore.variants.id(variant2).stock;

    const order = await seedOrder({
      items: [
        {
          productId: product1._id,
          variantId: variant1A,
          productName: "Survey Corps Cloak M",
          sku: product1.variants[0].sku,
          price: 1500,
          quantity: 1,
          totalPrice: 1500,
          cancelledQuantity: 1,
          itemStatus: "cancelled", // already cancelled earlier
        },
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          price: 1000,
          quantity: 1,
          totalPrice: 1000,
          returnedQuantity: 1,
          returnStatus: "collected",
          itemStatus: "active",
        },
      ],
      subtotal: 2500,
      totalAmount: 2500,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "delivered",
      returnStatus: "collected",
      deliveredAt: new Date(),
    });

    // Complete return for this order
    const req = {
      params: { orderId: order._id.toString() },
    };
    const res = createMockRes();

    await completeReturn(req, res);

    assert.strictEqual(res.statusCode, 200);

    const prodCloakAfter = await Product.findById(product1._id);
    assert.strictEqual(
      prodCloakAfter.variants.id(variant1A).stock,
      stockCloakBefore,
      "Cancelled cloak must NOT be restocked again during return completion"
    );

    const prodSwordAfter = await Product.findById(product2._id);
    assert.strictEqual(
      prodSwordAfter.variants.id(variant2).stock,
      stockSwordBefore + 1,
      "Returned sword must be restocked exactly once"
    );
  });

  // =========================================================================
  // 13. Delivered COD refunds occur only at the permitted collection stage
  // =========================================================================
  test("13. Delivered COD refunds occur only at the permitted collection stage", async () => {
    const order = await seedOrder({
      items: [
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          price: 1000,
          quantity: 1,
          totalPrice: 1000,
          itemStatus: "active",
        },
      ],
      subtotal: 1000,
      totalAmount: 1000,
      paymentMethod: "cod",
      paymentStatus: "paid", // Paid on delivery
      status: "delivered",
      deliveredAt: new Date(),
    });

    const initialWallet = await Wallet.findOne({ userId: userA._id });
    const initialBalance = initialWallet.balance;

    // Stage 1: Customer requests return
    const reqReq = {
      user: { userId: userA._id.toString() },
      params: { orderId: order._id.toString() },
      body: { returnReason: "Defective handle" },
    };
    const resReq = createMockRes();
    await returnUserOrder(reqReq, resReq);
    assert.strictEqual(resReq.statusCode, 200);

    let walletAfterReq = await Wallet.findOne({ userId: userA._id });
    assert.strictEqual(walletAfterReq.balance, initialBalance, "No refund on request stage");

    // Stage 2: Admin approves return
    const reqAppr = {
      params: { orderId: order._id.toString() },
      body: { adminComments: "Approved for inspection" },
    };
    const resAppr = createMockRes();
    await approveReturnRequest(reqAppr, resAppr);
    assert.strictEqual(resAppr.statusCode, 200);

    let walletAfterAppr = await Wallet.findOne({ userId: userA._id });
    assert.strictEqual(walletAfterAppr.balance, initialBalance, "No refund on approval stage");

    // Stage 3: Admin marks collection pending
    const reqPend = {
      params: { orderId: order._id.toString() },
      body: { adminComments: "Courier dispatched" },
    };
    const resPend = createMockRes();
    await markReturnCollectionPending(reqPend, resPend);
    assert.strictEqual(resPend.statusCode, 200);

    let walletAfterPend = await Wallet.findOne({ userId: userA._id });
    assert.strictEqual(walletAfterPend.balance, initialBalance, "No refund on collection pending stage");

    // Stage 4: Admin marks collected -> Refund is processed!
    const reqColl = {
      params: { orderId: order._id.toString() },
      body: { adminComments: "Product received by agent" },
    };
    const resColl = createMockRes();
    await markReturnCollected(reqColl, resColl);
    assert.strictEqual(resColl.statusCode, 200);

    let walletAfterColl = await Wallet.findOne({ userId: userA._id });
    assert.strictEqual(walletAfterColl.balance, initialBalance + 1000, "Refund credited at collected stage");
  });

  // =========================================================================
  // 14. Customer A cannot cancel or return Customer B's order
  // =========================================================================
  test("14. Customer A cannot cancel or return Customer B's order", async () => {
    const orderB = await seedOrder({
      userId: userB._id, // Belongs to Bob
      items: [
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          price: 1000,
          quantity: 1,
          totalPrice: 1000,
          itemStatus: "active",
        },
      ],
      subtotal: 1000,
      totalAmount: 1000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    // Alice tries to cancel Bob's order
    const reqCancel = {
      user: { userId: userA._id.toString() }, // Alice
      params: { orderId: orderB._id.toString() },
      body: { cancellationReason: "Malicious cancel" },
    };
    const resCancel = createMockRes();
    await cancelUserOrder(reqCancel, resCancel);

    assert.strictEqual(resCancel.statusCode, 404, "Must reject cross-user cancellation");

    // Alice tries to cancel Bob's item
    const reqCancelItem = {
      user: { userId: userA._id.toString() }, // Alice
      params: { orderId: orderB._id.toString(), itemId: orderB.items[0]._id.toString() },
      body: { cancellationReason: "Malicious item cancel" },
    };
    const resCancelItem = createMockRes();
    await cancelUserOrderItem(reqCancelItem, resCancelItem);

    assert.strictEqual(resCancelItem.statusCode, 404, "Must reject cross-user item cancellation");

    // Alice tries to return Bob's order
    const reqReturn = {
      user: { userId: userA._id.toString() }, // Alice
      params: { orderId: orderB._id.toString() },
      body: { returnReason: "Malicious return" },
    };
    const resReturn = createMockRes();
    await returnUserOrder(reqReturn, resReturn);

    assert.strictEqual(resReturn.statusCode, 404, "Must reject cross-user return");
  });

  // =========================================================================
  // 15. Invalid item IDs, quantities, statuses, and reasons are rejected
  // =========================================================================
  test("15. Invalid item IDs, quantities, statuses, and reasons are rejected", async () => {
    const order = await seedOrder({
      items: [
        {
          productId: product2._id,
          variantId: variant2,
          productName: "Ichigo Bankai Sword",
          sku: product2.variants[0].sku,
          price: 1000,
          quantity: 2,
          totalPrice: 2000,
          itemStatus: "active",
        },
      ],
      subtotal: 2000,
      totalAmount: 2000,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    const validItemId = order.items[0]._id.toString();

    // 15.1: Missing reason
    const res1 = createMockRes();
    await cancelUserOrderItem(
      {
        user: { userId: userA._id.toString() },
        params: { orderId: order._id.toString(), itemId: validItemId },
        body: { cancellationReason: "   " },
      },
      res1
    );
    assert.strictEqual(res1.statusCode, 400);

    // 15.2: Invalid itemId format
    const res2 = createMockRes();
    await cancelUserOrderItem(
      {
        user: { userId: userA._id.toString() },
        params: { orderId: order._id.toString(), itemId: "not-a-valid-id" },
        body: { cancellationReason: "Testing invalid ID" },
      },
      res2
    );
    assert.strictEqual(res2.statusCode, 400);

    // 15.3: Non-existent itemId
    const res3 = createMockRes();
    await cancelUserOrderItem(
      {
        user: { userId: userA._id.toString() },
        params: { orderId: order._id.toString(), itemId: new mongoose.Types.ObjectId().toString() },
        body: { cancellationReason: "Non-existent item" },
      },
      res3
    );
    assert.strictEqual(res3.statusCode, 404);

    // 15.4: Excessive quantity (> available)
    const res4 = createMockRes();
    await cancelUserOrderItem(
      {
        user: { userId: userA._id.toString() },
        params: { orderId: order._id.toString(), itemId: validItemId },
        body: { cancellationReason: "Cancel too many", quantity: 5 },
      },
      res4
    );
    assert.strictEqual(res4.statusCode, 400);

    // 15.5: Non-positive or float quantity
    const res5 = createMockRes();
    await cancelUserOrderItem(
      {
        user: { userId: userA._id.toString() },
        params: { orderId: order._id.toString(), itemId: validItemId },
        body: { cancellationReason: "Cancel negative", quantity: -1 },
      },
      res5
    );
    assert.strictEqual(res5.statusCode, 400);

    // 15.6: Ineligible order status (shipped)
    await Order.findByIdAndUpdate(order._id, { status: "shipped" });
    const res6 = createMockRes();
    await cancelUserOrderItem(
      {
        user: { userId: userA._id.toString() },
        params: { orderId: order._id.toString(), itemId: validItemId },
        body: { cancellationReason: "Cancel shipped order" },
      },
      res6
    );
    assert.strictEqual(res6.statusCode, 400);
    assert.match(res6.body.message, /cannot be cancelled|no longer be cancelled/i);
  });

  // =========================================================================
  // 16. Duplicate submissions and wallet transaction retries are idempotent
  // =========================================================================
  test("16. Duplicate submissions and wallet transaction retries are idempotent", async () => {
    const dummyOrderId = new mongoose.Types.ObjectId();
    const dummyItemId = new mongoose.Types.ObjectId();
    const opId = `OP-TEST-IDEMP-${Date.now()}`;

    // First wallet credit call
    const result1 = await creditWallet({
      userId: userB._id,
      amount: 500,
      reason: "order_cancellation_refund",
      orderId: dummyOrderId,
      orderItemId: dummyItemId,
      refundOperationId: opId,
    });

    assert.strictEqual(result1.alreadyCredited, false);
    const balanceAfter1 = result1.wallet.balance;

    // Retry call with identical orderId, orderItemId, and refundOperationId
    const result2 = await creditWallet({
      userId: userB._id,
      amount: 500,
      reason: "order_cancellation_refund",
      orderId: dummyOrderId,
      orderItemId: dummyItemId,
      refundOperationId: opId,
    });

    assert.strictEqual(result2.alreadyCredited, true, "Must flag retry as duplicate");
    assert.strictEqual(result2.wallet.balance, balanceAfter1, "Balance must not be incremented again");
  });
});
