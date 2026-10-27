import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";

import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";
import User from "../src/features/auth/models/User.js";

import {
  getPublicProducts,
  getPublicProductsBulk,
} from "../src/features/product/controllers/publicProductController.js";
import { getPublicProductById } from "../src/features/product/controllers/publicProductDetailsController.js";
import userAuthMiddleware from "../src/middlewares/userAuthMiddleware.js";
import adminAuthMiddleware from "../src/middlewares/adminAuthMiddleware.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_caching_step7";

const createMockRes = () => {
  const headers = {};
  const res = {
    statusCode: 200,
    body: null,
    set(key, value) {
      if (typeof key === "object") {
        for (const [k, v] of Object.entries(key)) {
          headers[k.toLowerCase()] = v;
        }
      } else {
        headers[key.toLowerCase()] = value;
      }
      return this;
    },
    header(key, value) {
      return this.set(key, value);
    },
    setHeader(key, value) {
      return this.set(key, value);
    },
    getHeader(key) {
      return headers[key.toLowerCase()];
    },
    get(key) {
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

describe("PHASE 1 STEP 7: API Caching and Data Fetching Optimization Tests", () => {
  let category;
  let product;
  let user;
  let userToken;
  let adminToken;

  before(async () => {
    process.env.JWT_SECRET = "test_jwt_secret_step7";

    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    category = await Category.create({
      name: "Anime Outerwear",
      isDeleted: false,
    });

    product = await Product.create({
      name: "Jujutsu Kaisen Gojo Jacket",
      productCode: "JJK-GOJO-01",
      description: "Limitless domain expansion jacket",
      category: category._id,
      anime: "Jujutsu Kaisen",
      price: 2499,
      salePrice: 1999,
      isListed: true,
      isDeleted: false,
      images: [
        "https://example.com/img1.jpg",
        "https://example.com/img2.jpg",
        "https://example.com/img3.jpg",
      ],
      variants: [
        { color: "Black", size: "M", stock: 15, sku: "JJK-GOJO-BLK-M" },
        { color: "Black", size: "L", stock: 8, sku: "JJK-GOJO-BLK-L" },
      ],
    });

    user = await User.create({
      fullName: "Satoru Gojo",
      email: "gojo@getsuka.com",
      password: "HashedPassword123",
      isVerified: true,
      isBlocked: false,
    });

    userToken = jwt.sign(
      { userId: user._id.toString(), role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    adminToken = jwt.sign(
      { adminId: "admin123", role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  describe("Backend Cache-Control Header Directives", () => {
    test("TEST 1: GET /api/products returns Cache-Control with public max-age directive", async () => {
      const req = { query: {} };
      const res = createMockRes();

      await getPublicProducts(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);

      const cacheControl = res.get("cache-control");
      assert.ok(cacheControl, "Cache-Control header must be set");
      assert.ok(
        cacheControl.includes("public"),
        "Public product catalog must have public cache directive"
      );
      assert.ok(
        cacheControl.includes("max-age="),
        "Public product catalog must specify max-age"
      );
    });

    test("TEST 2: GET /api/products/:productId returns Cache-Control with public max-age directive", async () => {
      const req = { params: { productId: product._id.toString() } };
      const res = createMockRes();

      await getPublicProductById(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);

      const cacheControl = res.get("cache-control");
      assert.ok(cacheControl, "Cache-Control header must be set on single product");
      assert.ok(
        cacheControl.includes("public"),
        "Single product endpoint must have public directive"
      );
    });

    test("TEST 3: POST /api/products/bulk (live inventory verification) sets no-store to prevent stale stock caching", async () => {
      const req = { body: { productIds: [product._id.toString()] } };
      const res = createMockRes();

      await getPublicProductsBulk(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);

      const cacheControl = res.get("cache-control");
      assert.ok(cacheControl, "Cache-Control header must be set on bulk inventory endpoint");
      assert.ok(
        cacheControl.includes("no-store"),
        "Bulk inventory validation must contain no-store directive"
      );
      assert.ok(
        cacheControl.includes("no-cache"),
        "Bulk inventory validation must contain no-cache directive"
      );
    });

    test("TEST 4: userAuthMiddleware sets private no-store headers on sensitive user routes", async () => {
      const req = {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      };
      const res = createMockRes();
      let nextCalled = false;

      await userAuthMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      const cacheControl = res.get("cache-control");
      assert.ok(cacheControl, "Cache-Control must be set on protected user routes");
      assert.ok(
        cacheControl.includes("no-store"),
        "Protected user data must contain no-store directive"
      );
      assert.ok(
        cacheControl.includes("private"),
        "Protected user data must contain private directive"
      );
    });

    test("TEST 5: adminAuthMiddleware sets private no-store headers on protected admin routes", async () => {
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

      assert.strictEqual(nextCalled, true);
      const cacheControl = res.get("cache-control");
      assert.ok(cacheControl, "Cache-Control must be set on protected admin routes");
      assert.ok(
        cacheControl.includes("no-store"),
        "Protected admin data must contain no-store directive"
      );
      assert.ok(
        cacheControl.includes("private"),
        "Protected admin data must contain private directive"
      );
    });
  });

  describe("Frontend API Cache & Cache-Buster Optimization Verification", () => {
    test("TEST 6: productApi.js source code has completely eliminated _t: Date.now() timestamp cache buster", () => {
      const productApiPath = path.resolve(
        "..",
        "getsuka-frontend",
        "src",
        "features",
        "user-side",
        "products",
        "api",
        "productApi.js"
      );

      const sourceCode = fs.readFileSync(productApiPath, "utf-8");

      assert.strictEqual(
        sourceCode.includes("_t: Date.now()"),
        false,
        "productApi.js must NOT contain _t: Date.now() cache buster"
      );
      assert.strictEqual(
        sourceCode.includes("_t:"),
        false,
        "productApi.js must NOT contain _t parameter"
      );
      assert.ok(
        sourceCode.includes("clearCache"),
        "productApi.js must expose clearCache for cache invalidation"
      );
      assert.ok(
        sourceCode.includes("PRODUCTS_CACHE_TTL"),
        "productApi.js must implement TTL caching"
      );
    });

    test("TEST 7: categoryApi.js source code implements in-memory caching and in-flight request deduplication", () => {
      const categoryApiPath = path.resolve(
        "..",
        "getsuka-frontend",
        "src",
        "features",
        "user-side",
        "categories",
        "api",
        "categoryApi.js"
      );

      const sourceCode = fs.readFileSync(categoryApiPath, "utf-8");

      assert.ok(
        sourceCode.includes("CATEGORY_CACHE_TTL"),
        "categoryApi.js must implement TTL caching"
      );
      assert.ok(
        sourceCode.includes("inFlightCategoriesPromise"),
        "categoryApi.js must implement in-flight request deduplication"
      );
      assert.ok(
        sourceCode.includes("clearCache"),
        "categoryApi.js must expose clearCache for invalidation"
      );
    });

    test("TEST 8: wishlistApi.js source code implements token-isolated caching, deduplication, and invalidation on mutation", () => {
      const wishlistApiPath = path.resolve(
        "..",
        "getsuka-frontend",
        "src",
        "features",
        "user-side",
        "wishlists",
        "api",
        "wishlistApi.js"
      );

      const sourceCode = fs.readFileSync(wishlistApiPath, "utf-8");

      assert.ok(
        sourceCode.includes("inFlightWishlistPromise"),
        "wishlistApi.js must implement in-flight promise deduplication"
      );
      assert.ok(
        sourceCode.includes("cachedWishlistToken"),
        "wishlistApi.js must isolate cache per user token so accounts cannot leak data"
      );
      assert.ok(
        sourceCode.includes("wishlistApi.clearCache()"),
        "wishlistApi.js must invalidate cache on mutation (addToWishlist, removeFromWishlist)"
      );
    });

    test("TEST 9: Public product listing handles search, filter, and pagination query params properly without _t", async () => {
      const req = {
        query: {
          search: "Gojo",
          anime: "Jujutsu Kaisen",
          sort: "newest",
          page: 1,
          limit: 10,
        },
      };
      const res = createMockRes();

      await getPublicProducts(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.products.length, 1);
      assert.strictEqual(res.body.products[0].name, "Jujutsu Kaisen Gojo Jacket");
      assert.strictEqual(res.body.pagination.currentPage, 1);
      assert.strictEqual(res.body.pagination.totalProducts, 1);
      assert.strictEqual(res.body.filters.search, "Gojo");
      assert.strictEqual(res.body.filters.anime, "Jujutsu Kaisen");
    });

    test("TEST 10: Non-matching search returns empty array gracefully with cache headers intact", async () => {
      const req = {
        query: {
          search: "NonExistentItemXYZ",
          page: 1,
          limit: 10,
        },
      };
      const res = createMockRes();

      await getPublicProducts(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.products.length, 0);
      assert.strictEqual(res.body.pagination.totalProducts, 0);

      const cacheControl = res.get("cache-control");
      assert.ok(cacheControl && cacheControl.includes("public"));
    });
  });
});

