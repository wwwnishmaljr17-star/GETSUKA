import { test, before, after, describe } from "node:test";
import assert from "node:assert";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

import Product from "../src/features/product/models/Product.js";
import Category from "../src/features/category/models/Category.js";
import Order from "../src/features/order/models/Order.js";
import User from "../src/features/auth/models/User.js";

import {
  addProduct,
  updateProduct,
  getProductById,
} from "../src/features/product/controllers/productController.js";
import {
  uploadSingleImage,
  uploadMultipleImages,
  deleteProductImage,
} from "../src/features/product/controllers/productImageController.js";
import {
  validateImageBuffer,
  uploadImageBuffer,
  uploadBase64Image,
  isBase64Image,
  deleteImage,
  extractPublicIdFromUrl,
} from "../src/services/imageService.js";
import { runMigration } from "../src/utils/migrateImagesToCloudinary.js";
import adminAuthMiddleware from "../src/middlewares/adminAuthMiddleware.js";
import cloudinary from "../src/config/cloudinary.js";

const TEST_DB_URI = "mongodb://127.0.0.1:27017/getsuka_test_get006_image_storage";
const JWT_SECRET = process.env.JWT_SECRET || "getsuka_super_secret_key";

// Valid 1x1 PNG image buffer
const VALID_PNG_BUFFER = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

// Valid 1x1 JPEG image buffer
const VALID_JPEG_BUFFER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9,
]);

// Valid Base64 data URL
const VALID_BASE64_IMAGE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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

describe("GET-006: Image Storage, Upload Handling & Migration Tests", () => {
  let adminToken;
  let category;

  before(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await mongoose.connect(TEST_DB_URI);
    await mongoose.connection.dropDatabase();

    category = await Category.create({
      name: "T-Shirts",
      isDeleted: false,
    });

    adminToken = jwt.sign(
      {
        id: new mongoose.Types.ObjectId(),
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  /* =========================================================================
     1. VALID IMAGE UPLOAD & BUFFER VALIDATION
     ========================================================================= */
  test("TEST 1: Valid image buffer validation recognizes JPEG and PNG magic bytes", () => {
    assert.strictEqual(validateImageBuffer(VALID_PNG_BUFFER), true);
    assert.strictEqual(validateImageBuffer(VALID_JPEG_BUFFER), true);
  });

  test("TEST 2: Valid image upload controller processes valid image file", async () => {
    const req = {
      file: {
        buffer: VALID_PNG_BUFFER,
        mimetype: "image/png",
        originalname: "test-thumbnail.png",
      },
    };
    const res = createMockRes();

    await uploadSingleImage(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(typeof res.body.url === "string" && res.body.url.startsWith("http"));
    assert.ok(typeof res.body.publicId === "string");
  });

  /* =========================================================================
     2. INVALID FILE TYPE REJECTION
     ========================================================================= */
  test("TEST 3: Invalid file type or corrupted signature is rejected with HTTP 400", () => {
    const fakeExeBuffer = Buffer.from("MZ\x90\x00\x03\x00\x00\x00malicious executable code");
    assert.throws(
      () => validateImageBuffer(fakeExeBuffer),
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /valid image headers/i);
        return true;
      }
    );
  });

  /* =========================================================================
     3. OVERSIZED UPLOAD REJECTION
     ========================================================================= */
  test("TEST 4: Oversized upload exceeding 5MB is rejected", () => {
    const oversizedBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    oversizedBuffer[0] = 0xff;
    oversizedBuffer[1] = 0xd8;
    oversizedBuffer[2] = 0xff;

    assert.throws(
      () => validateImageBuffer(oversizedBuffer),
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.match(err.message, /exceeds the maximum limit of 5MB/i);
        return true;
      }
    );
  });

  /* =========================================================================
     4. UNAUTHORIZED IMAGE UPLOAD
     ========================================================================= */
  test("TEST 5: Unauthorized request to image upload route is blocked by adminAuthMiddleware with 401", async () => {
    const req = {
      headers: {}, // No token provided
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

  /* =========================================================================
     5. PRODUCT CREATION WITH IMAGE URLS
     ========================================================================= */
  test("TEST 6: Product creation stores external image URLs in MongoDB (no Base64)", async () => {
    const imageUrls = [
      "https://res.cloudinary.com/test/image/upload/v1/getsuka/products/img1.jpg",
      "https://res.cloudinary.com/test/image/upload/v1/getsuka/products/img2.jpg",
      "https://res.cloudinary.com/test/image/upload/v1/getsuka/products/img3.jpg",
    ];

    const req = {
      body: {
        name: "Luffy Gear 5 Oversized Tee",
        productCode: "OP-GEAR5-001",
        description: "Premium anime heavyweight cotton t-shirt",
        category: category._id.toString(),
        anime: "One Piece",
        images: imageUrls,
        price: 1299,
        variants: [
          {
            color: "White",
            size: "L",
            sku: "OP-G5-WHT-L",
            stock: 50,
          },
        ],
      },
    };
    const res = createMockRes();

    await addProduct(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product.images.length, 3);
    assert.deepStrictEqual(res.body.product.images, imageUrls);

    // Verify directly in MongoDB document that no Base64 is stored
    const saved = await Product.findById(res.body.product._id).lean();
    assert.ok(saved);
    assert.strictEqual(saved.images.length, 3);
    for (const img of saved.images) {
      assert.strictEqual(img.startsWith("data:image/"), false);
      assert.ok(img.startsWith("https://res.cloudinary.com/"));
    }
  });

  /* =========================================================================
     6. PRODUCT EDITING AND IMAGE REPLACEMENT
     ========================================================================= */
  test("TEST 7: Product editing safely replaces image URLs and preserves ordering", async () => {
    const initialProduct = await Product.create({
      name: "Zoro Enma Graphic Tee",
      productCode: "OP-ZORO-002",
      description: "Authentic Zoro Enma swordsman t-shirt",
      category: category._id,
      anime: "One Piece",
      images: [
        "https://res.cloudinary.com/test/img_old_1.jpg",
        "https://res.cloudinary.com/test/img_old_2.jpg",
        "https://res.cloudinary.com/test/img_old_3.jpg",
      ],
      price: 1199,
      variants: [
        {
          color: "Black",
          size: "M",
          sku: "OP-ZORO-BLK-M",
          stock: 25,
        },
      ],
    });

    const updatedImageUrls = [
      "https://res.cloudinary.com/test/img_new_1.jpg",
      "https://res.cloudinary.com/test/img_old_2.jpg", // Kept old image at index 1
      "https://res.cloudinary.com/test/img_new_3.jpg",
      "https://res.cloudinary.com/test/img_new_4.jpg",
    ];

    const req = {
      params: { productId: initialProduct._id.toString() },
      body: {
        name: "Zoro Enma Graphic Tee - Special Edition",
        productCode: "OP-ZORO-002",
        description: "Updated description",
        category: category._id.toString(),
        anime: "One Piece",
        images: updatedImageUrls,
        price: 1299,
        variants: [
          {
            color: "Black",
            size: "M",
            sku: "OP-ZORO-BLK-M",
            stock: 30,
          },
        ],
      },
    };
    const res = createMockRes();

    await updateProduct(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product.images.length, 4);
    assert.deepStrictEqual(res.body.product.images, updatedImageUrls);

    // Verify DB update
    const updated = await Product.findById(initialProduct._id).lean();
    assert.deepStrictEqual(updated.images, updatedImageUrls);
  });

  /* =========================================================================
     7. IMAGE DELETION CONTROLLER
     ========================================================================= */
  test("TEST 8: Image deletion endpoint extracts publicId and requests removal", async () => {
    const req = {
      body: {
        url: "https://res.cloudinary.com/kkncgktf/image/upload/v12345/getsuka/products/sample-test.jpg",
      },
    };
    const res = createMockRes();

    await deleteProductImage(req, res, (err) => {
      if (err) throw err;
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.message, "Image deleted successfully");
  });

  /* =========================================================================
     8. FAILED UPLOAD / REJECTION HANDLING WITHOUT ORPHANED PRODUCTS
     ========================================================================= */
  test("TEST 9: Failed image processing does not create incomplete product document", async () => {
    const totalBefore = await Product.countDocuments();

    const req = {
      body: {
        name: "Corrupt Image Tee",
        description: "Should fail before creation",
        category: category._id.toString(),
        anime: "Bleach",
        images: [
          "https://example.com/valid1.jpg",
          "data:image/corrupt;notbase64!@@#$%", // Malformed Base64 image
          "https://example.com/valid3.jpg",
        ],
        price: 999,
        variants: [{ color: "Black", size: "S", sku: "BL-COR-S", stock: 10 }],
      },
    };
    const res = createMockRes();

    await addProduct(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.success, false);

    const totalAfter = await Product.countDocuments();
    assert.strictEqual(totalAfter, totalBefore); // No orphaned document created
  });

  /* =========================================================================
     9. SCHEMA LEVEL VALIDATION: REJECTION OF RAW BASE64 IN MONGO
     ========================================================================= */
  test("TEST 10: Product Mongoose schema strictly rejects raw Base64 data URLs on validation", async () => {
    const productWithBase64 = new Product({
      name: "Direct Base64 Insertion Attempt",
      description: "Direct save test",
      category: category._id,
      anime: "Naruto",
      images: [
        VALID_BASE64_IMAGE,
        "https://example.com/valid2.jpg",
        "https://example.com/valid3.jpg",
      ],
      price: 899,
      variants: [{ color: "Orange", size: "M", sku: "NAR-DIR-M", stock: 5 }],
    });

    await assert.rejects(
      async () => {
        await productWithBase64.save();
      },
      (err) => {
        assert.ok(err.errors?.images);
        assert.match(err.errors.images.message, /Raw Base64 image data cannot be stored/i);
        return true;
      }
    );
  });

  /* =========================================================================
     10. LEGACY BASE64 COMPATIBILITY & MIGRATION UTILITY
     ========================================================================= */
  test("TEST 11: Migration utility detects Base64 images, uploads to Cloudinary, and updates MongoDB", async () => {
    // Insert mock legacy product directly into MongoDB collection bypassing Mongoose schema
    const rawDb = mongoose.connection.db;
    const legacyProduct = {
      name: "Legacy Base64 Stored Product",
      description: "Document created prior to GET-006 fix",
      category: category._id,
      anime: "Jujutsu Kaisen",
      images: [
        VALID_BASE64_IMAGE,
        "https://res.cloudinary.com/test/existing-url.jpg",
        VALID_BASE64_IMAGE,
      ],
      price: 1499,
      variants: [{ color: "Navy", size: "XL", sku: "JJK-LEG-XL", stock: 15 }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const insertResult = await rawDb.collection("products").insertOne(legacyProduct);
    const legacyId = insertResult.insertedId;

    // Run migration
    const migrationReport = await runMigration({ dryRun: false });

    assert.ok(migrationReport.productsNeedingMigration >= 1);
    assert.ok(migrationReport.productImagesMigrated >= 2);
    assert.strictEqual(migrationReport.errors.length, 0);

    // Verify document was updated in MongoDB and Base64 replaced with Cloudinary URLs
    const migratedDoc = await rawDb.collection("products").findOne({ _id: legacyId });
    assert.ok(migratedDoc);
    assert.strictEqual(migratedDoc.images.length, 3);
    for (const img of migratedDoc.images) {
      assert.strictEqual(img.startsWith("data:image/"), false);
      assert.ok(img.startsWith("http"));
    }

    // Verify pre-migration backup was created
    const backupDoc = await rawDb.collection("products_backup_pre_migration").findOne({ _id: legacyId });
    assert.ok(backupDoc);
    assert.ok(backupDoc.originalDoc);
    assert.strictEqual(backupDoc.originalDoc.images[0], VALID_BASE64_IMAGE);
  });

  /* =========================================================================
     11. MIGRATION IDEMPOTENCY
     ========================================================================= */
  test("TEST 12: Migration utility is fully idempotent: running again performs zero modifications", async () => {
    const secondReport = await runMigration({ dryRun: false });

    assert.strictEqual(secondReport.productsNeedingMigration, 0);
    assert.strictEqual(secondReport.productImagesMigrated, 0);
    assert.strictEqual(secondReport.errors.length, 0);
  });

  /* =========================================================================
     12. PRODUCT RETRIEVAL & DETAILS INTEGRITY
     ========================================================================= */
  test("TEST 13: Product details endpoint loads migrated and URL-based images seamlessly", async () => {
    const product = await Product.create({
      name: "Gojo Satoru Domain Expansion Tee",
      productCode: "JJK-GOJO-003",
      description: "Limitless void print t-shirt",
      category: category._id,
      anime: "Jujutsu Kaisen",
      images: [
        "https://res.cloudinary.com/test/gojo1.jpg",
        "https://res.cloudinary.com/test/gojo2.jpg",
        "https://res.cloudinary.com/test/gojo3.jpg",
      ],
      price: 1599,
      variants: [{ color: "Black", size: "L", sku: "JJK-GOJO-BLK-L", stock: 20 }],
    });

    const req = {
      params: { productId: product._id.toString() },
    };
    const res = createMockRes();

    await getProductById(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.product.images.length, 3);
    assert.deepStrictEqual(res.body.product.images, product.images);
  });

  /* =========================================================================
     13. CATEGORY AND PROFILE PATHS INTEGRITY
     ========================================================================= */
  test("TEST 14: Category schema remains intact without image fields; User profile image uses Cloudinary", async () => {
    const cat = await Category.findById(category._id).lean();
    assert.ok(cat);
    assert.strictEqual(cat.name, "T-Shirts");
    assert.strictEqual(cat.image, undefined);

    const testUser = await User.create({
      fullName: "Nishmal Test",
      email: "nishmal.test.image@example.com",
      password: "HashedPassword123",
      profileImage: "https://res.cloudinary.com/kkncgktf/image/upload/v1/getsuka/profile-images/user1.jpg",
      isVerified: true,
    });

    assert.ok(testUser);
    assert.strictEqual(
      testUser.profileImage,
      "https://res.cloudinary.com/kkncgktf/image/upload/v1/getsuka/profile-images/user1.jpg"
    );
  });
});
