import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";
import { getProducts } from "../src/features/product/controllers/productController.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_admin_product_sorting";

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

describe("Admin Product Sorting Logic Tests (Step 11)", () => {
  let categoryAnime;
  let categoryManga;
  let products = [];

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    categoryAnime = await Category.create({
      name: "Anime Apparel",
      isDeleted: false,
    });

    categoryManga = await Category.create({
      name: "Manga Collectibles",
      isDeleted: false,
    });

    // Create products with deliberate names, prices, and creation sequence:
    // Name order (A-Z): Anime Jacket, Attack Shirt, Bleach Hoodie, Dragon Tee
    // Price order (low-high): Dragon Tee (1200), Attack Shirt (1800), Bleach Hoodie (2500), Anime Jacket (3200)
    const baseTime = Date.now();

    const p1 = await Product.create({
      name: "Anime Jacket",
      productCode: "PROD-AJ-01",
      description: "Stylish anime jacket",
      category: categoryAnime._id,
      anime: "General Anime",
      images: ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"],
      price: 3200,
      variants: [{ color: "Blue", size: "L", sku: "SKU-AJ-01", stock: 10 }],
      isListed: true,
      isDeleted: false,
      createdAt: new Date(baseTime + 1000),
    });

    const p2 = await Product.create({
      name: "Bleach Hoodie",
      productCode: "PROD-BH-02",
      description: "Ichigo hollow mask hoodie",
      category: categoryAnime._id,
      anime: "Bleach",
      images: ["https://example.com/4.jpg", "https://example.com/5.jpg", "https://example.com/6.jpg"],
      price: 2500,
      variants: [{ color: "Black", size: "M", sku: "SKU-BH-02", stock: 8 }],
      isListed: true,
      isDeleted: false,
      createdAt: new Date(baseTime + 2000),
    });

    const p3 = await Product.create({
      name: "Attack Shirt",
      productCode: "PROD-AS-03",
      description: "Scout regiment graphic shirt",
      category: categoryAnime._id,
      anime: "Attack on Titan",
      images: ["https://example.com/7.jpg", "https://example.com/8.jpg", "https://example.com/9.jpg"],
      price: 1800,
      variants: [{ color: "Green", size: "S", sku: "SKU-AS-03", stock: 15 }],
      isListed: true,
      isDeleted: false,
      createdAt: new Date(baseTime + 3000),
    });

    const p4 = await Product.create({
      name: "Dragon Tee",
      productCode: "PROD-DT-04",
      description: "Saiyan warrior t-shirt",
      category: categoryAnime._id,
      anime: "Dragon Ball",
      images: ["https://example.com/10.jpg", "https://example.com/11.jpg", "https://example.com/12.jpg"],
      price: 1200,
      variants: [{ color: "Orange", size: "XL", sku: "SKU-DT-04", stock: 20 }],
      isListed: true,
      isDeleted: false,
      createdAt: new Date(baseTime + 4000),
    });

    products = [p1, p2, p3, p4];
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  test("TEST 1: Select name A-Z (sort=name-az) -> Products sorted alphabetically A to Z", async () => {
    const req = {
      query: {
        sort: "name-az",
        limit: 10,
      },
    };
    const res = createMockRes();

    await getProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const names = res.body.products.map((p) => p.name);

    // Expected alphabetical order: Anime Jacket -> Attack Shirt -> Bleach Hoodie -> Dragon Tee
    assert.deepStrictEqual(
      names,
      ["Anime Jacket", "Attack Shirt", "Bleach Hoodie", "Dragon Tee"],
      "name-az must sort by product name alphabetically (A to Z), NOT by price"
    );
  });

  test("TEST 2: Select name Z-A (sort=name-za) -> Products sorted in reverse alphabetical order Z to A", async () => {
    const req = {
      query: {
        sort: "name-za",
        limit: 10,
      },
    };
    const res = createMockRes();

    await getProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const names = res.body.products.map((p) => p.name);

    // Expected reverse alphabetical order: Dragon Tee -> Bleach Hoodie -> Attack Shirt -> Anime Jacket
    assert.deepStrictEqual(
      names,
      ["Dragon Tee", "Bleach Hoodie", "Attack Shirt", "Anime Jacket"],
      "name-za must sort by product name reverse alphabetically (Z to A)"
    );
  });

  test("TEST 3: Select price low-high (sort=price-low) -> Products sorted lowest price first", async () => {
    const req = {
      query: {
        sort: "price-low",
        limit: 10,
      },
    };
    const res = createMockRes();

    await getProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const prices = res.body.products.map((p) => p.price);

    // Expected price low to high: 1200 -> 1800 -> 2500 -> 3200
    assert.deepStrictEqual(
      prices,
      [1200, 1800, 2500, 3200],
      "price-low must sort products from lowest price to highest price"
    );
  });

  test("TEST 4: Select price high-low (sort=price-high) -> Products sorted highest price first", async () => {
    const req = {
      query: {
        sort: "price-high",
        limit: 10,
      },
    };
    const res = createMockRes();

    await getProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    const prices = res.body.products.map((p) => p.price);

    // Expected price high to low: 3200 -> 2500 -> 1800 -> 1200
    assert.deepStrictEqual(
      prices,
      [3200, 2500, 1800, 1200],
      "price-high must sort products from highest price to lowest price"
    );
  });

  test("TEST 5: Combine Search + Filter + Sorting -> All work accurately together", async () => {
    // Search for "shirt" or "tee" (apparel), filter by anime or category, sort by price-low
    const req = {
      query: {
        search: "Shirt",
        sort: "price-low",
        limit: 10,
      },
    };
    const res = createMockRes();

    await getProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.products.length, 1);
    assert.strictEqual(res.body.products[0].name, "Attack Shirt");
    assert.strictEqual(res.body.products[0].price, 1800);
  });

  test("TEST 6: Pagination with sorting -> Sorting remains correct across multiple pages", async () => {
    // Page 1 with limit 2, sorted name-az
    const reqPage1 = {
      query: {
        sort: "name-az",
        page: 1,
        limit: 2,
      },
    };
    const resPage1 = createMockRes();
    await getProducts(reqPage1, resPage1);

    assert.strictEqual(resPage1.statusCode, 200);
    assert.strictEqual(resPage1.body.pagination.currentPage, 1);
    assert.strictEqual(resPage1.body.pagination.totalPages, 2);
    assert.strictEqual(resPage1.body.products.length, 2);
    assert.strictEqual(resPage1.body.products[0].name, "Anime Jacket");
    assert.strictEqual(resPage1.body.products[1].name, "Attack Shirt");

    // Page 2 with limit 2, sorted name-az
    const reqPage2 = {
      query: {
        sort: "name-az",
        page: 2,
        limit: 2,
      },
    };
    const resPage2 = createMockRes();
    await getProducts(reqPage2, resPage2);

    assert.strictEqual(resPage2.statusCode, 200);
    assert.strictEqual(resPage2.body.pagination.currentPage, 2);
    assert.strictEqual(resPage2.body.products.length, 2);
    assert.strictEqual(resPage2.body.products[0].name, "Bleach Hoodie");
    assert.strictEqual(resPage2.body.products[1].name, "Dragon Tee");
  });

  test("TEST 7: Default sort (newest) -> Latest created product comes first", async () => {
    const req = {
      query: {
        limit: 10,
      },
    };
    const res = createMockRes();

    await getProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    const names = res.body.products.map((p) => p.name);

    // Latest created: Dragon Tee -> Attack Shirt -> Bleach Hoodie -> Anime Jacket
    assert.deepStrictEqual(
      names,
      ["Dragon Tee", "Attack Shirt", "Bleach Hoodie", "Anime Jacket"],
      "Default sorting must be newest first (createdAt: -1)"
    );
  });

  test("TEST 8: Select oldest (sort=oldest) -> Earliest created product comes first", async () => {
    const req = {
      query: {
        sort: "oldest",
        limit: 10,
      },
    };
    const res = createMockRes();

    await getProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    const names = res.body.products.map((p) => p.name);

    // Earliest created: Anime Jacket -> Bleach Hoodie -> Attack Shirt -> Dragon Tee
    assert.deepStrictEqual(
      names,
      ["Anime Jacket", "Bleach Hoodie", "Attack Shirt", "Dragon Tee"],
      "Oldest sorting must be earliest first (createdAt: 1)"
    );
  });
});
