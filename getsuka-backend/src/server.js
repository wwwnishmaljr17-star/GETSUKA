import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./features/auth/routes/authRoutes.js";

import adminAuthRoutes from "./features/admin/routes/adminAuthRoutes.js";
import adminUserRoutes from "./features/admin/routes/adminUserRoutes.js";
import adminProfileRoutes from "./features/admin/routes/adminProfileRoutes.js";
import adminPasswordRoutes from "./features/admin/routes/adminPasswordRoutes.js";
import adminDashboardRoutes from "./features/admin/routes/adminDashboardRoutes.js";

import userProfileRoutes from "./features/profile/routes/userProfileRoutes.js";
import addressRoutes from "./features/address/routes/addressRoutes.js";

import categoryRoutes from "./features/category/routes/categoryRoutes.js";
import productRoutes from "./features/product/routes/productRoutes.js";

import Category from "./features/category/models/Category.js";
import bootstrapInitialAdmin, { createDefaultAdmin } from "./features/admin/utils/bootstrapAdmin.js";

import reviewRoutes from "./features/review/routes/reviewRoutes.js";

import wishlistRoutes from "./features/wishlist/routes/wishlistRoutes.js";

import orderRoutes from "./features/order/routes/orderRoutes.js";
import adminOrderRoutes from "./features/order/routes/adminOrderRoutes.js";

import paymentRoutes from "./features/payment/routes/paymentRoutes.js";

import couponRoutes from "./features/coupon/routes/couponRoutes.js";

import walletRoutes from "./features/wallet/routes/walletRoutes.js";

import referralRoutes from "./features/referral/routes/referralRoutes.js";

import connectDB from "./config/db.js";
import validateEnvironment from "./config/envValidation.js";

import publicProductRoutes from "./features/product/routes/publicProductRoutes.js";

import logger from "./utils/logger.js";
import requestLogger from "./middlewares/requestLogger.js";
import notFoundMiddleware from "./middlewares/notFoundMiddleware.js";
import errorMiddleware from "./middlewares/errorMiddleware.js";
import mongoSanitizeMiddleware from "./middlewares/mongoSanitize.js";

dotenv.config();
validateEnvironment();

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection:", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", {
    error: error.message,
    stack: error.stack,
  });
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

const app = express();

app.set("trust proxy", 1);

const PORT = process.env.PORT || 3001;

connectDB();

// =========================================================
// SECURITY HEADERS & CORS
// =========================================================

app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  next();
});

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5174",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Razorpay webhooks, tests)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS request blocked: Origin not allowed"), false);
    },
    credentials: true,
  })
);

// =========================================================
// REQUEST LOGGING & TRACING
// =========================================================

app.use(requestLogger);

// =========================================================
// BODY PARSER
// =========================================================

app.use(
  express.json({
    limit: "15mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(mongoSanitizeMiddleware);

// =========================================================
// AUTH ROUTES
// =========================================================

app.use(
  "/api/auth",
  authRoutes
);

// =========================================================
// ADMIN ROUTES
// =========================================================

app.use(
  "/api/admin/auth",
  adminAuthRoutes
);

app.use(
  "/api/admin",
  adminPasswordRoutes
);

app.use(
  "/api/admin",
  adminUserRoutes
);

app.use(
  "/api/admin",
  adminProfileRoutes
);

app.use(
  "/api/admin",
  categoryRoutes
);

app.use(
  "/api/admin",
  productRoutes
);

// =========================================================
// ADMIN ORDER ROUTES
// =========================================================

app.use(
  "/api/admin/orders",
  adminOrderRoutes
);

// =========================================================
// ADMIN COUPON ROUTES
// =========================================================

app.use(
  "/api/admin/coupons",
  couponRoutes
);

// =========================================================
// ADMIN DASHBOARD ROUTES
// =========================================================

app.use(
  "/api/admin/dashboard",
  adminDashboardRoutes
);

// =========================================================
// PUBLIC PRODUCT ROUTES
// =========================================================

app.use(
  "/api",
  publicProductRoutes
);

// =========================================================
// USER PROFILE ROUTES
// =========================================================

app.use(
  "/api/user",
  userProfileRoutes
);

// =========================================================
// ADDRESS ROUTES
// =========================================================

app.use(
  "/api/user",
  addressRoutes
);

// =========================================================
// REVIEW ROUTES
// =========================================================

app.use(
  "/api",
  reviewRoutes
);

// =========================================================
// WISHLIST ROUTES
// =========================================================

app.use(
  "/api/user",
  wishlistRoutes
);

// =========================================================
// ORDER ROUTES
// =========================================================

app.use(
  "/api/user/orders",
  orderRoutes
);

// =========================================================
// PAYMENT ROUTES
// =========================================================

app.use(
  "/api/payment",
  paymentRoutes
);

// =========================================================
// WALLET ROUTES
// =========================================================

app.use(
  "/api/user/wallet",
  walletRoutes
);

app.use(
  "/api/wallet",
  walletRoutes
);

// =========================================================
// REFERRAL ROUTES
// =========================================================

app.use(
  "/api/user/referrals",
  referralRoutes
);

// =========================================================
// HEALTH CHECK (PRODUCTION DEPLOYMENT PROBE)
// =========================================================

app.get(
  "/health",
  (req, res) => {
    const isDbConnected = mongoose.connection.readyState === 1;
    const isHealthy = isDbConnected;

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      status: isHealthy ? "healthy" : "degraded",
      message: isHealthy
        ? "GETSUKA backend is running"
        : "Database connection unavailable",
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      database: isDbConnected ? "connected" : "disconnected",
      databaseHost: mongoose.connection?.host || "unknown",
      databaseName: mongoose.connection?.name || "unknown",
    });
  }
);

// =========================================================
// CREATE DEFAULT CATEGORY
// =========================================================

const createDefaultCategory = async () => {
  try {
    const existingCategory =
      await Category.findOne({
        name: "T-Shirts",
      });

    if (!existingCategory) {
      await Category.create({
        name: "T-Shirts",
        isDeleted: false,
      });

      logger.info('Default category "T-Shirts" created successfully');
    } else if (existingCategory.isDeleted) {
      existingCategory.isDeleted = false;

      await existingCategory.save();

      logger.info('Default category "T-Shirts" restored successfully');
    }
  } catch (error) {
    logger.error("Default category creation failed:", { error: error.message });
  }
};

// =========================================================
// INITIAL ADMIN BOOTSTRAP (SECURE ENVIRONMENT-DRIVEN)
// =========================================================
export { bootstrapInitialAdmin, createDefaultAdmin };

// =========================================================
// 404 NOT FOUND & CENTRALIZED ERROR HANDLING
// =========================================================

app.use(notFoundMiddleware);
app.use(errorMiddleware);

// =========================================================
// START SERVER
// =========================================================

const server = app.listen(PORT, async () => {
  logger.info(`GETSUKA backend running on port ${PORT}`);
  await createDefaultCategory();
  await createDefaultAdmin();
});

// =========================================================
// GRACEFUL SHUTDOWN (SIGTERM / SIGINT)
// =========================================================

const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Initiating graceful shutdown...`);

  // Force shutdown if cleanup hangs after 10s
  const forceExitTimeout = setTimeout(() => {
    logger.error("Graceful shutdown timed out. Forcing process exit.");
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  server.close(async () => {
    logger.info("HTTP server closed. Ceasing request acceptance.");
    try {
      await mongoose.connection.close(false);
      logger.info("MongoDB connection closed cleanly.");
      process.exit(0);
    } catch (err) {
      logger.error("Error during MongoDB disconnection:", { error: err.message });
      process.exit(1);
    }
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

export { app, server };
export default app;