import express from "express";

import {
  addAddress,
  getUserAddresses,
  updateAddress,
} from "../controllers/addressController.js";

import userAuthMiddleware from "../../../middlewares/userAuthMiddleware.js";

const router = express.Router();

// ============================================
// GET USER ADDRESSES
// ============================================

router.get(
  "/addresses",
  userAuthMiddleware,
  getUserAddresses
);

// ============================================
// ADD ADDRESS
// ============================================

router.post(
  "/addresses",
  userAuthMiddleware,
  addAddress
);

// ============================================
// UPDATE ADDRESS
// ============================================

router.put(
  "/addresses/:addressId",
  userAuthMiddleware,
  updateAddress
);

export default router;