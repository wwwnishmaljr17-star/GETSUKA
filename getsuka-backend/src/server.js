import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminProfileRoutes from "./routes/adminProfileRoutes.js";
import adminPasswordRoutes from "./routes/adminPasswordRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import addressRoutes from "./routes/addressRoutes.js";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 3001;

// ============================================
// CONNECT TO MONGODB
// ============================================

import connectDB from "./config/db.js";

connectDB();

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());

app.use(express.json());

// ============================================
// ADMIN PASSWORD ROUTES
// ============================================

app.use(
  "/api/admin",
  adminPasswordRoutes
);

// ============================================
// USER AUTHENTICATION ROUTES
// ============================================

app.use(
  "/api/auth",
  authRoutes
);

// ============================================
// ADMIN AUTHENTICATION ROUTES
// ============================================

app.use(
  "/api/admin/auth",
  adminAuthRoutes
);

// ============================================
// ADMIN CUSTOMER MANAGEMENT ROUTES
// ============================================

app.use(
  "/api/admin",
  adminUserRoutes
);

// ============================================
// ADMIN PROFILE ROUTES
// ============================================

app.use(
  "/api/admin",
  adminProfileRoutes
);

// ============================================
// USER PROFILE ROUTES
// ============================================

app.use(
  "/api/user",
  userProfileRoutes
);

// ============================================
// USER ADDRESS ROUTES
// ============================================

app.use(
  "/api/user",
  addressRoutes
);

// ============================================
// HEALTH CHECK
// ============================================

app.get(
  "/health",
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        "GETSUKA backend is running",
    });
  }
);

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(
    `GETSUKA backend running on port ${PORT}`
  );
});