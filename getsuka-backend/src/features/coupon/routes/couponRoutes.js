import express from "express";

import {
  createCoupon,
  getCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon,
} from "../controllers/couponController.js";

const router = express.Router();

// =========================================================
// USER — COUPON VALIDATION
// =========================================================

// POST /api/coupons/validate

router.post(
  "/validate",
  validateCoupon
);

// =========================================================
// ADMIN — COUPON MANAGEMENT
// =========================================================

// =========================================================
// CREATE COUPON
// =========================================================

// POST /api/admin/coupons

router.post(
  "/",
  createCoupon
);

// =========================================================
// GET ALL COUPONS
// =========================================================

// GET /api/admin/coupons

router.get(
  "/",
  getCoupons
);

// =========================================================
// GET SINGLE COUPON
// =========================================================

// GET /api/admin/coupons/:couponId

router.get(
  "/:couponId",
  getCouponById
);

// =========================================================
// UPDATE COUPON
// =========================================================

// PUT /api/admin/coupons/:couponId

router.put(
  "/:couponId",
  updateCoupon
);

// =========================================================
// TOGGLE COUPON ACTIVE / INACTIVE
// =========================================================

// PATCH /api/admin/coupons/:couponId/status

router.patch(
  "/:couponId/status",
  toggleCouponStatus
);

// =========================================================
// DELETE COUPON
// =========================================================

// DELETE /api/admin/coupons/:couponId

router.delete(
  "/:couponId",
  deleteCoupon
);

export default router;