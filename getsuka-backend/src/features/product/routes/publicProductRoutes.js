import express from "express";

import {
  getPublicProducts,
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
// PUBLIC SINGLE PRODUCT
// =========================================================

router.get(
  "/products/:productId",
  getPublicProductById
);

export default router;