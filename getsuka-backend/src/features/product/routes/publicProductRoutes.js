import express from "express";

import {
  getPublicProducts,
  getPublicProductsBulk,
} from "../controllers/publicProductController.js";

import {
  getPublicProductById,
} from "../controllers/publicProductDetailsController.js";

const router = express.Router();

// =========================================================
// PUBLIC PRODUCT LISTING
// =========================================================

router.get(
  "/products",
  getPublicProducts
);

// =========================================================
// PUBLIC BULK PRODUCTS (CART & CHECKOUT STOCK VALIDATION)
// =========================================================

router.post(
  "/products/bulk",
  getPublicProductsBulk
);

// =========================================================
// PUBLIC SINGLE PRODUCT
// =========================================================

router.get(
  "/products/:productId",
  getPublicProductById
);

export default router;