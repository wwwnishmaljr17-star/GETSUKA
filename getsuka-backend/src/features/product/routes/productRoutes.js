import express from "express";

import {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  updateVariantStock,
  deleteProduct,
  toggleProductListing,
  toggleProductTrending,
} from "../controllers/productController.js";

import {
  uploadSingleImage,
  uploadMultipleImages,
  deleteProductImage,
} from "../controllers/productImageController.js";

import adminAuthMiddleware from "../../../middlewares/adminAuthMiddleware.js";
import upload from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

/* =========================================
   IMAGE UPLOAD & MANAGEMENT (CLOUDINARY)
========================================= */

router.post(
  "/products/upload-image",
  adminAuthMiddleware,
  upload.single("image"),
  uploadSingleImage
);

router.post(
  "/products/upload-images",
  adminAuthMiddleware,
  upload.array("images", 6),
  uploadMultipleImages
);

router.delete(
  "/products/images",
  adminAuthMiddleware,
  deleteProductImage
);

router.post(
  "/products/delete-image",
  adminAuthMiddleware,
  deleteProductImage
);

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

/* =========================================
   TOGGLE PRODUCT TRENDING
========================================= */

router.patch(
  "/products/:productId/trending",
  adminAuthMiddleware,
  toggleProductTrending
);

export default router;