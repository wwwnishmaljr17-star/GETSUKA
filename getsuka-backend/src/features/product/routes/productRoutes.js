import express from "express";

import {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateVariantStock,
  deleteProduct,
  toggleProductListing,
} from "../controllers/productController.js";

import adminAuthMiddleware from "../../../middlewares/adminAuthMiddleware.js";

const router = express.Router();

/* =========================================
   GET PRODUCTS

   SEARCH + PAGINATION + SORTING + FILTERS
========================================= */

router.get(
  "/products",
  adminAuthMiddleware,
  getProducts
);

/* =========================================
   GET SINGLE PRODUCT
========================================= */

router.get(
  "/products/:productId",
  adminAuthMiddleware,
  getProductById
);

/* =========================================
   ADD PRODUCT
========================================= */

router.post(
  "/products",
  adminAuthMiddleware,
  addProduct
);

/* =========================================
   UPDATE PRODUCT
========================================= */

router.put(
  "/products/:productId",
  adminAuthMiddleware,
  updateProduct
);

/* =========================================
   UPDATE VARIANT STOCK
========================================= */

router.patch(
  "/products/:productId/variants/:variantId/stock",
  adminAuthMiddleware,
  updateVariantStock
);

/* =========================================
   SOFT DELETE PRODUCT
========================================= */

router.delete(
  "/products/:productId",
  adminAuthMiddleware,
  deleteProduct
);

/* =========================================
   LIST / UNLIST PRODUCT
========================================= */

router.patch(
  "/products/:productId/listing",
  adminAuthMiddleware,
  toggleProductListing
);

export default router;