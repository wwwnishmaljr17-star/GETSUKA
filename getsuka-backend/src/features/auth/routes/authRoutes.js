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

const router = express.Router();


// ==============================
// REGISTER
// ==============================

router.post(
  "/register",
  registerUser
);


// ==============================
// EMAIL VERIFICATION
// ==============================

router.post(
  "/verify-otp",
  verifyOtp
);

router.post(
  "/resend-otp",
  resendOtp
);


// ==============================
// LOGIN
// ==============================

router.post(
  "/login",
  loginUser
);


// ==============================
// FORGOT PASSWORD
// ==============================

router.post(
  "/forgot-password",
  forgotPassword
);


// ==============================
// RESET PASSWORD
// ==============================

router.post(
  "/reset-password",
  resetPassword
);

// googlre login

router.post("/google", googleLogin);

export default router;