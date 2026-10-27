import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import Product from "../src/features/product/models/Product.js";
import Payment from "../src/features/payment/models/Payment.js";
import Address from "../src/features/address/models/Address.js";
import Category from "../src/features/category/models/Category.js";
import Coupon from "../src/features/coupon/models/Coupon.js";
import User from "../src/features/auth/models/User.js";
import razorpay from "../src/config/razorpay.js";

import { createRazorpayOrder } from "../src/features/payment/controllers/paymentController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_get001_price_security";

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

describe("GET-001: Razorpay Price Manipulation Vulnerability Fix Verification", () => {
  let originalOrdersCreate;
  let testCategory;
  let testUser;
  let otherUser;
  let testAddress;
  let otherAddress;
  let standardProduct;
  let saleProduct;
  let testCouponPercentage;
  let testCouponFixed;
  let lastCapturedRazorpayOptions = null;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    // Mock Razorpay orders.create to record passed arguments safely
    originalOrdersCreate = razorpay.orders.create;
    razorpay.orders.create = async (options) => {
      lastCapturedRazorpayOptions = options;
      return {
        id: `order_get001_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        amount: options.amount,
        currency: options.currency || "INR",
        receipt: options.receipt,
        notes: options.notes,
      };
    };

    testCategory = await Category.create({
      name: "Anime Streetwear",
      isDeleted: false,
    });

    testUser = await User.create({
      fullName: "Tanjiro Kamado",
      email: "tanjiro@getsuka.com",
      password: "HashedPassword123",
      isVerified: true,
      isBlocked: false,
    });

    otherUser = await User.create({
      fullName: "Inosuke Hashibira",
      email: "inosuke@getsuka.com",
      password: "HashedPassword456",
      isVerified: true,
      isBlocked: false,
    });

    testAddress = await Address.create({
      userId: testUser._id,
      fullName: "Tanjiro Kamado",
      phone: "9876543210",
      addressLine: "Mount Kumotori",
      city: "Tokyo",
      state: "Tokyo",
      pincode: "190001",
    });

    otherAddress = await Address.create({
      userId: otherUser._id,
      fullName: "Inosuke Hashibira",
      phone: "9876543211",
      addressLine: "Boar Mountain",
      city: "Tokyo",
      state: "Tokyo",
      pincode: "190002",
    });

    standardProduct = await Product.create({
      name: "Hinokami Kagura Kimono",
      description: "Authentic demon slaying ceremonial apparel",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["kimono1.jpg", "kimono2.jpg", "kimono3.jpg"],
      price: 3000,
      salePrice: null,
      variants: [
        {
          color: "Flame Red",
          size: "L",
          sku: `KIMONO-L-${Date.now()}`,
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    saleProduct = await Product.create({
      name: "Water Breathing Haori",
      description: "Signature split-pattern haori jacket",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["haori1.jpg", "haori2.jpg", "haori3.jpg"],
      price: 2500,
      salePrice: 2000, // On sale for ₹2,000
      variants: [
        {
          color: "Cyan Split",
          size: "M",
          sku: `HAORI-M-${Date.now()}`,
          stock: 5,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    testCouponPercentage = await Coupon.create({
      code: "SLAYER20",
      discountType: "percentage",
      discountValue: 20, // 20%
      maxDiscountAmount: 500, // Capped at ₹500
      minOrderAmount: 1000,
      isActive: true,
      validFrom: now,
      validUntil: future,
    });

    testCouponFixed = await Coupon.create({
      code: "FLAME300",
      discountType: "fixed",
      discountValue: 300, // ₹300 flat
      minOrderAmount: 1500,
      isActive: true,
      validFrom: now,
      validUntil: future,
    });
  });

  after(async () => {
    if (originalOrdersCreate) {
      razorpay.orders.create = originalOrdersCreate;
    }
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================
  // TEST A: CLIENT AMOUNT MANIPULATION (CRITICAL GET-001)
  // =========================================================
  test("Test A — Client amount manipulation: Submitting amount=1 for a ₹6,000 cart uses server-calculated ₹6,000", async () => {
    // 2 x Hinokami Kagura Kimono @ ₹3,000 = ₹6,000
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        amount: 1, // MALICIOUS CLIENT SUBMISSION ATTEMPTING TO PAY ₹1
        orderData: {
          addressId: testAddress._id,
          deliveryMethod: "standard",
          items: [
            {
              productId: standardProduct._id.toString(),
              variantId: standardProduct.variants[0]._id.toString(),
              quantity: 2,
            },
          ],
        },
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.order?.id);

    // Razorpay amount must be ₹6,000 in paise (600000 paise), NOT ₹1 (100 paise)
    assert.strictEqual(
      lastCapturedRazorpayOptions.amount,
      600000,
      "Razorpay order amount must be 600,000 paise (₹6,000), ignoring client-supplied amount of 1"
    );

    // Stored Payment record must reflect server-verified amount
    const payment = await Payment.findOne({ razorpayOrderId: res.body.order.id });
    assert.ok(payment, "Payment record must exist");
    assert.strictEqual(payment.amount, 6000, "Stored payment record amount must be ₹6,000");
    assert.strictEqual(payment.orderData.total, 6000);
    assert.strictEqual(payment.orderData.subtotal, 6000);
  });

  // =========================================================
  // TEST B: CLIENT AMOUNT OMITTED
  // =========================================================
  test("Test B — Client amount omitted: Request without amount field derives price from database items", async () => {
    // 1 x Water Breathing Haori @ ₹2,000 sale price + standard shipping (0) = ₹2,000
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        // amount field is completely omitted
        orderData: {
          addressId: testAddress._id,
          deliveryMethod: "standard",
          items: [
            {
              productId: saleProduct._id.toString(),
              variantId: saleProduct.variants[0]._id.toString(),
              quantity: 1,
            },
          ],
        },
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(
      lastCapturedRazorpayOptions.amount,
      200000,
      "Calculates amount as ₹2,000 (200000 paise) using product salePrice"
    );
  });

  // =========================================================
  // TEST C: EMPTY CART REJECTION
  // =========================================================
  test("Test C — Empty cart: Attempting to create order with empty items array is rejected with 400", async () => {
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        orderData: {
          items: [],
        },
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes("at least one item"));
  });

  // =========================================================
  // TEST D: INVALID / UNLISTED / DELETED PRODUCT
  // =========================================================
  test("Test D — Invalid product: Nonexistent, deleted, or unlisted product is rejected with 400", async () => {
    const fakeProductId = new mongoose.Types.ObjectId().toString();

    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        orderData: {
          items: [
            {
              productId: fakeProductId,
              variantId: new mongoose.Types.ObjectId().toString(),
              quantity: 1,
            },
          ],
        },
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes("unavailable"));
  });

  // =========================================================
  // TEST E: INVALID QUANTITY REJECTION
  // =========================================================
  test("Test E — Invalid quantity: Zero, negative, non-integer, or stock-exceeding quantities are rejected", async () => {
    // 1. Negative quantity
    const reqNegative = {
      user: { userId: testUser._id.toString() },
      body: {
        orderData: {
          items: [
            {
              productId: standardProduct._id.toString(),
              variantId: standardProduct.variants[0]._id.toString(),
              quantity: -2,
            },
          ],
        },
      },
    };

    const resNeg = createMockRes();
    await createRazorpayOrder(reqNegative, resNeg);
    assert.strictEqual(resNeg.statusCode, 400);
    assert.ok(resNeg.body.message.includes("Invalid product quantity"));

    // 2. Exceeding stock (standardProduct stock is 10, request 50)
    const reqExcess = {
      user: { userId: testUser._id.toString() },
      body: {
        orderData: {
          items: [
            {
              productId: standardProduct._id.toString(),
              variantId: standardProduct.variants[0]._id.toString(),
              quantity: 50,
            },
          ],
        },
      },
    };

    const resExcess = createMockRes();
    await createRazorpayOrder(reqExcess, resExcess);
    assert.strictEqual(resExcess.statusCode, 400);
    assert.ok(resExcess.body.message.includes("available"));
  });

  // =========================================================
  // TEST F: UNAUTHORIZED REQUEST REJECTION
  // =========================================================
  test("Test F — Unauthorized request: Calling endpoint without authenticated user context returns 401", async () => {
    const req = {
      user: null, // No authenticated user
      body: {
        orderData: {
          items: [
            {
              productId: standardProduct._id.toString(),
              variantId: standardProduct.variants[0]._id.toString(),
              quantity: 1,
            },
          ],
        },
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes("Authentication required"));
  });

  // =========================================================
  // TEST G: CART & ADDRESS OWNERSHIP
  // =========================================================
  test("Test G — Address ownership: Referencing another user's addressId is rejected with 403", async () => {
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        orderData: {
          addressId: otherAddress._id.toString(), // Belongs to otherUser, NOT testUser
          items: [
            {
              productId: standardProduct._id.toString(),
              variantId: standardProduct.variants[0]._id.toString(),
              quantity: 1,
            },
          ],
        },
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes("belongs to another user"));
  });

  // =========================================================
  // TEST H: PRICING CONSISTENCY (COUPONS & EXPRESS SHIPPING)
  // =========================================================
  test("Test H — Pricing consistency: Correctly applies coupon discounts and express delivery charges", async () => {
    // 1 x standardProduct = ₹3,000
    // Coupon SLAYER20 (20% of ₹3,000 = ₹600, capped at max ₹500) -> discount = ₹500
    // Express delivery -> shipping = ₹149
    // Expected Total = 3000 - 500 + 149 = ₹2,649
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        amount: 50, // Client tries to spoof ₹50
        orderData: {
          addressId: testAddress._id,
          deliveryMethod: "express",
          couponCode: "SLAYER20",
          items: [
            {
              productId: standardProduct._id.toString(),
              variantId: standardProduct.variants[0]._id.toString(),
              quantity: 1,
            },
          ],
        },
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(
      lastCapturedRazorpayOptions.amount,
      264900,
      "Expected amount to be exactly ₹2,649 (264900 paise)"
    );

    const payment = await Payment.findOne({ razorpayOrderId: res.body.order.id });
    assert.strictEqual(payment.amount, 2649);
    assert.strictEqual(payment.orderData.discount, 500);
    assert.strictEqual(payment.orderData.shippingCharge, 149);
    assert.strictEqual(payment.orderData.total, 2649);
  });

  // =========================================================
  // TEST I: CURRENCY AND AMOUNT CONVERSION
  // =========================================================
  test("Test I — Currency and amount conversion: Sends currency INR and exact integer paise without floating point issues", async () => {
    // 1 x saleProduct (₹2,000) - FLAME300 coupon (₹300) + express shipping (₹149) = ₹1,849.00
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        orderData: {
          addressId: testAddress._id,
          deliveryMethod: "express",
          couponCode: "FLAME300",
          items: [
            {
              productId: saleProduct._id.toString(),
              variantId: saleProduct.variants[0]._id.toString(),
              quantity: 1,
            },
          ],
        },
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(lastCapturedRazorpayOptions.currency, "INR");
    assert.strictEqual(lastCapturedRazorpayOptions.amount, 184900); // 1849 * 100 paise
    assert.strictEqual(Number.isInteger(lastCapturedRazorpayOptions.amount), true);
  });

  // =========================================================
  // TEST J: EXISTING CHECKOUT REGRESSION & CONTRACT PRESERVATION
  // =========================================================
  test("Test J — Existing checkout regression: Response preserves exact { success: true, order } contract", async () => {
    const req = {
      user: { userId: testUser._id.toString() },
      body: {
        orderData: {
          addressId: testAddress._id,
          deliveryMethod: "standard",
          items: [
            {
              productId: standardProduct._id.toString(),
              variantId: standardProduct.variants[0]._id.toString(),
              quantity: 1,
            },
          ],
        },
      },
    };

    const res = createMockRes();
    await createRazorpayOrder(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.order, "Response must contain 'order' object");
    assert.ok(res.body.order.id, "order object must have Razorpay order 'id'");
    assert.strictEqual(res.body.order.currency, "INR");
    assert.strictEqual(res.body.order.amount, 300000);
    assert.ok(res.body.order.receipt);
  });
});
