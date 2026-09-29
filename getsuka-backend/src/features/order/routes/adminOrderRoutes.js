import express from "express";

import adminAuthMiddleware from "../../../middlewares/adminAuthMiddleware.js";

import {
  getAdminOrders,
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
// GET ALL ORDERS — ADMIN
// =========================================================

/*
  GET /api/admin/orders
*/

router.get(
  "/",
  adminAuthMiddleware,
  getAdminOrders
);

// =========================================================
// GET SINGLE ORDER — ADMIN
// =========================================================

/*
  GET /api/admin/orders/:orderId
*/

router.get(
  "/:orderId",
  adminAuthMiddleware,
  getAdminOrderById
);

// =========================================================
// UPDATE ORDER STATUS — ADMIN
// =========================================================

/*
  PUT /api/admin/orders/:orderId/status
*/

router.put(
  "/:orderId/status",
  adminAuthMiddleware,
  updateAdminOrderStatus
);

// =========================================================
// APPROVE RETURN REQUEST — ADMIN
// =========================================================

/*
  PUT /api/admin/orders/:orderId/return/approve
*/

router.put(
  "/:orderId/return/approve",
  adminAuthMiddleware,
  approveReturnRequest
);

// =========================================================
// REJECT RETURN REQUEST — ADMIN
// =========================================================

/*
  PUT /api/admin/orders/:orderId/return/reject
*/

router.put(
  "/:orderId/return/reject",
  adminAuthMiddleware,
  rejectReturnRequest
);

// =========================================================
// MARK RETURN COLLECTION PENDING — ADMIN
// =========================================================

/*
  PUT /api/admin/orders/:orderId/return/collection-pending
*/

router.put(
  "/:orderId/return/collection-pending",
  adminAuthMiddleware,
  markReturnCollectionPending
);

// =========================================================
// MARK RETURN COLLECTED — ADMIN
// =========================================================

/*
  PUT /api/admin/orders/:orderId/return/collected
*/

router.put(
  "/:orderId/return/collected",
  adminAuthMiddleware,
  markReturnCollected
);

// =========================================================
// COMPLETE RETURN — ADMIN
// =========================================================

/*
  PUT /api/admin/orders/:orderId/return/complete
*/

router.put(
  "/:orderId/return/complete",
  adminAuthMiddleware,
  completeReturn
);

export default router;