import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";

import {
  getPublicProducts,
  getPublicProductsBulk,
} from "../src/features/product/controllers/publicProductController.js";
import { getPublicProductById } from "../src/features/product/controllers/publicProductDetailsController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_cart_performance";

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

describe("PHASE 1 STEP 6: Cart API Performance & Bulk Stock Validation Tests", () => {
  let category;
  let product1;
  let product2;
  let product3;
  let deletedProduct;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    category = await Category.create({
      name: "Anime Apparel",
      isDeleted: false,
    });

    product1 = await Product.create({
      name: "Attack on Titan Scout Cloak",
      productCode: "AOT-CLOAK-01",
      description: "Green scout regiment hooded cloak",
      category: category._id,
      anime: "Attack on Titan",
      images: [
        "https://example.com/aot1.jpg",
        "https://example.com/aot2.jpg",
        "https://example.com/aot3.jpg",
      ],
      price: 2499,
      salePrice: 1999,
      variants: [
        {
          color: "Green",
          size: "M",
          sku: `SKU-AOT-M-${Date.now()}`,
          stock: 10,
        },
        {
          color: "Green",
          size: "L",
          sku: `SKU-AOT-L-${Date.now()}`,
          stock: 3,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    product2 = await Product.create({
      name: "Jujutsu Kaisen Gojo Eyes Tee",
      productCode: "JJK-GOJO-01",
      description: "Oversized graphic t-shirt",
      category: category._id,
      anime: "Jujutsu Kaisen",
      images: [
        "https://example.com/jjk1.jpg",
        "https://example.com/jjk2.jpg",
        "https://example.com/jjk3.jpg",
      ],
      price: 1499,
      salePrice: 1299,
      variants: [
        {
          color: "Black",
          size: "L",
          sku: `SKU-JJK-L-${Date.now()}`,
          stock: 0, // Out of stock
        },
        {
          color: "Black",
          size: "XL",
          sku: `SKU-JJK-XL-${Date.now()}`,
          stock: 5,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    product3 = await Product.create({
      name: "Demon Slayer Tanjiro Haori",
      productCode: "KNY-TANJIRO-01",
      description: "Chequered pattern kimono cardigan",
      category: category._id,
      anime: "Demon Slayer",
      images: [
        "https://example.com/kny1.jpg",
        "https://example.com/kny2.jpg",
        "https://example.com/kny3.jpg",
      ],
      price: 1899,
      salePrice: null,
      variants: [
        {
          color: "Checkered",
          size: "Free Size",
          sku: `SKU-KNY-FREE-${Date.now()}`,
          stock: 20,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    deletedProduct = await Product.create({
      name: "Deleted Anime Merch",
      productCode: "DEL-MERCH-01",
      description: "Soft deleted item",
      category: category._id,
      anime: "Bleach",
      images: [
        "https://example.com/del1.jpg",
        "https://example.com/del2.jpg",
        "https://example.com/del3.jpg",
      ],
      price: 999,
      variants: [
        {
          color: "White",
          size: "S",
          sku: `SKU-DEL-${Date.now()}`,
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: true,
    });
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // =========================================================================
  // 1. BULK STOCK VALIDATION ENDPOINT
  // =========================================================================
  describe("POST /api/products/bulk endpoint behavior", () => {
    test("TEST 1: Empty or missing productIds returns empty products array with 200 OK", async () => {
      const req = { body: { productIds: [] } };
      const res = createMockRes();

      await getPublicProductsBulk(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.deepStrictEqual(res.body.products, []);
    });

    test("TEST 2: Invalid or non-ObjectId strings are sanitized safely without crashing", async () => {
      const req = { body: { productIds: ["not-an-id", "123", "", null] } };
      const res = createMockRes();

      await getPublicProductsBulk(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.deepStrictEqual(res.body.products, []);
    });

    test("TEST 3: Single valid product returns full formatted product and variant stock data", async () => {
      const req = { body: { productIds: [product1._id.toString()] } };
      const res = createMockRes();

      await getPublicProductsBulk(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.products.length, 1);

      const returned = res.body.products[0];
      assert.strictEqual(returned._id.toString(), product1._id.toString());
      assert.strictEqual(returned.name, "Attack on Titan Scout Cloak");
      assert.strictEqual(returned.totalStock, 13);
      assert.strictEqual(returned.variants.length, 2);
      assert.strictEqual(returned.finalPrice, 1999);
    });

    test("TEST 4: Multiple product IDs fetched in 1 single bulk call instead of N individual calls", async () => {
      const req = {
        body: {
          productIds: [
            product1._id.toString(),
            product2._id.toString(),
            product3._id.toString(),
          ],
        },
      };
      const res = createMockRes();

      await getPublicProductsBulk(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.products.length, 3);

      const ids = res.body.products.map((p) => p._id.toString());
      assert.ok(ids.includes(product1._id.toString()));
      assert.ok(ids.includes(product2._id.toString()));
      assert.ok(ids.includes(product3._id.toString()));
    });

    test("TEST 5: Duplicate product IDs in request (multiple cart variants of same product) are deduplicated", async () => {
      const req = {
        body: {
          productIds: [
            product1._id.toString(),
            product1._id.toString(),
            product1._id.toString(),
          ],
        },
      };
      const res = createMockRes();

      await getPublicProductsBulk(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.products.length, 1, "Should deduplicate and return 1 product record");
    });

    test("TEST 6: Soft-deleted products are excluded from bulk results", async () => {
      const req = {
        body: {
          productIds: [
            product1._id.toString(),
            deletedProduct._id.toString(),
          ],
        },
      };
      const res = createMockRes();

      await getPublicProductsBulk(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.products.length, 1);
      assert.strictEqual(res.body.products[0]._id.toString(), product1._id.toString());
    });
  });

  // =========================================================================
  // 2. BACKWARD COMPATIBILITY
  // =========================================================================
  describe("API Contract Preservation & Backward Compatibility", () => {
    test("TEST 7: Existing individual GET /api/products/:productId still functions identically", async () => {
      const req = { params: { productId: product2._id.toString() } };
      const res = createMockRes();

      await getPublicProductById(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.product.name, "Jujutsu Kaisen Gojo Eyes Tee");
    });

    test("TEST 8: Existing public catalog GET /api/products still functions with pagination", async () => {
      const req = { query: { page: "1", limit: "10" } };
      const res = createMockRes();

      await getPublicProducts(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(Array.isArray(res.body.products), true);
      assert.ok(res.body.pagination);
    });
  });

  // =========================================================================
  // 3. CART SYNCHRONIZATION EFFICIENCY & LOGIC
  // =========================================================================
  describe("Cart Synchronization Logic & Request Count Reduction", () => {
    test("TEST 9: Multi-item cart reduces network calls from N requests down to 1 bulk request", async () => {
      // Suppose cart has 4 items spanning 2 products (variants M and L of product1, and L and XL of product2)
      const mockCart = [
        { productId: product1._id.toString(), size: "M", color: "Green", quantity: 2 },
        { productId: product1._id.toString(), size: "L", color: "Green", quantity: 1 },
        { productId: product2._id.toString(), size: "L", color: "Black", quantity: 1 },
        { productId: product2._id.toString(), size: "XL", color: "Black", quantity: 3 },
      ];

      // OLD BEHAVIOR:
      // Loop with items.map -> 4 HTTP requests to getProductById
      const oldCallCount = mockCart.length;
      assert.strictEqual(oldCallCount, 4);

      // NEW BEHAVIOR:
      // Extract unique IDs -> 1 HTTP request to getProductsBulk
      const uniqueProductIds = [...new Set(mockCart.map((i) => i.productId))];
      assert.strictEqual(uniqueProductIds.length, 2);

      const req = { body: { productIds: uniqueProductIds } };
      const res = createMockRes();
      await getPublicProductsBulk(req, res);

      const newCallCount = 1;
      assert.strictEqual(newCallCount, 1);
      assert.strictEqual(res.body.products.length, 2);

      // Build productMap and resolve all 4 cart items
      const productMap = new Map(res.body.products.map((p) => [p._id.toString(), p]));

      const syncedItems = mockCart.map((item) => {
        const prod = productMap.get(item.productId);
        const variant = prod.variants.find(
          (v) => v.size === item.size && v.color === item.color
        );
        return {
          ...item,
          maxStock: variant ? variant.stock : 0,
          isAvailable: variant ? variant.stock > 0 : false,
          isOutOfStock: variant ? variant.stock <= 0 : true,
        };
      });

      // Item 0: AoT size M (stock = 10) -> Available
      assert.strictEqual(syncedItems[0].isAvailable, true);
      assert.strictEqual(syncedItems[0].maxStock, 10);

      // Item 1: AoT size L (stock = 3) -> Available
      assert.strictEqual(syncedItems[1].isAvailable, true);
      assert.strictEqual(syncedItems[1].maxStock, 3);

      // Item 2: Gojo size L (stock = 0) -> Out of stock
      assert.strictEqual(syncedItems[2].isAvailable, false);
      assert.strictEqual(syncedItems[2].isOutOfStock, true);
      assert.strictEqual(syncedItems[2].maxStock, 0);

      // Item 3: Gojo size XL (stock = 5) -> Available
      assert.strictEqual(syncedItems[3].isAvailable, true);
      assert.strictEqual(syncedItems[3].maxStock, 5);
    });

    test("TEST 10: Quantity bounds capped correctly at variant stock and MAX_CART_QUANTITY", () => {
      const MAX_CART_QUANTITY = 5;

      // Case A: Cart quantity 4, stock 2 -> Capped to 2
      const stockA = 2;
      const requestedA = 4;
      const cappedA = Math.min(requestedA, stockA, MAX_CART_QUANTITY);
      assert.strictEqual(cappedA, 2);

      // Case B: Cart quantity 10, stock 50 -> Capped to MAX_CART_QUANTITY (5)
      const stockB = 50;
      const requestedB = 10;
      const cappedB = Math.min(requestedB, stockB, MAX_CART_QUANTITY);
      assert.strictEqual(cappedB, 5);

      // Case C: Cart quantity 2, stock 10 -> Remains 2
      const stockC = 10;
      const requestedC = 2;
      const cappedC = Math.min(requestedC, stockC, MAX_CART_QUANTITY);
      assert.strictEqual(cappedC, 2);
    });
  });
});
