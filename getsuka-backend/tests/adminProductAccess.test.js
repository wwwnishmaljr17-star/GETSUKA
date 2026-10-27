import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";

import {
  getProductById,
  updateProduct,
  toggleProductListing,
} from "../src/features/product/controllers/productController.js";
import { getPublicProductById } from "../src/features/product/controllers/publicProductDetailsController.js";
import adminAuthMiddleware from "../src/middlewares/adminAuthMiddleware.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_admin_product_access";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_super_secret_key";

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

describe("Admin getProductById Unlisted Product Access Tests (Step 10)", () => {
  let category;
  let listedProduct;
  let unlistedProduct;
  let deletedProduct;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    category = await Category.create({
      name: "Anime Figurines",
      isDeleted: false,
    });

    listedProduct = await Product.create({
      name: "Naruto Uzumaki Sage Mode Figure",
      productCode: "NARUTO-SAGE-01",
      description: "Authentic PVC anime figure",
      category: category._id,
      anime: "Naruto",
      images: [
        "https://example.com/naruto1.jpg",
        "https://example.com/naruto2.jpg",
        "https://example.com/naruto3.jpg",
      ],
      price: 3499,
      salePrice: 2999,
      variants: [
        {
          color: "Orange/Black",
          size: "Standard",
          sku: `SKU-NARUTO-${Date.now()}-1`,
          stock: 15,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    unlistedProduct = await Product.create({
      name: "Sasuke Uchiha Susanoo Figure (Draft/Unlisted)",
      productCode: "SASUKE-SUSANOO-01",
      description: "Exclusive unlisted figure undergoing price review",
      category: category._id,
      anime: "Naruto",
      images: [
        "https://example.com/sasuke1.jpg",
        "https://example.com/sasuke2.jpg",
        "https://example.com/sasuke3.jpg",
      ],
      price: 4999,
      salePrice: 4499,
      variants: [
        {
          color: "Purple/Navy",
          size: "Large",
          sku: `SKU-SASUKE-${Date.now()}-2`,
          stock: 8,
        },
      ],
      isListed: false,
      isDeleted: false,
    });

    deletedProduct = await Product.create({
      name: "Discontinued Kakashi Hatake Figure",
      productCode: "KAKASHI-DISCONTINUED-01",
      description: "Archived discontinued product",
      category: category._id,
      anime: "Naruto",
      images: [
        "https://example.com/kakashi1.jpg",
        "https://example.com/kakashi2.jpg",
        "https://example.com/kakashi3.jpg",
      ],
      price: 2199,
      variants: [
        {
          color: "Silver/Green",
          size: "Standard",
          sku: `SKU-KAKASHI-${Date.now()}-3`,
          stock: 0,
        },
      ],
      isListed: false,
      isDeleted: true,
    });
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test("TEST 1: Listed product - Admin views product -> Loads successfully with 200 OK", async () => {
    const req = {
      params: { productId: listedProduct._id.toString() },
    };
    const res = createMockRes();

    await getProductById(req, res);

    assert.strictEqual(res.statusCode, 200, "Admin should receive 200 OK for listed product");
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product._id.toString(), listedProduct._id.toString());
    assert.strictEqual(res.body.product.isListed, true);
    assert.strictEqual(res.body.product.totalStock, 15);
  });

  test("TEST 2: Unlisted product - Admin views product -> Loads successfully with 200 OK (Bug Fixed)", async () => {
    const req = {
      params: { productId: unlistedProduct._id.toString() },
    };
    const res = createMockRes();

    await getProductById(req, res);

    assert.strictEqual(
      res.statusCode,
      200,
      "Admin MUST be able to view unlisted product (should not return 404)"
    );
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product._id.toString(), unlistedProduct._id.toString());
    assert.strictEqual(res.body.product.name, "Sasuke Uchiha Susanoo Figure (Draft/Unlisted)");
    assert.strictEqual(res.body.product.isListed, false);
    assert.strictEqual(res.body.product.totalStock, 8);
  });

  test("TEST 3: Deleted product - Admin views product -> Returns 404 according to delete logic", async () => {
    const req = {
      params: { productId: deletedProduct._id.toString() },
    };
    const res = createMockRes();

    await getProductById(req, res);

    assert.strictEqual(
      res.statusCode,
      404,
      "Deleted product should return 404 for admin getProductById"
    );
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Product not found");
  });

  test("TEST 4: Public user views unlisted product -> Strictly hidden with 404 Not Found", async () => {
    const req = {
      params: { productId: unlistedProduct._id.toString() },
    };
    const res = createMockRes();

    await getPublicProductById(req, res);

    assert.strictEqual(
      res.statusCode,
      404,
      "Public endpoint must return 404 for unlisted products"
    );
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Product not found.");
  });

  test("TEST 5: Public user views listed product -> Accessible with 200 OK and calculated fields", async () => {
    const req = {
      params: { productId: listedProduct._id.toString() },
    };
    const res = createMockRes();

    await getPublicProductById(req, res);

    assert.strictEqual(res.statusCode, 200, "Public user can access listed product");
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product._id.toString(), listedProduct._id.toString());
    assert.strictEqual(res.body.product.totalStock, 15);
    assert.strictEqual(res.body.product.isAvailable, true);
  });

  test("TEST 6: Admin edits unlisted product -> Update succeeds normally and product remains accessible", async () => {
    const updateReq = {
      params: { productId: unlistedProduct._id.toString() },
      body: {
        name: "Sasuke Uchiha Susanoo Figure (Updated Edition)",
        price: 5299,
        salePrice: 4799,
        category: category._id.toString(),
        anime: "Naruto",
        description: "Updated description for unlisted figure",
        images: unlistedProduct.images,
        variants: unlistedProduct.variants,
      },
    };
    const updateRes = createMockRes();

    await updateProduct(updateReq, updateRes);

    assert.strictEqual(updateRes.statusCode, 200, "Admin updating unlisted product should succeed with 200 OK");
    assert.strictEqual(updateRes.body.success, true);

    // Verify admin getProductById fetches the updated unlisted product
    const getReq = {
      params: { productId: unlistedProduct._id.toString() },
    };
    const getRes = createMockRes();
    await getProductById(getReq, getRes);

    assert.strictEqual(getRes.statusCode, 200);
    assert.strictEqual(getRes.body.product.name, "Sasuke Uchiha Susanoo Figure (Updated Edition)");
    assert.strictEqual(getRes.body.product.price, 5299);
    assert.strictEqual(getRes.body.product.isListed, false);
  });

  test("TEST 7: Admin relists product -> Becomes visible publicly", async () => {
    // 1. Toggle listing (relist)
    const toggleReq = {
      params: { productId: unlistedProduct._id.toString() },
    };
    const toggleRes = createMockRes();

    await toggleProductListing(toggleReq, toggleRes);

    assert.strictEqual(toggleRes.statusCode, 200, "toggleProductListing should return 200 OK");
    assert.strictEqual(toggleRes.body.success, true);
    assert.strictEqual(toggleRes.body.product.isListed, true);

    // 2. Public user now requests the previously unlisted product
    const publicReq = {
      params: { productId: unlistedProduct._id.toString() },
    };
    const publicRes = createMockRes();

    await getPublicProductById(publicReq, publicRes);

    assert.strictEqual(
      publicRes.statusCode,
      200,
      "Relisted product must now be visible to public users"
    );
    assert.strictEqual(publicRes.body.success, true);
    assert.strictEqual(publicRes.body.product.name, "Sasuke Uchiha Susanoo Figure (Updated Edition)");
  });

  test("TEST 8: Admin unlists product again -> Hidden from public but still visible to admin", async () => {
    // 1. Toggle listing (unlist)
    const toggleReq = {
      params: { productId: unlistedProduct._id.toString() },
    };
    const toggleRes = createMockRes();

    await toggleProductListing(toggleReq, toggleRes);

    assert.strictEqual(toggleRes.statusCode, 200);
    assert.strictEqual(toggleRes.body.product.isListed, false);

    // 2. Public user gets 404
    const publicReq = {
      params: { productId: unlistedProduct._id.toString() },
    };
    const publicRes = createMockRes();
    await getPublicProductById(publicReq, publicRes);
    assert.strictEqual(publicRes.statusCode, 404, "Public user receives 404 for newly unlisted product");

    // 3. Admin user gets 200 OK
    const adminReq = {
      params: { productId: unlistedProduct._id.toString() },
    };
    const adminRes = createMockRes();
    await getProductById(adminReq, adminRes);
    assert.strictEqual(adminRes.statusCode, 200, "Admin can still view the unlisted product");
    assert.strictEqual(adminRes.body.product.isListed, false);
  });

  test("TEST 9: Admin route authorization -> Rejects unauthorized requests without admin token", async () => {
    // Case A: Missing token
    const reqWithoutAuth = {
      cookies: {},
      headers: {},
    };
    const resWithoutAuth = createMockRes();
    let nextCalled = false;

    await adminAuthMiddleware(reqWithoutAuth, resWithoutAuth, () => {
      nextCalled = true;
    });

    assert.strictEqual(resWithoutAuth.statusCode, 401, "Expected 401 Unauthorized when no token provided");
    assert.strictEqual(nextCalled, false);

    // Case B: Valid admin token passes
    const adminToken = jwt.sign(
      { adminId: new mongoose.Types.ObjectId().toString(), role: "admin" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    const reqWithAuth = {
      headers: { authorization: `Bearer ${adminToken}` },
    };
    const resWithAuth = createMockRes();
    let adminNextCalled = false;

    await adminAuthMiddleware(reqWithAuth, resWithAuth, () => {
      adminNextCalled = true;
    });

    assert.strictEqual(adminNextCalled, true, "Admin auth middleware should pass valid admin");
  });

  test("TEST 10: Non-existent product ID -> Admin receives 404 Not Found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId().toString();
    const req = {
      params: { productId: nonExistentId },
    };
    const res = createMockRes();

    await getProductById(req, res);

    assert.strictEqual(res.statusCode, 404, "Expected 404 for non-existent product ID");
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Product not found");
  });
});
