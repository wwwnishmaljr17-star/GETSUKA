import express from "express";

import {
  getUsers,
  getUserById,
  blockUser,
  unblockUser,
  deleteUser,
} from "../controllers/adminUserController.js";

import adminAuthMiddleware from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

/* =========================================
   CUSTOMER MANAGEMENT
========================================= */

// Get all users
router.get(
  "/users",
  adminAuthMiddleware,
  getUsers
);

// Get single user
router.get(
  "/users/:id",
  adminAuthMiddleware,
  getUserById
);

// Block user
router.patch(
  "/users/:id/block",
  adminAuthMiddleware,
  blockUser
);

// Unblock user
router.patch(
  "/users/:id/unblock",
  adminAuthMiddleware,
  unblockUser
);

// Delete user
router.delete(
  "/users/:id",
  adminAuthMiddleware,
  deleteUser
);

export default router;