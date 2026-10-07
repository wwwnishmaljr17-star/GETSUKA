import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./features/auth/routes/authRoutes.js";

import adminAuthRoutes from "./features/admin/routes/adminAuthRoutes.js";
import adminUserRoutes from "./features/admin/routes/adminUserRoutes.js";
import adminProfileRoutes from "./features/admin/routes/adminProfileRoutes.js";
import adminPasswordRoutes from "./features/admin/routes/adminPasswordRoutes.js";

import userProfileRoutes from "./features/profile/routes/userProfileRoutes.js";
import addressRoutes from "./features/address/routes/addressRoutes.js";

import categoryRoutes from "./features/category/routes/categoryRoutes.js";
import productRoutes from "./features/product/routes/productRoutes.js";

import Category from "./features/category/models/Category.js";

import reviewRoutes from "./features/review/routes/reviewRoutes.js";

import wishlistRoutes from "./features/wishlist/routes/wishlistRoutes.js";

import orderRoutes from "./features/order/routes/orderRoutes.js";
import adminOrderRoutes from "./features/order/routes/adminOrderRoutes.js";

import paymentRoutes from "./features/payment/routes/paymentRoutes.js";

import couponRoutes from "./features/coupon/routes/couponRoutes.js";

import walletRoutes from "./features/wallet/routes/walletRoutes.js";

import referralRoutes from "./features/referral/routes/referralRoutes.js";

import connectDB from "./config/db.js";

import publicProductRoutes from "./features/product/routes/publicProductRoutes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3001;

connectDB();

// =========================================================
// CORS
// =========================================================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// =========================================================
// BODY PARSER
// =========================================================

app.use(
  express.json({
    limit: "15mb",
  })
);

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

// =========================================================
// REFERRAL ROUTES
// =========================================================

app.use(
  "/api/user/referrals",
  referralRoutes
);

// =========================================================
// HEALTH CHECK
// =========================================================

app.get(
  "/health",
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "GETSUKA backend is running",
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

      console.log(
        'Default category "T-Shirts" created successfully'
      );
    } else if (existingCategory.isDeleted) {
      existingCategory.isDeleted = false;

      await existingCategory.save();

      console.log(
        'Default category "T-Shirts" restored successfully'
      );
    } else {
      console.log(
        ""
      );
    }
  } catch (error) {
    console.error(
      "Default category creation failed:",
      error.message
    );
  }
};

// =========================================================
// START SERVER
// =========================================================

app.listen(
  PORT,
  async () => {
    console.log(
      `GETSUKA backend running on port ${PORT}`
    );

    await createDefaultCategory();
  }
);