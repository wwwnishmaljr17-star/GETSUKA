import express from "express";

import {
  addAddress,
  getUserAddresses,
  updateAddress,
  deleteAddress,
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

// ============================================
// DELETE ADDRESS
// ============================================

router.delete(
  "/addresses/:addressId",
  userAuthMiddleware,
  deleteAddress
);

export default router;