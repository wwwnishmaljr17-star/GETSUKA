import express from "express";

import {
  getAdminProfile,
  updateAdminProfile,
} from "../controllers/adminProfileController.js";

import adminAuthMiddleware from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

/* =========================================
   ADMIN PROFILE
========================================= */

router.get(
  "/profile",
  adminAuthMiddleware,
  getAdminProfile
);

router.patch(
  "/profile",
  adminAuthMiddleware,
  updateAdminProfile
);

export default router;