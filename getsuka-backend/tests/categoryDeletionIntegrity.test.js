import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";

import Category from "../src/features/category/models/Category.js";
import Product from "../src/features/product/models/Product.js";
import Order from "../src/features/order/models/Order.js";

import {
  deleteCategory,
  addCategory,
  getCategories,
} from "../src/features/category/controllers/categoryController.js";
import {
  updateProduct,
  getProductById,
} from "../src/features/product/controllers/productController.js";
import { getPublicProducts } from "../src/features/product/controllers/publicProductController.js";

const TEST_DB_URI =
  "mongodb://127.0.0.1:27017/getsuka_test_category_deletion_integrity";

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

describe("Step 13: Category Deletion Data Integrity Tests", () => {
  let emptyCategory;
  let activeCategory;
  let softDeletedProductCategory;
  let productA;
  let productB;
  let softDeletedProduct;

  before(async () => {
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    // 1. Empty category (no products assigned)
    emptyCategory = await Category.create({
      name: "Empty Category",
      isDeleted: false,
    });

    // 2. Category with active products
    activeCategory = await Category.create({
      name: "Anime Hoodies",
      isDeleted: false,
    });

    // 3. Category with only soft-deleted product
    softDeletedProductCategory = await Category.create({
      name: "Old Season Apparel",
      isDeleted: false,
    });

    // Create active products for activeCategory
    productA = await Product.create({
      name: "Goku Ultra Hoodie",
      productCode: "HOODIE-GOKU-01",
      description: "Premium Saiyan hoodie",
      category: activeCategory._id,
      anime: "Dragon Ball",
      images: [
        "https://example.com/h1.jpg",
        "https://example.com/h2.jpg",
        "https://example.com/h3.jpg",
      ],
      price: 2499,
      salePrice: 1999,
      variants: [
        {
          color: "Black",
          size: "L",
          sku: "GOKU-BLK-L",
          stock: 15,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    productB = await Product.create({
      name: "Vegeta Prince Hoodie",
      productCode: "HOODIE-VEG-02",
      description: "Prince of all Saiyans hoodie",
      category: activeCategory._id,
      anime: "Dragon Ball",
      images: [
        "https://example.com/v1.jpg",
        "https://example.com/v2.jpg",
        "https://example.com/v3.jpg",
      ],
      price: 2699,
      salePrice: 2199,
      variants: [
        {
          color: "Navy",
          size: "M",
          sku: "VEG-NAV-M",
          stock: 8,
        },
      ],
      isListed: true,
      isDeleted: false,
    });

    // Create product in softDeletedProductCategory and soft-delete it
    softDeletedProduct = await Product.create({
      name: "Vintage Naruto Tee",
      productCode: "TEE-NAR-99",
      description: "Classic vintage tee",
      category: softDeletedProductCategory._id,
      anime: "Naruto",
      images: [
        "https://example.com/n1.jpg",
        "https://example.com/n2.jpg",
        "https://example.com/n3.jpg",
      ],
      price: 999,
      variants: [
        {
          color: "Orange",
          size: "L",
          sku: "NAR-ORG-L",
          stock: 0,
        },
      ],
      isListed: false,
      isDeleted: true,
    });
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  // ========================================================
  // TEST 1: Category with no products
  // ========================================================
  test("TEST 1: Category with no products -> Category deletion works safely", async () => {
    const req = {
      params: { categoryId: emptyCategory._id.toString() },
    };
    const res = createMockRes();

    await deleteCategory(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.message, "Category deleted successfully");

    // Verify category is soft-deleted in database
    const dbCategory = await Category.findById(emptyCategory._id);
    assert.strictEqual(dbCategory.isDeleted, true);
  });

  // ========================================================
  // TEST 2: Category with active products
  // ========================================================
  test("TEST 2: Category with active products -> System blocks deletion with 400 Bad Request", async () => {
    const req = {
      params: { categoryId: activeCategory._id.toString() },
    };
    const res = createMockRes();

    await deleteCategory(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(
      res.body.message.includes("Cannot delete category because active products are assigned"),
      `Expected error message to mention active products, got: ${res.body.message}`
    );
    assert.strictEqual(res.body.activeProductsCount, 2);

    // Verify category remains NOT deleted in database
    const dbCategory = await Category.findById(activeCategory._id);
    assert.strictEqual(dbCategory.isDeleted, false);
  });

  // ========================================================
  // TEST 3: Product listing after category deletion
  // ========================================================
  test("TEST 3: Product listing after category deletion -> No broken products", async () => {
    // Soft-deleted category (Empty Category) was deleted in TEST 1
    // Let's test public product listing
    const req = {
      query: {
        page: "1",
        limit: "10",
      },
    };
    const res = createMockRes();

    await getPublicProducts(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.products));

    // Products A and B must be present and have their active category populated
    const foundProductA = res.body.products.find(
      (p) => p._id.toString() === productA._id.toString()
    );
    assert.ok(foundProductA, "Product A should be listed");
    assert.ok(foundProductA.category, "Product A category should be populated");
    assert.strictEqual(foundProductA.category.name, "Anime Hoodies");

    // Soft-deleted product should NOT appear in public listing
    const foundDeleted = res.body.products.find(
      (p) => p._id.toString() === softDeletedProduct._id.toString()
    );
    assert.strictEqual(foundDeleted, undefined, "Soft-deleted product must not appear");
  });

  // ========================================================
  // TEST 4: Admin product edit after category deletion attempt
  // ========================================================
  test("TEST 4: Admin product edit after category deletion attempt -> No broken references", async () => {
    // Because activeCategory deletion was blocked, admin can still edit Product A
    const req = {
      params: { productId: productA._id.toString() },
      body: {
        name: "Goku Ultra Instinct Hoodie",
        productCode: productA.productCode,
        description: "Updated saiyan hoodie description",
        category: activeCategory._id.toString(),
        anime: "Dragon Ball Super",
        images: productA.images,
        price: 2799,
        salePrice: 2299,
        variants: [
          {
            color: "White",
            size: "XL",
            sku: "GOKU-WHT-XL",
            stock: 20,
          },
        ],
      },
    };
    const res = createMockRes();

    await updateProduct(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.message, "Product updated successfully");

    // Verify updated product in database
    const updatedProduct = await Product.findById(productA._id);
    assert.strictEqual(updatedProduct.name, "Goku Ultra Instinct Hoodie");
    assert.strictEqual(updatedProduct.price, 2799);
    assert.strictEqual(
      updatedProduct.category.toString(),
      activeCategory._id.toString()
    );
  });

  // ========================================================
  // TEST 5: Category restoration if supported
  // ========================================================
  test("TEST 5: Category restoration -> Re-adding soft-deleted category restores it with same ID", async () => {
    // Empty Category was soft deleted in TEST 1
    const req = {
      body: { name: "Empty Category" },
    };
    const res = createMockRes();

    await addCategory(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.message, "Category restored successfully");
    assert.strictEqual(
      res.body.category._id.toString(),
      emptyCategory._id.toString()
    );
    assert.strictEqual(res.body.category.isDeleted, false);

    // Verify in DB
    const restoredCat = await Category.findById(emptyCategory._id);
    assert.strictEqual(restoredCat.isDeleted, false);
  });

  // ========================================================
  // TEST 6: Old orders containing products from deleted category
  // ========================================================
  test("TEST 6: Old orders containing products from deleted category -> Order history remains intact", async () => {
    // Create an order referencing softDeletedProduct
    const testOrder = await Order.create({
      userId: new mongoose.Types.ObjectId(),
      orderNumber: "ORD-HIST-001",
      items: [
        {
          productId: softDeletedProduct._id,
          variantId: new mongoose.Types.ObjectId(),
          productName: softDeletedProduct.name,
          productImage: softDeletedProduct.images[0],
          sku: softDeletedProduct.variants[0].sku,
          size: softDeletedProduct.variants[0].size,
          color: softDeletedProduct.variants[0].color,
          quantity: 1,
          price: 999,
          totalPrice: 999,
          itemStatus: "active",
        },
      ],
      shippingAddress: {
        addressId: new mongoose.Types.ObjectId(),
        fullName: "Test User",
        phone: "9876543210",
        addressLine: "123 Anime St",
        city: "Tokyo",
        state: "Kanto",
        pincode: "100001",
      },
      paymentMethod: "cod",
      paymentStatus: "paid",
      status: "delivered",
      subtotal: 999,
      totalAmount: 999,
    });

    // Now delete softDeletedProductCategory (it only has a soft-deleted product)
    const delReq = {
      params: { categoryId: softDeletedProductCategory._id.toString() },
    };
    const delRes = createMockRes();

    await deleteCategory(delReq, delRes);

    assert.strictEqual(delRes.statusCode, 200);
    assert.strictEqual(delRes.body.success, true);

    // Check order in DB
    const fetchedOrder = await Order.findById(testOrder._id);
    assert.ok(fetchedOrder, "Order must still exist");
    assert.strictEqual(fetchedOrder.items.length, 1);
    assert.strictEqual(fetchedOrder.items[0].productName, "Vintage Naruto Tee");
    assert.strictEqual(fetchedOrder.items[0].price, 999);
    assert.strictEqual(fetchedOrder.items[0].totalPrice, 999);
    assert.strictEqual(fetchedOrder.status, "delivered");
    assert.strictEqual(fetchedOrder.totalAmount, 999);
  });

  // ========================================================
  // TEST 7: Category with only soft-deleted products can be deleted safely
  // ========================================================
  test("TEST 7: Category with only soft-deleted products can be deleted safely", async () => {
    // softDeletedProductCategory was successfully deleted in TEST 6 because activeProductsCount was 0
    const dbCat = await Category.findById(softDeletedProductCategory._id);
    assert.strictEqual(dbCat.isDeleted, true);

    // Historical product record still retains historical category reference
    const dbProduct = await Product.findById(softDeletedProduct._id);
    assert.strictEqual(
      dbProduct.category.toString(),
      softDeletedProductCategory._id.toString()
    );
  });

  // ========================================================
  // TEST 8: Invalid or non-existent category ID handling
  // ========================================================
  test("TEST 8: Non-existent category ID returns 404, invalid ID returns 400", async () => {
    // Invalid ID
    const invReq = { params: { categoryId: "invalid-id-format" } };
    const invRes = createMockRes();
    await deleteCategory(invReq, invRes);
    assert.strictEqual(invRes.statusCode, 400);
    assert.strictEqual(invRes.body.success, false);
    assert.strictEqual(invRes.body.message, "Invalid category ID");

    // Non-existent valid ObjectId
    const nonReq = { params: { categoryId: new mongoose.Types.ObjectId().toString() } };
    const nonRes = createMockRes();
    await deleteCategory(nonReq, nonRes);
    assert.strictEqual(nonRes.statusCode, 404);
    assert.strictEqual(nonRes.body.success, false);
    assert.strictEqual(nonRes.body.message, "Category not found");
  });
});
