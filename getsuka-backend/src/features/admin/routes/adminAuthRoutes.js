import express from "express";

import {
  adminLogin,
  adminForgotPassword,
  adminVerifyOtp,
  adminResetPassword,
} from "../controllers/adminAuthController.js";
const router = express.Router();

router.post("/login", adminLogin);

router.post("/forgot-password", adminForgotPassword);

router.post(
  "/verify-otp",
  adminVerifyOtp
);

router.post(
  "/reset-password",
  adminResetPassword
);
export default router;