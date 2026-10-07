import express from "express";

import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createWalletTopupOrder,
  verifyWalletTopupPayment,
} from "../controllers/paymentController.js";

import userAuthMiddleware from "../../../middlewares/userAuthMiddleware.js";

const router = express.Router();

// =========================================================
// CREATE RAZORPAY ORDER
// =========================================================

router.post(
  "/create-order",
  createRazorpayOrder
);

// =========================================================
// VERIFY RAZORPAY PAYMENT
// =========================================================

router.post(
  "/verify-payment",
  verifyRazorpayPayment
);

// =========================================================
// CREATE WALLET TOP-UP ORDER
// =========================================================

router.post(
  "/wallet/topup/create-order",
  userAuthMiddleware,
  createWalletTopupOrder
);

// =========================================================
// VERIFY WALLET TOP-UP PAYMENT
// =========================================================

router.post(
  "/wallet/topup/verify-payment",
  userAuthMiddleware,
  verifyWalletTopupPayment
);

export default router;