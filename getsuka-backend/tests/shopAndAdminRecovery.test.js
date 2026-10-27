import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";
import Admin from "../src/features/admin/models/Admin.js";

import { getPublicProducts } from "../src/features/product/controllers/publicProductController.js";
import { adminLogin } from "../src/features/admin/controllers/adminAuthController.js";
import adminAuthMiddleware from "../src/middlewares/adminAuthMiddleware.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_shop_and_admin_recovery";
const JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_getsuka_recovery_2026";

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

describe("GETSUKA Recovery Test Suite: Shop Listing & Admin Authentication", () => {
  let categoryA;
  let categoryB;
  let listedProduct1;
  let listedProduct2;
  let unlistedProduct;
  let deletedProduct;
  let adminAccount;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.dropDatabase();

    // 1. Seed Categories
    categoryA = await Category.create({
      name: "T-Shirts",
      isDeleted: false,
    });

    categoryB = await Category.create({
      name: "Hoodies",
      isDeleted: false,
    });

    // 2. Seed Published Products
    listedProduct1 = await Product.create({
      name: "One Piece Straw Hat Tee",
      productCode: "OP-TEE-01",
      description: "Premium cotton streetwear",
      category: categoryA._id,
      anime: "One Piece",
      images: [
        "https://example.com/op1.jpg",
        "https://example.com/op2.jpg",
        "https://example.com/op3.jpg",
      ],
      price: 2999,
      salePrice: 2499,
      variants: [
        {
          color: "Black",
          size: "L",
          sku: "OP-TEE-01-BLK-L",
          stock: 10,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    listedProduct2 = await Product.create({
      name: "Jujutsu Kaisen Gojo Hoodie",
      productCode: "JJK-HD-01",
      description: "Oversized luxury hoodie",
      category: categoryB._id,
      anime: "Jujutsu Kaisen",
      images: [
        "https://example.com/jjk1.jpg",
        "https://example.com/jjk2.jpg",
        "https://example.com/jjk3.jpg",
      ],
      price: 4999,
      salePrice: null,
      variants: [
        {
          color: "Lavender",
          size: "M",
          sku: "JJK-HD-01-LAV-M",
          stock: 5,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    // 3. Seed Unpublished / Unlisted Product
    unlistedProduct = await Product.create({
      name: "Draft Unlisted Anime Tee",
      productCode: "DRAFT-01",
      description: "Not ready for sale",
      category: categoryA._id,
      anime: "Bleach",
      images: [
        "https://example.com/d1.jpg",
        "https://example.com/d2.jpg",
        "https://example.com/d3.jpg",
      ],
      price: 1999,
      variants: [
        {
          color: "White",
          size: "M",
          sku: "DRAFT-01-WT-M",
          stock: 10,
        },
      ],
      isListed: false,
      isDeleted: false,
    });

    // 4. Seed Soft-Deleted Product
    deletedProduct = await Product.create({
      name: "Archived Anime Tee",
      productCode: "ARCH-01",
      description: "Discontinued",
      category: categoryA._id,
      anime: "Naruto",
      images: [
        "https://example.com/a1.jpg",
        "https://example.com/a2.jpg",
        "https://example.com/a3.jpg",
      ],
      price: 1599,
      variants: [
        {
          color: "Black",
          size: "S",
          sku: "ARCH-01-BLK-S",
          stock: 0,
        },
      ],
      isListed: true,
      isDeleted: true,
    });

    // 5. Seed Admin User
    const hashedPassword = await bcrypt.hash("Admin@12345", 10);
    adminAccount = await Admin.create({
      fullName: "Test Admin",
      email: "admin@getsuka.com",
      password: hashedPassword,
      role: "admin",
      isBlocked: false,
    });
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  // -------------------------------------------------------------
  // PART B: Product Listing Tests
  // -------------------------------------------------------------

  test("1. Product listing returns published products", async () => {
    const req = { query: {} };
    const res = createMockRes();

    await getPublicProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.pagination.totalProducts, 2);
    assert.strictEqual(res.body.products.length, 2);

    const productNames = res.body.products.map((p) => p.name);
    assert.ok(productNames.includes("One Piece Straw Hat Tee"));
    assert.ok(productNames.includes("Jujutsu Kaisen Gojo Hoodie"));
  });

  test("2. Blocked, unlisted, or deleted products remain hidden", async () => {
    const req = { query: {} };
    const res = createMockRes();

    await getPublicProducts(req, res);

    const productNames = res.body.products.map((p) => p.name);
    assert.ok(!productNames.includes("Draft Unlisted Anime Tee"));
    assert.ok(!productNames.includes("Archived Anime Tee"));
  });

  test("3. Search and anime filters work correctly", async () => {
    // Search by name
    const reqSearch = { query: { search: "Straw Hat" } };
    const resSearch = createMockRes();
    await getPublicProducts(reqSearch, resSearch);

    assert.strictEqual(resSearch.body.products.length, 1);
    assert.strictEqual(resSearch.body.products[0].name, "One Piece Straw Hat Tee");

    // Filter by anime
    const reqAnime = { query: { anime: "Jujutsu Kaisen" } };
    const resAnime = createMockRes();
    await getPublicProducts(reqAnime, resAnime);

    assert.strictEqual(resAnime.body.products.length, 1);
    assert.strictEqual(resAnime.body.products[0].name, "Jujutsu Kaisen Gojo Hoodie");
  });

  test("4. Clearing filters restores all published products", async () => {
    // Apply restrictive filter that yields 0 products
    const reqRestrictive = { query: { anime: "NonExistentAnime" } };
    const resRestrictive = createMockRes();
    await getPublicProducts(reqRestrictive, resRestrictive);
    assert.strictEqual(resRestrictive.body.products.length, 0);

    // Clear filters (empty query)
    const reqCleared = { query: {} };
    const resCleared = createMockRes();
    await getPublicProducts(reqCleared, resCleared);
    assert.strictEqual(resCleared.body.products.length, 2);
    assert.strictEqual(resCleared.body.pagination.totalProducts, 2);
  });

  test("5. Pagination parameters are respected", async () => {
    const reqPage = { query: { limit: 1, page: 1 } };
    const resPage = createMockRes();

    await getPublicProducts(reqPage, resPage);

    assert.strictEqual(resPage.body.products.length, 1);
    assert.strictEqual(resPage.body.pagination.currentPage, 1);
    assert.strictEqual(resPage.body.pagination.totalPages, 2);
    assert.strictEqual(resPage.body.pagination.hasNextPage, true);
  });

  // -------------------------------------------------------------
  // PART C: Admin Authentication Tests
  // -------------------------------------------------------------

  test("6. Valid admin credentials authenticate successfully with JWT token", async () => {
    const req = {
      body: {
        email: "admin@getsuka.com",
        password: "Admin@12345",
      },
    };
    const res = createMockRes();

    await adminLogin(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.message, "Admin login successful");
    assert.ok(res.body.token, "JWT token must be returned");
    assert.strictEqual(res.body.admin.email, "admin@getsuka.com");
    assert.strictEqual(res.body.admin.role, "admin");

    // Verify token validity
    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    assert.strictEqual(decoded.email, "admin@getsuka.com");
    assert.strictEqual(decoded.role, "admin");
  });

  test("7. Invalid admin credentials return HTTP 401", async () => {
    const req = {
      body: {
        email: "admin@getsuka.com",
        password: "IncorrectPassword999",
      },
    };
    const res = createMockRes();

    await adminLogin(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Invalid email or password");
  });

  test("8. Non-existent admin email returns HTTP 401", async () => {
    const req = {
      body: {
        email: "unknown@nowhere.com",
        password: "Admin@12345",
      },
    };
    const res = createMockRes();

    await adminLogin(req, res);

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });

  test("9. Unauthenticated requests to protected admin middleware are rejected with 401", async () => {
    const req = {
      headers: {},
    };
    const res = createMockRes();
    let nextCalled = false;

    await adminAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.body.success, false);
  });

  test("10. Legitimate admin token passes middleware and attaches admin context", async () => {
    const token = jwt.sign(
      { adminId: adminAccount._id, email: adminAccount.email, role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createMockRes();
    let nextCalled = false;

    await adminAuthMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.ok(req.admin);
    assert.strictEqual(req.admin.email, "admin@getsuka.com");
  });
});
