import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

/**
 * Non-destructive migration to backfill `isDeleted: false` on legacy User documents.
 * Usage:
 *   node src/utils/migrateUsersSoftDelete.js --dry-run
 *   node src/utils/migrateUsersSoftDelete.js --apply
 */
async function migrateUsersSoftDelete() {
  const args = process.argv.slice(2);
  const isApply = args.includes("--apply");
  const isDryRun = !isApply;

  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI environment variable is missing.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    console.log(`[MIGRATION] Connected to database: "${db.databaseName}"`);
    console.log(`[MIGRATION] Mode: ${isApply ? "APPLY (writing changes)" : "DRY-RUN (read-only preview)"}`);

    const usersCol = db.collection("users");

    // Query users lacking the `isDeleted` field
    const query = { isDeleted: { $exists: false } };
    const countToUpdate = await usersCol.countDocuments(query);

    console.log(`[MIGRATION] Found ${countToUpdate} user document(s) missing 'isDeleted'.`);

    if (countToUpdate > 0) {
      const sample = await usersCol.find(query).limit(5).project({ _id: 1, email: 1 }).toArray();
      console.log("[MIGRATION] Sample affected users:", sample.map(u => ({ id: u._id, email: u.email })));

      if (isApply) {
        const result = await usersCol.updateMany(query, {
          $set: {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
          },
        });
        console.log(`[MIGRATION] Successfully updated ${result.modifiedCount} user document(s).`);
      } else {
        console.log("[MIGRATION] Dry-run complete. No changes made. Run with --apply to write changes.");
      }
    } else {
      console.log("[MIGRATION] All user documents already have the 'isDeleted' field populated.");
    }

    await mongoose.disconnect();
    console.log("[MIGRATION] Finished.");
  } catch (error) {
    console.error("[MIGRATION ERROR]", error);
    process.exit(1);
  }
}

migrateUsersSoftDelete();
