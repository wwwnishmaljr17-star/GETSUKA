import express from "express";

import userAuthMiddleware from "../../../middlewares/userAuthMiddleware.js";

import {
  createOrder,
  getUserOrders,
  getUserOrderById,
  cancelUserOrder,
  cancelUserOrderItem,
  returnUserOrder,
} from "../controllers/orderController.js";

const router = express.Router();

// =========================================================
// CREATE ORDER
// =========================================================

/*
  POST /api/user/orders
*/

router.post(
  "/",
  userAuthMiddleware,
  createOrder
);

// =========================================================
// GET USER ORDERS
// =========================================================

/*
  GET /api/user/orders
*/

router.get(
  "/",
  userAuthMiddleware,
  getUserOrders
);

// =========================================================
// CANCEL SINGLE ORDER ITEM
// =========================================================

/*
  POST /api/user/orders/:orderId/items/:itemId/cancel
*/

router.post(
  "/:orderId/items/:itemId/cancel",
  userAuthMiddleware,
  cancelUserOrderItem
);

// =========================================================
// CANCEL USER ORDER
// =========================================================

/*
  POST /api/user/orders/:orderId/cancel
*/

router.post(
  "/:orderId/cancel",
  userAuthMiddleware,
  cancelUserOrder
);

// =========================================================
// RETURN USER ORDER
// =========================================================

/*
  POST /api/user/orders/:orderId/return
*/

router.post(
  "/:orderId/return",
  userAuthMiddleware,
  returnUserOrder
);

// =========================================================
// GET SINGLE USER ORDER
// =========================================================

/*
  GET /api/user/orders/:orderId
*/

router.get(
  "/:orderId",
  userAuthMiddleware,
  getUserOrderById
);

export default router;