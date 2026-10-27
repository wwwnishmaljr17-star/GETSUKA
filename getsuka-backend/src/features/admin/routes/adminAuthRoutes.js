import express from "express";

import {
  adminLogin,
  adminForgotPassword,
  adminVerifyOtp,
  adminResetPassword,
} from "../controllers/adminAuthController.js";

import {
  loginLimiter,
  forgotPasswordLimiter,
  otpVerifyLimiter,
  resetPasswordLimiter,
} from "../../../middlewares/authRateLimiter.js";

const router = express.Router();

router.post("/login", loginLimiter, adminLogin);

router.post("/forgot-password", forgotPasswordLimiter, adminForgotPassword);

router.post(
  "/verify-otp",
  otpVerifyLimiter,
  adminVerifyOtp
);

router.post(
  "/reset-password",
  resetPasswordLimiter,
  adminResetPassword
);

export default router;