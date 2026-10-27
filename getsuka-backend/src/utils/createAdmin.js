import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import Admin from "../features/admin/models/Admin.js";

dotenv.config();

/**
 * CLI Utility to provision an administrator account securely.
 *
 * Usage:
 *   node src/utils/createAdmin.js <email> <password> [fullName]
 * Or via environment variables:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret node src/utils/createAdmin.js
 *
 * NEVER hardcodes passwords or credentials in source code.
 */
const createAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getsuka";
    await mongoose.connect(mongoUri);

    console.log("Connected to MongoDB");

    // Read from CLI arguments or environment variables
    const args = process.argv.slice(2);
    const email = (args[0] || process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const password = args[1] || process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
    const fullName = (args[2] || process.env.INITIAL_ADMIN_NAME || process.env.ADMIN_NAME || "Administrator").trim();

    if (!email || !password) {
      console.error("\n[ERROR] Admin credentials missing!");
      console.log("\nUsage:");
      console.log("  node src/utils/createAdmin.js <email> <password> [fullName]");
      console.log("Or configure via environment variables:");
      console.log("  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=strongpassword node src/utils/createAdmin.js\n");
      await mongoose.disconnect();
      process.exit(1);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("\n[ERROR] Invalid email address format.\n");
      await mongoose.disconnect();
      process.exit(1);
    }

    if (password.length < 10) {
      console.error("\n[ERROR] Password must be at least 10 characters long.\n");
      await mongoose.disconnect();
      process.exit(1);
    }

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log(`\n[NOTICE] Administrator with email "${email}" already exists. No changes made.\n`);
      await mongoose.disconnect();
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await Admin.create({
      fullName,
      email,
      password: hashedPassword,
      role: "admin",
      isBlocked: false,
    });

    console.log(`\n[SUCCESS] Administrator "${email}" created successfully.\n`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n[ERROR] Failed to create administrator:", error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
};

createAdmin();