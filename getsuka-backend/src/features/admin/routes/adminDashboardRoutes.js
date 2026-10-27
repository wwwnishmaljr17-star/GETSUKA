import express from "express";
import adminAuthMiddleware from "../../../middlewares/adminAuthMiddleware.js";
import { getAdminDashboardData } from "../controllers/adminDashboardController.js";

const router = express.Router();

// =========================================================
// GET ADMIN DASHBOARD DATA
// GET /api/admin/dashboard
// =========================================================

router.get(
  "/",
  adminAuthMiddleware,
  getAdminDashboardData
);

export default router;
