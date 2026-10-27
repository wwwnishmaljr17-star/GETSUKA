import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";
import Admin from "../src/features/admin/models/Admin.js";
import User from "../src/features/auth/models/User.js";

import {
  getProducts,
  toggleProductListing,
  toggleProductTrending,
} from "../src/features/product/controllers/productController.js";
import { getPublicProducts } from "../src/features/product/controllers/publicProductController.js";
import adminAuthMiddleware from "../src/middlewares/adminAuthMiddleware.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_storefront_admin_refinement";
const JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_getsuka_refinement_2026";

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

describe("GETSUKA Refinement Test Suite: Storefront Merchandising & Admin Controls", () => {
  let category;
  let adminToken;
  let adminUser;
  let publicTrendingProduct;
  let publicStandardProduct;
  let unlistedTrendingProduct;
  let deletedProduct;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.dropDatabase();

    // 1. Seed Category
    category = await Category.create({
      name: "Streetwear T-Shirts",
      isDeleted: false,
    });

    // 2. Seed Admin
    adminUser = await Admin.create({
      fullName: "Master Admin",
      email: "admin@getsuka.atelier",
      password: "HashedPassword123",
      role: "admin",
      isBlocked: false,
    });

    adminToken = jwt.sign(
      { adminId: adminUser._id, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    // 3. Seed Products
    publicTrendingProduct = await Product.create({
      name: "Attack on Titan Scout Tee",
      productCode: "AOT-TREND-01",
      description: "Heavyweight scout regimen silhouette",
      category: category._id,
      anime: "Attack on Titan",
      price: 1899,
      salePrice: 1599,
      images: ["img1.jpg", "img2.jpg", "img3.jpg"],
      variants: [{ color: "Mocha", size: "L", sku: "AOT-L-01", stock: 15 }],
      isListed: true,
      isTrending: true,
      isDeleted: false,
    });

    // Add a slight delay to ensure distinct createdAt timestamps
    await new Promise((resolve) => setTimeout(resolve, 50));

    publicStandardProduct = await Product.create({
      name: "Demon Slayer Flame Tee",
      productCode: "DS-STD-02",
      description: "Tailored flame hashira tee",
      category: category._id,
      anime: "Demon Slayer",
      price: 1499,
      images: ["imgA.jpg", "imgB.jpg", "imgC.jpg"],
      variants: [{ color: "Black", size: "M", sku: "DS-M-02", stock: 10 }],
      isListed: true,
      isTrending: false,
      isDeleted: false,
    });

    unlistedTrendingProduct = await Product.create({
      name: "Jujutsu Kaisen Domain Tee",
      productCode: "JJK-UNLIST-03",
      description: "Unpublished domain tee",
      category: category._id,
      anime: "Jujutsu Kaisen",
      price: 1699,
      images: ["imgX.jpg", "imgY.jpg", "imgZ.jpg"],
      variants: [{ color: "Charcoal", size: "XL", sku: "JJK-XL-03", stock: 5 }],
      isListed: false,
      isTrending: true,
      isDeleted: false,
    });

    deletedProduct = await Product.create({
      name: "Deleted Legacy Tee",
      productCode: "DEL-04",
      description: "Archived piece",
      category: category._id,
      anime: "One Piece",
      price: 999,
      images: ["imgD1.jpg", "imgD2.jpg", "imgD3.jpg"],
      variants: [{ color: "White", size: "S", sku: "DEL-S-04", stock: 0 }],
      isListed: true,
      isTrending: true,
      isDeleted: true,
    });
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test("1. Public Storefront: Returns only listed, non-deleted products", async () => {
    const req = { query: {} };
    const res = createMockRes();

    await getPublicProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.products.length, 2);

    const ids = res.body.products.map((p) => String(p._id));
    assert.ok(ids.includes(String(publicTrendingProduct._id)));
    assert.ok(ids.includes(String(publicStandardProduct._id)));
    assert.ok(!ids.includes(String(unlistedTrendingProduct._id)), "Unlisted products must not appear publicly");
    assert.ok(!ids.includes(String(deletedProduct._id)), "Deleted products must not appear publicly");
  });

  test("2. Merchandising - Trending Query: Returns only eligible public trending products", async () => {
    const req = { query: { trending: "true" } };
    const res = createMockRes();

    await getPublicProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.products.length, 1);
    assert.strictEqual(String(res.body.products[0]._id), String(publicTrendingProduct._id));
    assert.strictEqual(res.body.products[0].isTrending, true);
  });

  test("3. Merchandising - New Arrivals: Orders newest arrivals first by createdAt", async () => {
    const req = { query: { sort: "newest", limit: 4 } };
    const res = createMockRes();

    await getPublicProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.products.length, 2);
    // Standard product was created second, so it is newest
    assert.strictEqual(String(res.body.products[0]._id), String(publicStandardProduct._id));
    assert.strictEqual(String(res.body.products[1]._id), String(publicTrendingProduct._id));
  });

  test("4. Admin Inventory: Returns all non-deleted products including unlisted with stock calculations", async () => {
    const req = { query: {} };
    const res = createMockRes();

    await getProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.pagination.totalProducts, 3);

    const unlisted = res.body.products.find((p) => String(p._id) === String(unlistedTrendingProduct._id));
    assert.ok(unlisted, "Admin must be able to view unlisted products");
    assert.strictEqual(unlisted.isListed, false);
    assert.strictEqual(unlisted.stockStatus, "UNLISTED");
  });

  test("5. Admin Inventory: Status filtering correctly isolates unlisted items", async () => {
    const req = { query: { status: "unlisted" } };
    const res = createMockRes();

    await getProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.products.length, 1);
    assert.strictEqual(String(res.body.products[0]._id), String(unlistedTrendingProduct._id));
  });

  test("6. Admin Trending Control: Toggles product isTrending flag", async () => {
    const req = { params: { productId: String(publicStandardProduct._id) } };
    const res = createMockRes();

    await toggleProductTrending(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product.isTrending, true);

    // Verify in database
    const updated = await Product.findById(publicStandardProduct._id);
    assert.strictEqual(updated.isTrending, true);
  });

  test("7. Storefront Synchronization: Newly marked trending product appears in trending query", async () => {
    const req = { query: { trending: "true" } };
    const res = createMockRes();

    await getPublicProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.products.length, 2);
    const ids = res.body.products.map((p) => String(p._id));
    assert.ok(ids.includes(String(publicStandardProduct._id)));
  });

  test("8. Admin Trending Unmark: Toggles back and removes from trending query", async () => {
    const req = { params: { productId: String(publicStandardProduct._id) } };
    const res = createMockRes();

    await toggleProductTrending(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.product.isTrending, false);

    // Verify public trending query
    const publicReq = { query: { trending: "true" } };
    const publicRes = createMockRes();
    await getPublicProducts(publicReq, publicRes);

    assert.strictEqual(publicRes.body.products.length, 1);
    assert.strictEqual(String(publicRes.body.products[0]._id), String(publicTrendingProduct._id));
  });

  test("9. Admin Authorization: Rejects unauthenticated requests with 401", async () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await adminAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
  });

  test("10. Admin Authorization: Accepts valid admin token and attaches admin to req", async () => {
    const req = {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await adminAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.ok(req.admin);
    assert.strictEqual(String(req.admin.adminId), String(adminUser._id));
  });
});
