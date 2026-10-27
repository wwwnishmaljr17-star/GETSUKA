import bcrypt from "bcryptjs";
import Admin from "../models/Admin.js";
import logger from "../../../utils/logger.js";

/**
 * INITIAL ADMIN BOOTSTRAP (SECURE ENVIRONMENT-DRIVEN)
 *
 * Runs once during application initialization if and only if NO administrators exist in the database.
 * Credentials must be provided via environment variables (INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD).
 *
 * Security guarantees (GET-003):
 * 1. Never creates an administrator with a hardcoded or publicly known default password.
 * 2. Fails safely without creating insecure accounts if environment credentials are not provided.
 * 3. Enforces password length (>= 10 chars) and rejects common default/weak passwords.
 * 4. Never overwrites or resets an existing administrator's password on startup.
 * 5. Uses secure bcrypt hashing (10 salt rounds).
 * 6. Never logs secret passwords.
 */
export const bootstrapInitialAdmin = async () => {
  try {
    // 1. Guard against unnecessary or repeated execution
    // If any administrator account already exists, bootstrap is complete.
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      logger.info("Administrator accounts already exist; skipping initial admin bootstrap");
      return;
    }

    // 2. Read bootstrap credentials exclusively from environment variables
    const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
    const adminName = (process.env.INITIAL_ADMIN_NAME || process.env.ADMIN_NAME || "GETSUKA Administrator").trim();

    // 3. If credentials are not provided in environment, fail safely without creating insecure accounts
    if (!adminEmail || !adminPassword) {
      logger.warn(
        "No administrator accounts exist in the database and INITIAL_ADMIN_EMAIL / INITIAL_ADMIN_PASSWORD are not configured. Initial admin bootstrap skipped."
      );
      return;
    }

    // 4. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminEmail)) {
      logger.error("Initial admin bootstrap aborted: INITIAL_ADMIN_EMAIL is not a valid email address");
      return;
    }

    // 5. Validate password complexity and reject known default/weak passwords
    const FORBIDDEN_PASSWORDS = [
      "admin@12345",
      "admin123",
      "password",
      "password123",
      "admin",
      "12345678",
      "getsuka",
      "getsuka123",
    ];

    if (adminPassword.length < 10) {
      logger.error("Initial admin bootstrap aborted: INITIAL_ADMIN_PASSWORD must be at least 10 characters long");
      return;
    }

    if (FORBIDDEN_PASSWORDS.includes(adminPassword.toLowerCase())) {
      logger.error("Initial admin bootstrap aborted: INITIAL_ADMIN_PASSWORD cannot be a commonly known default or weak password");
      return;
    }

    // 6. Check if an admin with this email exists (double-check race condition)
    const existingAdmin = await Admin.findOne({ email: adminEmail });
    if (existingAdmin) {
      logger.info(`Administrator "${adminEmail}" already exists; skipping bootstrap`);
      return;
    }

    // 7. Secure password hashing using bcrypt with 10 salt rounds
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // 8. Create the initial administrator
    await Admin.create({
      fullName: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isBlocked: false,
    });

    logger.info(`Initial administrator "${adminEmail}" created successfully from environment configuration`);
  } catch (error) {
    logger.error("Initial admin bootstrap failed:", { error: error.message });
  }
};

export const createDefaultAdmin = bootstrapInitialAdmin;
export default bootstrapInitialAdmin;
