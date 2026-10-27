import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  uploadBase64Image,
  isBase64Image,
} from "../services/imageService.js";

dotenv.config();

/**
 * Migration Utility: Migrate Base64 Images in MongoDB to Cloudinary
 *
 * Usage:
 *   node src/utils/migrateImagesToCloudinary.js [--dry-run] [--rollback] [--batch-size=5]
 *
 * Features:
 * - Dry-run mode: inspects collections without making changes
 * - Backup: preserves pre-migration documents before updating
 * - Idempotent: safe to run multiple times, skips already-migrated URLs
 * - Sanitized logging: never outputs Base64 strings or credentials
 */
export async function runMigration(options = {}) {
  const isDryRun =
    options.dryRun ?? process.argv.includes("--dry-run");
  const isRollback =
    options.rollback ?? process.argv.includes("--rollback");
  const batchSize =
    options.batchSize ||
    parseInt(
      process.argv
        .find((arg) => arg.startsWith("--batch-size="))
        ?.split("=")[1] || "5",
      10
    );

  console.log("=================================================");
  console.log(" GETSUKA — Image Storage Migration (GET-006)");
  console.log(` Mode: ${isDryRun ? "DRY-RUN (No changes applied)" : isRollback ? "ROLLBACK" : "LIVE MIGRATION"}`);
  console.log(` Batch Size: ${batchSize}`);
  console.log("=================================================");

  const report = {
    mode: isDryRun ? "dry-run" : isRollback ? "rollback" : "live",
    productsChecked: 0,
    productsNeedingMigration: 0,
    productsMigrated: 0,
    productImagesMigrated: 0,
    ordersChecked: 0,
    ordersNeedingMigration: 0,
    ordersMigrated: 0,
    orderImagesMigrated: 0,
    totalBytesSaved: 0,
    errors: [],
  };

  const db = mongoose.connection.db;

  if (isRollback) {
    console.log("[ROLLBACK] Starting rollback from pre-migration backup collections...");
    const productBackupColl = db.collection("products_backup_pre_migration");
    const orderBackupColl = db.collection("orders_backup_pre_migration");

    const productBackups = await productBackupColl.find({}).toArray();
    for (const backup of productBackups) {
      await db.collection("products").replaceOne(
        { _id: backup._id },
        backup.originalDoc,
        { upsert: true }
      );
    }
    console.log(`[ROLLBACK] Restored ${productBackups.length} product records.`);

    const orderBackups = await orderBackupColl.find({}).toArray();
    for (const backup of orderBackups) {
      await db.collection("orders").replaceOne(
        { _id: backup._id },
        backup.originalDoc,
        { upsert: true }
      );
    }
    console.log(`[ROLLBACK] Restored ${orderBackups.length} order records.`);
    console.log("[ROLLBACK] Rollback completed.");
    return report;
  }

  // =========================================================================
  // 1. MIGRATE PRODUCTS
  // =========================================================================
  const productsCollection = db.collection("products");
  const productBackupCollection = db.collection("products_backup_pre_migration");

  const productsCursor = productsCollection.find({});
  const allProducts = await productsCursor.toArray();
  report.productsChecked = allProducts.length;

  console.log(`[PRODUCTS] Found ${allProducts.length} total products in database.`);

  for (const product of allProducts) {
    if (!Array.isArray(product.images)) continue;

    const base64Indices = [];
    let estimatedProductBytes = 0;

    product.images.forEach((img, idx) => {
      if (isBase64Image(img)) {
        base64Indices.push(idx);
        estimatedProductBytes += img.length;
      }
    });

    if (base64Indices.length === 0) {
      continue;
    }

    report.productsNeedingMigration++;
    report.totalBytesSaved += estimatedProductBytes;

    console.log(
      `[PRODUCTS] Product ID ${product._id} ("${product.name || "Untitled"}"): ` +
        `${base64Indices.length} Base64 image(s) detected (~${Math.round(estimatedProductBytes / 1024)} KB).`
    );

    if (isDryRun) {
      report.productsMigrated++;
      report.productImagesMigrated += base64Indices.length;
      continue;
    }

    // Backup original product record before mutation
    await productBackupCollection.updateOne(
      { _id: product._id },
      {
        $set: {
          originalDoc: product,
          backedUpAt: new Date(),
        },
      },
      { upsert: true }
    );

    // Upload Base64 images to Cloudinary
    const updatedImages = [...product.images];
    let productSuccess = true;

    for (const idx of base64Indices) {
      try {
        const rawBase64 = product.images[idx];
        const uploadResult = await uploadBase64Image(rawBase64, {
          folder: "getsuka/migrated-products",
        });

        updatedImages[idx] = uploadResult.url;
        report.productImagesMigrated++;
        console.log(
          `  -> Migrated image [${idx}] to storage: ${uploadResult.url}`
        );
      } catch (uploadError) {
        productSuccess = false;
        report.errors.push({
          collection: "products",
          documentId: String(product._id),
          imageIndex: idx,
          error: uploadError.message,
        });
        console.error(
          `  -> [ERROR] Failed to migrate image [${idx}] for product ${product._id}: ${uploadError.message}`
        );
        break;
      }
    }

    if (productSuccess) {
      await productsCollection.updateOne(
        { _id: product._id },
        {
          $set: {
            images: updatedImages,
            migratedAt: new Date(),
          },
        }
      );
      report.productsMigrated++;
    }
  }

  // =========================================================================
  // 2. MIGRATE ORDERS
  // =========================================================================
  const ordersCollection = db.collection("orders");
  const orderBackupCollection = db.collection("orders_backup_pre_migration");

  const ordersCursor = ordersCollection.find({});
  const allOrders = await ordersCursor.toArray();
  report.ordersChecked = allOrders.length;

  console.log(`[ORDERS] Found ${allOrders.length} total orders in database.`);

  for (const order of allOrders) {
    if (!Array.isArray(order.items)) continue;

    const base64ItemIndices = [];
    let estimatedOrderBytes = 0;

    order.items.forEach((item, idx) => {
      if (item?.productImage && isBase64Image(item.productImage)) {
        base64ItemIndices.push(idx);
        estimatedOrderBytes += item.productImage.length;
      }
    });

    if (base64ItemIndices.length === 0) {
      continue;
    }

    report.ordersNeedingMigration++;
    report.totalBytesSaved += estimatedOrderBytes;

    console.log(
      `[ORDERS] Order ID ${order._id}: ${base64ItemIndices.length} Base64 item image(s) detected (~${Math.round(estimatedOrderBytes / 1024)} KB).`
    );

    if (isDryRun) {
      report.ordersMigrated++;
      report.orderImagesMigrated += base64ItemIndices.length;
      continue;
    }

    // Backup original order record
    await orderBackupCollection.updateOne(
      { _id: order._id },
      {
        $set: {
          originalDoc: order,
          backedUpAt: new Date(),
        },
      },
      { upsert: true }
    );

    const updatedItems = [...order.items];
    let orderSuccess = true;

    for (const idx of base64ItemIndices) {
      try {
        const rawBase64 = order.items[idx].productImage;
        const uploadResult = await uploadBase64Image(rawBase64, {
          folder: "getsuka/migrated-orders",
        });

        updatedItems[idx] = {
          ...updatedItems[idx],
          productImage: uploadResult.url,
        };
        report.orderImagesMigrated++;
        console.log(
          `  -> Migrated order item [${idx}] to storage: ${uploadResult.url}`
        );
      } catch (uploadError) {
        orderSuccess = false;
        report.errors.push({
          collection: "orders",
          documentId: String(order._id),
          itemIndex: idx,
          error: uploadError.message,
        });
        console.error(
          `  -> [ERROR] Failed to migrate item [${idx}] for order ${order._id}: ${uploadError.message}`
        );
        break;
      }
    }

    if (orderSuccess) {
      await ordersCollection.updateOne(
        { _id: order._id },
        {
          $set: {
            items: updatedItems,
            migratedAt: new Date(),
          },
        }
      );
      report.ordersMigrated++;
    }
  }

  console.log("=================================================");
  console.log(" MIGRATION SUMMARY REPORT");
  console.log("=================================================");
  console.log(` Products Checked: ${report.productsChecked}`);
  console.log(` Products Requiring Migration: ${report.productsNeedingMigration}`);
  console.log(` Products Migrated: ${report.productsMigrated}`);
  console.log(` Product Images Migrated: ${report.productImagesMigrated}`);
  console.log(` Orders Checked: ${report.ordersChecked}`);
  console.log(` Orders Requiring Migration: ${report.ordersNeedingMigration}`);
  console.log(` Orders Migrated: ${report.ordersMigrated}`);
  console.log(` Order Images Migrated: ${report.orderImagesMigrated}`);
  console.log(` Approximate Storage Recovered: ~${Math.round(report.totalBytesSaved / 1024)} KB`);
  console.log(` Total Errors: ${report.errors.length}`);
  console.log("=================================================");

  return report;
}

// Standalone CLI execution
if (process.argv[1]?.endsWith("migrateImagesToCloudinary.js")) {
  (async () => {
    try {
      if (!process.env.MONGO_URI) {
        console.error("MONGO_URI not configured in environment.");
        process.exit(1);
      }
      await mongoose.connect(process.env.MONGO_URI);
      await runMigration();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error("Fatal migration error:", err);
      process.exit(1);
    }
  })();
}
