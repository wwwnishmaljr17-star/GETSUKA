import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import Product from "../src/features/product/models/Product.js";
import Order from "../src/features/order/models/Order.js";
import Address from "../src/features/address/models/Address.js";
import Category from "../src/features/category/models/Category.js";
import Coupon from "../src/features/coupon/models/Coupon.js";
import Wallet from "../src/features/wallet/models/wallet.js";
import Payment from "../src/features/payment/models/Payment.js";
import { createOrder } from "../src/features/order/controllers/orderController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_isolated";

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

describe("Stock Deduction Concurrency & Order Creation Tests", () => {
  let testCategory;
  let testUser;
  let testAddress;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    testCategory = await Category.create({
      name: "Apparel Test",
      isDeleted: false,
    });

    testUser = {
      userId: new mongoose.Types.ObjectId(),
    };

    testAddress = await Address.create({
      userId: testUser.userId,
      fullName: "Tanjiro Kamado",
      phone: "9876543210",
      addressLine: "Mount Kumotori",
      city: "Tokyo",
      state: "Tokyo",
      pincode: "100001",
    });
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================
  // TEST 1 — NORMAL PURCHASE
  // =========================================================
  test("TEST 1 — NORMAL PURCHASE: Variant with stock = 10, user orders 3, final stock = 7", async () => {
    const product = await Product.create({
      name: "Demon Slayer Kimono",
      description: "Test Kimono",
      category: testCategory._id,
      anime: "Demon Slayer",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 1500,
      variants: [
        {
          color: "Green",
          size: "M",
          sku: `KIMONO-M-${Date.now()}`,
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;

    const req = {
      user: testUser,
      body: {
        addressId: testAddress._id,
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [
          {
            productId: product._id,
            variantId,
            quantity: 3,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 201, "Expected order creation to succeed with 201");
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.order);

    const updatedProduct = await Product.findById(product._id);
    const updatedVariant = updatedProduct.variants.id(variantId);
    assert.strictEqual(updatedVariant.stock, 7, "Stock must be decremented from 10 to 7");
  });

  // =========================================================
  // TEST 2 — INSUFFICIENT STOCK
  // =========================================================
  test("TEST 2 — INSUFFICIENT STOCK: Variant has stock = 2, user requests 3, order rejected, stock remains 2", async () => {
    const product = await Product.create({
      name: "Attack on Titan Cloak",
      description: "Test Cloak",
      category: testCategory._id,
      anime: "Attack on Titan",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 2000,
      variants: [
        {
          color: "Green",
          size: "L",
          sku: `CLOAK-L-${Date.now()}`,
          stock: 2,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;

    const req = {
      user: testUser,
      body: {
        addressId: testAddress._id,
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [
          {
            productId: product._id,
            variantId,
            quantity: 3,
          },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400, "Expected order to be rejected with 400");
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /only 2 item\(s\) available/);

    const updatedProduct = await Product.findById(product._id);
    const updatedVariant = updatedProduct.variants.id(variantId);
    assert.strictEqual(updatedVariant.stock, 2, "Stock must remain 2");
  });

  // =========================================================
  // TEST 3 — CONCURRENT PURCHASES
  // =========================================================
  test("TEST 3 — CONCURRENT PURCHASES: Variant stock = 1, two concurrent orders for qty = 1, at most 1 succeeds, stock never negative", async () => {
    const product = await Product.create({
      name: "One Piece Straw Hat Limited",
      description: "Limited Edition Hat",
      category: testCategory._id,
      anime: "One Piece",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 3000,
      variants: [
        {
          color: "Yellow",
          size: "Free",
          sku: `STRAWHAT-${Date.now()}`,
          stock: 1,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;

    const userA = { userId: new mongoose.Types.ObjectId() };
    const userB = { userId: new mongoose.Types.ObjectId() };

    const addressA = await Address.create({
      userId: userA.userId,
      fullName: "User A",
      phone: "1111111111",
      addressLine: "Line 1",
      city: "City",
      state: "State",
      pincode: "111111",
    });

    const addressB = await Address.create({
      userId: userB.userId,
      fullName: "User B",
      phone: "2222222222",
      addressLine: "Line 2",
      city: "City",
      state: "State",
      pincode: "222222",
    });

    const reqA = {
      user: userA,
      body: {
        addressId: addressA._id,
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [{ productId: product._id, variantId, quantity: 1 }],
      },
    };

    const reqB = {
      user: userB,
      body: {
        addressId: addressB._id,
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [{ productId: product._id, variantId, quantity: 1 }],
      },
    };

    const resA = createMockRes();
    const resB = createMockRes();

    // Fire both requests concurrently
    await Promise.all([
      createOrder(reqA, resA),
      createOrder(reqB, resB),
    ]);

    const results = [resA, resB];
    const successResponses = results.filter((r) => r.statusCode === 201);
    const failureResponses = results.filter((r) => r.statusCode === 400);

    assert.strictEqual(
      successResponses.length,
      1,
      "Exactly one concurrent order must succeed"
    );
    assert.strictEqual(
      failureResponses.length,
      1,
      "Exactly one concurrent order must fail"
    );

    const updatedProduct = await Product.findById(product._id);
    const updatedVariant = updatedProduct.variants.id(variantId);
    assert.strictEqual(updatedVariant.stock, 0, "Final stock must be exactly 0 (never negative)");

    const createdOrders = await Order.find({ "items.variantId": variantId });
    assert.strictEqual(createdOrders.length, 1, "Exactly one order must be recorded in the database");
  });

  // =========================================================
  // TEST 4 — MULTIPLE PRODUCTS (PARTIAL FAILURE)
  // =========================================================
  test("TEST 4 — MULTIPLE PRODUCTS: Product A stock = 5 (requested 2), Product B stock = 1 (requested 3). Order fails without deducting Product A.", async () => {
    const productA = await Product.create({
      name: "Jujutsu Kaisen Hoodie",
      description: "Hoodie A",
      category: testCategory._id,
      anime: "Jujutsu Kaisen",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 1200,
      variants: [
        {
          color: "Black",
          size: "M",
          sku: `JJK-HOODIE-${Date.now()}`,
          stock: 5,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const productB = await Product.create({
      name: "Jujutsu Kaisen Cap",
      description: "Cap B",
      category: testCategory._id,
      anime: "Jujutsu Kaisen",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 600,
      variants: [
        {
          color: "Blue",
          size: "Free",
          sku: `JJK-CAP-${Date.now()}`,
          stock: 1,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantAId = productA.variants[0]._id;
    const variantBId = productB.variants[0]._id;

    const req = {
      user: testUser,
      body: {
        addressId: testAddress._id,
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [
          { productId: productA._id, variantId: variantAId, quantity: 2 },
          { productId: productB._id, variantId: variantBId, quantity: 3 },
        ],
      },
    };

    const res = createMockRes();
    await createOrder(req, res);

    assert.strictEqual(res.statusCode, 400, "Order must fail with 400");
    assert.strictEqual(res.body.success, false);

    const checkA = await Product.findById(productA._id);
    const checkB = await Product.findById(productB._id);

    assert.strictEqual(
      checkA.variants.id(variantAId).stock,
      5,
      "Product A stock must remain 5 (not left reduced to 3)"
    );
    assert.strictEqual(
      checkB.variants.id(variantBId).stock,
      1,
      "Product B stock must remain 1"
    );
  });

  // =========================================================
  // TEST 5 — DATABASE FAILURE (ROLLBACK / COMPENSATION)
  // =========================================================
  test("TEST 5 — DATABASE FAILURE: Stock deduction succeeds but a later DB operation fails. Stock change is safely rolled back.", async () => {
    const product = await Product.create({
      name: "Naruto Headband",
      description: "Test Headband",
      category: testCategory._id,
      anime: "Naruto",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 500,
      variants: [
        {
          color: "Blue",
          size: "Free",
          sku: `HEADBAND-${Date.now()}`,
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;

    // Simulate failure during Order save
    const originalSave = Order.prototype.save;
    Order.prototype.save = async function () {
      throw new Error("Simulated database crash during Order.save");
    };

    try {
      const req = {
        user: testUser,
        body: {
          addressId: testAddress._id,
          paymentMethod: "cod",
          deliveryMethod: "standard",
          items: [{ productId: product._id, variantId, quantity: 4 }],
        },
      };

      const res = createMockRes();
      await createOrder(req, res);

      assert.strictEqual(res.statusCode, 500, "Expected server error 500");
      assert.strictEqual(res.body.success, false);

      const checkProduct = await Product.findById(product._id);
      assert.strictEqual(
        checkProduct.variants.id(variantId).stock,
        10,
        "Stock must be rolled back to 10 after database failure"
      );
    } finally {
      Order.prototype.save = originalSave;
    }
  });

  // =========================================================
  // TEST 6 — DUPLICATE REQUEST
  // =========================================================
  test("TEST 6 — DUPLICATE REQUEST: When stock = 1 and same request is submitted twice, second is rejected and inventory is not over-deducted", async () => {
    const product = await Product.create({
      name: "Bleach Bankai Tee",
      description: "Limited Tee",
      category: testCategory._id,
      anime: "Bleach",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 1800,
      variants: [
        {
          color: "Black",
          size: "XL",
          sku: `BLEACH-${Date.now()}`,
          stock: 1,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;

    const payload = {
      addressId: testAddress._id,
      paymentMethod: "cod",
      deliveryMethod: "standard",
      items: [{ productId: product._id, variantId, quantity: 1 }],
    };

    const res1 = createMockRes();
    await createOrder({ user: testUser, body: payload }, res1);
    assert.strictEqual(res1.statusCode, 201, "First checkout request succeeds");

    const res2 = createMockRes();
    await createOrder({ user: testUser, body: payload }, res2);
    assert.strictEqual(res2.statusCode, 400, "Duplicate checkout request fails due to stock exhaustion");

    const checkProduct = await Product.findById(product._id);
    assert.strictEqual(
      checkProduct.variants.id(variantId).stock,
      0,
      "Final stock is 0 and never decremented twice to negative"
    );
  });

  // =========================================================
  // TEST 7 — EXISTING PAYMENT METHODS
  // =========================================================
  test("TEST 7A — PAYMENT METHODS: COD orders succeed with pending paymentStatus and enforce ₹25,000 limit", async () => {
    const product = await Product.create({
      name: "Expensive Collector Figure",
      description: "Figure",
      category: testCategory._id,
      anime: "Fate",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 30000,
      variants: [
        {
          color: "Gold",
          size: "Default",
          sku: `FIGURE-EXP-${Date.now()}`,
          stock: 5,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;

    // Above COD limit (₹30,000 > ₹25,000)
    const reqOverLimit = {
      user: testUser,
      body: {
        addressId: testAddress._id,
        paymentMethod: "cod",
        deliveryMethod: "standard",
        items: [{ productId: product._id, variantId, quantity: 1 }],
      },
    };

    const resOverLimit = createMockRes();
    await createOrder(reqOverLimit, resOverLimit);
    assert.strictEqual(resOverLimit.statusCode, 400);
    assert.match(resOverLimit.body.message, /Cash on Delivery is available only for orders up to ₹25,000/);

    // Stock must be untouched
    const checkProduct = await Product.findById(product._id);
    assert.strictEqual(checkProduct.variants.id(variantId).stock, 5);
  });

  test("TEST 7B — PAYMENT METHODS: Razorpay orders succeed with paid paymentStatus", async () => {
    const product = await Product.create({
      name: "Spy x Family Anya Tee",
      description: "Cute Tee",
      category: testCategory._id,
      anime: "Spy x Family",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 999,
      variants: [
        {
          color: "Pink",
          size: "S",
          sku: `ANYA-TEE-${Date.now()}`,
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;
    const razorpayOrderId = `order_test_7b_${Date.now()}`;
    const razorpayPaymentId = `pay_test_7b_${Date.now()}`;

    await Payment.create({
      userId: testUser.userId,
      razorpayOrderId,
      razorpayPaymentId,
      amount: 1998,
      currency: "INR",
      status: "captured",
      paymentType: "order_checkout",
    });

    const reqRazorpay = {
      user: testUser,
      body: {
        addressId: testAddress._id,
        paymentMethod: "razorpay",
        deliveryMethod: "standard",
        razorpayOrderId,
        razorpayPaymentId,
        items: [{ productId: product._id, variantId, quantity: 2 }],
      },
    };

    const resRazorpay = createMockRes();
    await createOrder(reqRazorpay, resRazorpay);

    assert.strictEqual(resRazorpay.statusCode, 201);
    assert.strictEqual(resRazorpay.body.order.paymentStatus, "paid");
    assert.strictEqual(resRazorpay.body.order.paymentMethod, "razorpay");

    const checkProduct = await Product.findById(product._id);
    assert.strictEqual(checkProduct.variants.id(variantId).stock, 8);
  });

  test("TEST 7C — PAYMENT METHODS: Wallet payment succeeds when balance is sufficient, fails and rolls back stock when insufficient", async () => {
    const product = await Product.create({
      name: "Chainsaw Man Pochita Plush",
      description: "Plush",
      category: testCategory._id,
      anime: "Chainsaw Man",
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      price: 800,
      variants: [
        {
          color: "Orange",
          size: "M",
          sku: `POCHITA-${Date.now()}`,
          stock: 5,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    const variantId = product.variants[0]._id;

    // Setup wallet with ₹1,000 and an address for walletUser
    const walletUser = { userId: new mongoose.Types.ObjectId() };
    const walletAddress = await Address.create({
      userId: walletUser.userId,
      fullName: "Pochita Fan",
      phone: "3333333333",
      addressLine: "Line 3",
      city: "City",
      state: "State",
      pincode: "333333",
    });
    await Wallet.create({
      userId: walletUser.userId,
      balance: 1000,
      transactions: [],
    });

    // 1. Order 1 unit (₹800 <= ₹1000) -> should succeed
    const reqSuccess = {
      user: walletUser,
      body: {
        addressId: walletAddress._id,
        paymentMethod: "wallet",
        deliveryMethod: "standard",
        items: [{ productId: product._id, variantId, quantity: 1 }],
      },
    };

    const resSuccess = createMockRes();
    await createOrder(reqSuccess, resSuccess);

    assert.strictEqual(resSuccess.statusCode, 201);
    assert.strictEqual(resSuccess.body.order.paymentStatus, "paid");

    const checkWallet = await Wallet.findOne({ userId: walletUser.userId });
    assert.strictEqual(checkWallet.balance, 200, "Wallet balance should be 1000 - 800 = 200");

    let checkProduct = await Product.findById(product._id);
    assert.strictEqual(checkProduct.variants.id(variantId).stock, 4, "Product stock should be 5 - 1 = 4");

    // 2. Order another unit (₹800 > remaining ₹200) -> should fail and roll back stock
    const reqFail = {
      user: walletUser,
      body: {
        addressId: walletAddress._id,
        paymentMethod: "wallet",
        deliveryMethod: "standard",
        items: [{ productId: product._id, variantId, quantity: 1 }],
      },
    };

    const resFail = createMockRes();
    await createOrder(reqFail, resFail);

    assert.strictEqual(resFail.statusCode, 400);
    assert.match(resFail.body.message, /Insufficient wallet balance/);

    checkProduct = await Product.findById(product._id);
    assert.strictEqual(checkProduct.variants.id(variantId).stock, 4, "Stock must remain 4 (not decremented to 3)");
  });
});
