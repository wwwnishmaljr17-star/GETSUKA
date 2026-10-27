import express from "express";

import {
  getWallet,
  getWalletTransactions,
} from "../controllers/walletController.js";

import userAuthMiddleware from "../../../middlewares/userAuthMiddleware.js";

const router = express.Router();

// =========================================================
// GET USER WALLET
// =========================================================

router.get(
  "/",
  userAuthMiddleware,
  getWallet
);

// =========================================================
// GET WALLET TRANSACTIONS
// =========================================================

router.get(
  "/transactions",
  userAuthMiddleware,
  getWalletTransactions
);

export default router;