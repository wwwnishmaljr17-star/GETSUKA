import express from "express";

import {
  registerUser,
  verifyOtp,
  resendOtp,
  loginUser,
  forgotPassword,
  resetPassword,
  googleLogin,
} from "../controllers/authController.js";

import {
  loginLimiter,
  registerLimiter,
  otpVerifyLimiter,
  otpResendLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from "../../../middlewares/authRateLimiter.js";

const router = express.Router();

// ==============================
// REGISTER
// ==============================

router.post(
  "/register",
  registerLimiter,
  registerUser
);

// ==============================
// EMAIL VERIFICATION
// ==============================

router.post(
  "/verify-otp",
  otpVerifyLimiter,
  verifyOtp
);

router.post(
  "/resend-otp",
  otpResendLimiter,
  resendOtp
);

// ==============================
// LOGIN
// ==============================

router.post(
  "/login",
  loginLimiter,
  loginUser
);

// ==============================
// FORGOT PASSWORD
// ==============================

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  forgotPassword
);

// ==============================
// RESET PASSWORD
// ==============================

router.post(
  "/reset-password",
  resetPasswordLimiter,
  resetPassword
);

// ==============================
// GOOGLE LOGIN
// ==============================

router.post("/google", loginLimiter, googleLogin);

export default router;