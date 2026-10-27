import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import Order from "../src/features/order/models/Order.js";
import Wallet from "../src/features/wallet/models/wallet.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_schema_phase1";

describe("GETSUKA — Order Cancellation Phase 1: Final Schema Verification Tests", () => {
  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();
  });

  after(async () => {
    try {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    } catch {
      // Best effort cleanup
    }
  });

  // =========================================================================
  // FACT 1: Legacy order documents without original totals can be read & validated
  // =========================================================================
  test("CHECK 1: Legacy order documents inserted without originalSubtotal/originalTotalAmount can be read and validated", async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const variantId = new mongoose.Types.ObjectId();
    const addressId = new mongoose.Types.ObjectId();
    const legacyOrderId = new mongoose.Types.ObjectId();

    // Insert directly into MongoDB collection bypassing current Mongoose defaults,
    // exactly simulating a legacy order placed before Phase 1.
    await mongoose.connection.collection("orders").insertOne({
      _id: legacyOrderId,
      userId,
      orderNumber: `ORD-LEGACY-RAW-${Date.now()}`,
      items: [
        {
          _id: new mongoose.Types.ObjectId(),
          productId,
          variantId,
          productName: "Vintage Katana",
          sku: "VNT-KAT-01",
          quantity: 2,
          price: 2500,
          totalPrice: 5000,
          itemStatus: "active",
        },
      ],
      shippingAddress: {
        addressId,
        fullName: "Legacy Customer",
        phone: "9876543210",
        addressLine: "Old Market Street",
        city: "Tokyo",
        state: "Kanto",
        pincode: "100001",
      },
      subtotal: 5000,
      discount: 500,
      tax: 0,
      totalAmount: 4500,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "placed",
      returnStatus: "none",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Read back through Mongoose Order model
    const loadedOrder = await Order.findById(legacyOrderId);
    assert.ok(loadedOrder, "Legacy order must be readable through Order model");

    // Must pass validation without throwing errors
    await assert.doesNotReject(async () => {
      await loadedOrder.validate();
    }, "Legacy order must validate successfully without original totals");

    // Confirm originalSubtotal and originalTotalAmount are undefined on legacy order
    assert.strictEqual(loadedOrder.originalSubtotal, undefined);
    assert.strictEqual(loadedOrder.originalTotalAmount, undefined);
    assert.strictEqual(loadedOrder.subtotal, 5000);
    assert.strictEqual(loadedOrder.totalAmount, 4500);

    // Verify existing save operation continues to succeed
    await assert.doesNotReject(async () => {
      loadedOrder.cancellationReason = "Customer request";
      await loadedOrder.save();
    }, "Modifying and saving a legacy order must succeed");
  });

  // =========================================================================
  // FACT 2: New orders can explicitly initialize original totals without schema conflicts
  // =========================================================================
  test("CHECK 2: New orders can explicitly initialize original totals without schema conflicts", async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const variantId = new mongoose.Types.ObjectId();
    const addressId = new mongoose.Types.ObjectId();

    const newOrder = new Order({
      userId,
      orderNumber: `ORD-NEW-EXPLICIT-${Date.now()}`,
      items: [
        {
          productId,
          variantId,
          productName: "Demon Slayer Figure",
          sku: "DS-FIG-01",
          quantity: 1,
          price: 4000,
          totalPrice: 4000,
          discountShare: 500,
          cancelledQuantity: 0,
          returnedQuantity: 0,
          returnStatus: "none",
        },
      ],
      shippingAddress: {
        addressId,
        fullName: "New Customer",
        phone: "9876543210",
        addressLine: "Shinagawa 1-2-3",
        city: "Tokyo",
        state: "Kanto",
        pincode: "100002",
      },
      subtotal: 4000,
      originalSubtotal: 4000,
      discount: 500,
      originalDiscount: 500,
      tax: 0,
      totalAmount: 3500,
      originalTotalAmount: 3500,
      totalRefundedAmount: 0,
      paymentMethod: "razorpay",
      paymentStatus: "paid",
      status: "placed",
    });

    await assert.doesNotReject(async () => {
      await newOrder.validate();
      await newOrder.save();
    }, "New order with explicit original totals must validate and save");

    const fetched = await Order.findById(newOrder._id);
    assert.strictEqual(fetched.originalSubtotal, 4000);
    assert.strictEqual(fetched.originalDiscount, 500);
    assert.strictEqual(fetched.originalTotalAmount, 3500);
    assert.strictEqual(fetched.totalRefundedAmount, 0);
  });

  // =========================================================================
  // FACT 3: cancelledQuantity, returnedQuantity, discountShare are inside orderItemSchema
  // =========================================================================
  test("CHECK 3: cancelledQuantity, returnedQuantity, and discountShare are located inside orderItemSchema and not at order root", async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const variantId = new mongoose.Types.ObjectId();
    const addressId = new mongoose.Types.ObjectId();

    const order = new Order({
      userId,
      orderNumber: `ORD-ITEM-LOCATION-${Date.now()}`,
      items: [
        {
          productId,
          variantId,
          productName: "Anime Hoodie",
          sku: "HOODIE-BLK-L",
          quantity: 3,
          price: 2000,
          totalPrice: 6000,
          cancelledQuantity: 1,
          returnedQuantity: 0,
          discountShare: 300,
        },
      ],
      shippingAddress: {
        addressId,
        fullName: "Item Test",
        phone: "9876543210",
        addressLine: "Line",
        city: "City",
        state: "State",
        pincode: "123456",
      },
      subtotal: 6000,
      totalAmount: 6000,
      paymentMethod: "cod",
    });

    await order.validate();
    const item = order.items[0];

    // Located on item subdocument
    assert.strictEqual(item.cancelledQuantity, 1, "cancelledQuantity must reside on order item");
    assert.strictEqual(item.returnedQuantity, 0, "returnedQuantity must reside on order item");
    assert.strictEqual(item.discountShare, 300, "discountShare must reside on order item");

    // NOT located on order root
    assert.strictEqual(order.cancelledQuantity, undefined, "cancelledQuantity must NOT be on order root");
    assert.strictEqual(order.returnedQuantity, undefined, "returnedQuantity must NOT be on order root");
    assert.strictEqual(order.discountShare, undefined, "discountShare must NOT be on order root");
  });

  // =========================================================================
  // FACT 4: returnStatus and returnReason do not conflict between item and order level
  // =========================================================================
  test("CHECK 4: returnStatus and returnReason coexist independently at order level and item level without conflict", async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId1 = new mongoose.Types.ObjectId();
    const variantId1 = new mongoose.Types.ObjectId();
    const productId2 = new mongoose.Types.ObjectId();
    const variantId2 = new mongoose.Types.ObjectId();
    const addressId = new mongoose.Types.ObjectId();

    const order = new Order({
      userId,
      orderNumber: `ORD-RETURN-COEXIST-${Date.now()}`,
      items: [
        {
          productId: productId1,
          variantId: variantId1,
          productName: "Item A - Return Pending",
          sku: "SKU-A",
          quantity: 1,
          price: 1500,
          totalPrice: 1500,
          returnStatus: "pending",
          returnReason: "Defective item zipper",
        },
        {
          productId: productId2,
          variantId: variantId2,
          productName: "Item B - Kept By Customer",
          sku: "SKU-B",
          quantity: 1,
          price: 1500,
          totalPrice: 1500,
          returnStatus: "none",
          returnReason: "",
        },
      ],
      shippingAddress: {
        addressId,
        fullName: "Return Customer",
        phone: "9876543210",
        addressLine: "Line",
        city: "City",
        state: "State",
        pincode: "123456",
      },
      subtotal: 3000,
      totalAmount: 3000,
      paymentMethod: "cod",
      // Order level return status
      returnStatus: "approved",
      returnReason: "Order return authorized by admin",
    });

    await assert.doesNotReject(async () => {
      await order.validate();
      await order.save();
    }, "Order and items must co-exist with distinct returnStatus and returnReason");

    const retrieved = await Order.findById(order._id);

    // Order level fields
    assert.strictEqual(retrieved.returnStatus, "approved");
    assert.strictEqual(retrieved.returnReason, "Order return authorized by admin");

    // Item 1 fields
    assert.strictEqual(retrieved.items[0].returnStatus, "pending");
    assert.strictEqual(retrieved.items[0].returnReason, "Defective item zipper");

    // Item 2 fields
    assert.strictEqual(retrieved.items[1].returnStatus, "none");
    assert.strictEqual(retrieved.items[1].returnReason, "");
  });

  // =========================================================================
  // FACT 5: orderItemId is inside the wallet transaction subdocument, not wallet root
  // =========================================================================
  test("CHECK 5: orderItemId resides inside wallet transaction subdocument, NOT at wallet root", async () => {
    const userId = new mongoose.Types.ObjectId();
    const orderId = new mongoose.Types.ObjectId();
    const orderItemId = new mongoose.Types.ObjectId();

    const wallet = await Wallet.create({
      userId,
      balance: 1500,
      transactions: [
        {
          type: "credit",
          amount: 500,
          reason: "order_cancellation_refund",
          description: "Refund for item cancellation",
          orderId,
          orderItemId,
          balanceAfterTransaction: 500,
        },
        {
          type: "credit",
          amount: 1000,
          reason: "wallet_topup",
          description: "Topup without item",
          // orderItemId omitted: should default to null
          balanceAfterTransaction: 1500,
        },
      ],
    });

    const retrievedWallet = await Wallet.findById(wallet._id);

    // 1. Located inside transactions subdocuments
    assert.strictEqual(
      retrievedWallet.transactions[0].orderItemId.toString(),
      orderItemId.toString(),
      "orderItemId must be stored on transaction subdocument"
    );
    assert.strictEqual(
      retrievedWallet.transactions[1].orderItemId,
      null,
      "orderItemId must default to null on transaction subdocument when omitted"
    );

    // 2. NOT located at wallet root
    assert.strictEqual(
      retrievedWallet.orderItemId,
      undefined,
      "orderItemId must NOT exist on wallet root document"
    );
  });

  // =========================================================================
  // FACT 6: Rejection of negative numbers and invalid enum types
  // =========================================================================
  test("CHECK 6: Validations strictly enforce min >= 0 and enum whitelists", async () => {
    const userId = new mongoose.Types.ObjectId();
    const productId = new mongoose.Types.ObjectId();
    const variantId = new mongoose.Types.ObjectId();
    const addressId = new mongoose.Types.ObjectId();

    // Negative originalSubtotal rejected
    const invalidSubtotal = new Order({
      userId,
      orderNumber: `ORD-INVALID-SUB-${Date.now()}`,
      items: [{ productId, variantId, productName: "P", sku: "S", quantity: 1, price: 10, totalPrice: 10 }],
      shippingAddress: { addressId, fullName: "U", phone: "1", addressLine: "L", city: "C", state: "S", pincode: "1" },
      subtotal: 10,
      originalSubtotal: -100, // Invalid!
      totalAmount: 10,
      paymentMethod: "cod",
    });
    await assert.rejects(async () => {
      await invalidSubtotal.validate();
    }, /originalSubtotal.*minimum/i);

    // Negative originalTotalAmount rejected
    const invalidTotal = new Order({
      userId,
      orderNumber: `ORD-INVALID-TOT-${Date.now()}`,
      items: [{ productId, variantId, productName: "P", sku: "S", quantity: 1, price: 10, totalPrice: 10 }],
      shippingAddress: { addressId, fullName: "U", phone: "1", addressLine: "L", city: "C", state: "S", pincode: "1" },
      subtotal: 10,
      totalAmount: 10,
      originalTotalAmount: -50, // Invalid!
      paymentMethod: "cod",
    });
    await assert.rejects(async () => {
      await invalidTotal.validate();
    }, /originalTotalAmount.*minimum/i);

    // Invalid item returnStatus enum rejected
    const invalidEnum = new Order({
      userId,
      orderNumber: `ORD-INVALID-ENUM-${Date.now()}`,
      items: [{
        productId,
        variantId,
        productName: "P",
        sku: "S",
        quantity: 1,
        price: 10,
        totalPrice: 10,
        returnStatus: "fraudulent_return", // Invalid!
      }],
      shippingAddress: { addressId, fullName: "U", phone: "1", addressLine: "L", city: "C", state: "S", pincode: "1" },
      subtotal: 10,
      totalAmount: 10,
      paymentMethod: "cod",
    });
    await assert.rejects(async () => {
      await invalidEnum.validate();
    }, /returnStatus.*valid enum value/i);
  });
});
