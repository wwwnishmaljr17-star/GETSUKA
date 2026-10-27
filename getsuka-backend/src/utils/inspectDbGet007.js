import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

async function inspectDbForGet007() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    console.log("Connected to MongoDB database:", db.databaseName);

    const collections = await db.listCollections().toArray();
    console.log(`\n=== Document Counts in ${db.databaseName} ===`);
    for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count}`);
    }

    const usersCol = db.collection("users");
    const sampleUsers = await usersCol.find({}).project({ email: 1, isDeleted: 1, isBlocked: 1, isVerified: 1 }).toArray();
    console.log("\n=== Users Sample ===");
    console.log(JSON.stringify(sampleUsers, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error inspecting database:", err);
  }
}

inspectDbForGet007();
