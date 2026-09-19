import express from "express";

import {
  changeAdminPassword,
} from "../controllers/adminPasswordController.js";

import adminAuthMiddleware from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();


/* =========================================
   CHANGE ADMIN PASSWORD
========================================= */

router.patch(
  "/profile/change-password",
  adminAuthMiddleware,
  changeAdminPassword
);


export default router;