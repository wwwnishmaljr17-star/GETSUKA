/**
 * GETSUKA Backend Environment Variable Validation
 *
 * Validates configuration at startup and fails early in production
 * if essential environment variables are missing.
 * NEVER prints secret values to logs or console.
 */

export const validateEnvironment = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const missingCritical = [];
  const warnings = [];

  // 1. JWT_SECRET Validation
  if (!process.env.JWT_SECRET) {
    if (isProduction) {
      missingCritical.push("JWT_SECRET");
    } else {
      process.env.JWT_SECRET = "getsuka_dev_jwt_secret_key_change_in_production";
      warnings.push("JWT_SECRET is not set; using local development fallback.");
    }
  } else if (
    isProduction &&
    (process.env.JWT_SECRET === "your_super_secret_jwt_key_here_change_in_production" ||
      process.env.JWT_SECRET.length < 16)
  ) {
    missingCritical.push("JWT_SECRET (must be at least 16 characters and not a placeholder in production)");
  }

  // 2. MONGO_URI Validation
  if (!process.env.MONGO_URI) {
    if (isProduction) {
      missingCritical.push("MONGO_URI");
    } else {
      warnings.push("MONGO_URI is not set; will attempt local MongoDB fallback (127.0.0.1:27017/getsuka).");
    }
  }

  // 3. CORS Configuration Validation
  if (isProduction && !process.env.CLIENT_URL && !process.env.FRONTEND_URL) {
    warnings.push("Neither CLIENT_URL nor FRONTEND_URL is set in production. CORS may block client requests.");
  }

  // 4. Integrations check (Nodemailer, Razorpay, Cloudinary)
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    warnings.push("EMAIL_USER or EMAIL_PASSWORD missing; OTP email dispatch will fail.");
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    warnings.push("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET missing; online payments will fail.");
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    warnings.push("Cloudinary credentials missing; image upload features will fail.");
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    warnings.push("GOOGLE_CLIENT_ID missing; Google authentication will be unavailable.");
  }

  // 5. Admin Bootstrap Safety Validation (GET-003)
  const bootstrapPassword = process.env.INITIAL_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (bootstrapPassword) {
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

    if (FORBIDDEN_PASSWORDS.includes(bootstrapPassword.toLowerCase()) || bootstrapPassword.length < 10) {
      if (isProduction) {
        missingCritical.push("INITIAL_ADMIN_PASSWORD (cannot be a commonly known default or less than 10 characters in production)");
      } else {
        warnings.push("INITIAL_ADMIN_PASSWORD is set to a weak or default password. Use a strong unique password for production.");
      }
    }
  }

  // Output warnings if any
  if (warnings.length > 0 && process.env.NODE_ENV !== "test") {
    console.warn("\n[Config Warning] The following environment warnings were detected:");
    warnings.forEach((warn) => console.warn(`  - ${warn}`));
    console.warn("");
  }

  // Abort startup in production if critical variables are missing
  if (missingCritical.length > 0) {
    console.error("\n[CRITICAL CONFIG ERROR] Application startup aborted due to missing required variables:");
    missingCritical.forEach((key) => console.error(`  - Missing: ${key}`));
    console.error("Please configure these variables in your deployment environment.\n");
    if (isProduction) {
      process.exit(1);
    }
  }

  return {
    valid: missingCritical.length === 0,
    missing: missingCritical,
    warnings,
  };
};

export default validateEnvironment;
