import express from "express";

import {
  addCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

import adminAuthMiddleware from "../../../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// ============================================
// GET CATEGORIES
// PUBLIC
// SEARCH + PAGINATION + DESCENDING ORDER
// ============================================

router.get(
  "/categories",
  getCategories
);

// ============================================
// GET SINGLE CATEGORY
// PUBLIC
// ============================================

router.get(
  "/categories/:categoryId",
  getCategoryById
);

// ============================================
// ADD CATEGORY
// ADMIN ONLY
// ============================================

router.post(
  "/categories",
  adminAuthMiddleware,
  addCategory
);

// ============================================
// EDIT CATEGORY
// ADMIN ONLY
// ============================================

router.put(
  "/categories/:categoryId",
  adminAuthMiddleware,
  updateCategory
);

// ============================================
// SOFT DELETE CATEGORY
// ADMIN ONLY
// ============================================

router.delete(
  "/categories/:categoryId",
  adminAuthMiddleware,
  deleteCategory
);

export default router;