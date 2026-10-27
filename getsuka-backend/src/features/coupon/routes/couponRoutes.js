import express from "express";

import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon,
  getPublicAvailableCoupons,
} from "../controllers/couponController.js";

import adminAuthMiddleware from "../../../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// =========================================================
// PUBLIC — CUSTOMER CHECKOUT ENDPOINTS
// =========================================================

// POST /api/admin/coupons/validate
// Customer coupon validation during checkout
router.post(
  "/validate",
  validateCoupon
);

// GET /api/admin/coupons/available
// Customer coupon availability check for checkout modal
router.get(
  "/available",
  getPublicAvailableCoupons
);

// =========================================================
// ADMIN — COUPON MANAGEMENT (PROTECTED)
// =========================================================

// POST /api/admin/coupons
router.post(
  "/",
  adminAuthMiddleware,
  createCoupon
);

// GET /api/admin/coupons
router.get(
  "/",
  adminAuthMiddleware,
  getCoupons
);

// GET /api/admin/coupons/:couponId
router.get(
  "/:couponId",
  adminAuthMiddleware,
  getCouponById
);

// PUT /api/admin/coupons/:couponId
router.put(
  "/:couponId",
  adminAuthMiddleware,
  updateCoupon
);

// PATCH /api/admin/coupons/:couponId/status
router.patch(
  "/:couponId/status",
  adminAuthMiddleware,
  toggleCouponStatus
);

// DELETE /api/admin/coupons/:couponId
router.delete(
  "/:couponId",
  adminAuthMiddleware,
  deleteCoupon
);

export default router;