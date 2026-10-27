import express from "express";

import adminAuthMiddleware from "../../../middlewares/adminAuthMiddleware.js";

import {
  getAdminOrders,
  getAdminReturns,
  getAdminOrderById,
  updateAdminOrderStatus,
  approveReturnRequest,
  rejectReturnRequest,
  markReturnCollectionPending,
  markReturnCollected,
  completeReturn,
} from "../controllers/orderController.js";

const router = express.Router();

// =========================================================
// ADMIN — GET ALL ORDERS
// =========================================================

router.get(
  "/",
  adminAuthMiddleware,
  getAdminOrders
);

// =========================================================
// ADMIN — GET ALL RETURN REQUESTS
// IMPORTANT: This MUST come before /:orderId
// =========================================================

router.get(
  "/returns",
  adminAuthMiddleware,
  getAdminReturns
);

// =========================================================
// ADMIN — GET SINGLE ORDER
// =========================================================

router.get(
  "/:orderId",
  adminAuthMiddleware,
  getAdminOrderById
);

// =========================================================
// ADMIN — UPDATE ORDER STATUS
// =========================================================

router.put(
  "/:orderId/status",
  adminAuthMiddleware,
  updateAdminOrderStatus
);

// =========================================================
// ADMIN — APPROVE RETURN
// =========================================================

router.put(
  "/:orderId/return/approve",
  adminAuthMiddleware,
  approveReturnRequest
);

// =========================================================
// ADMIN — REJECT RETURN
// =========================================================

router.put(
  "/:orderId/return/reject",
  adminAuthMiddleware,
  rejectReturnRequest
);

// =========================================================
// ADMIN — MARK RETURN COLLECTION PENDING
// =========================================================

router.put(
  "/:orderId/return/collection-pending",
  adminAuthMiddleware,
  markReturnCollectionPending
);

// =========================================================
// ADMIN — MARK RETURN COLLECTED
// =========================================================

router.put(
  "/:orderId/return/collected",
  adminAuthMiddleware,
  markReturnCollected
);

// =========================================================
// ADMIN — COMPLETE RETURN
// =========================================================

router.put(
  "/:orderId/return/complete",
  adminAuthMiddleware,
  completeReturn
);

export default router;