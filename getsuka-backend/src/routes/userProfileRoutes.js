import express from "express";

import {
  getUserProfile,
  updateUserProfile,
  sendEmailChangeOtp,
  verifyEmailChangeOtp,
  changePassword,
} from "../controllers/userProfileController.js";

import userAuthMiddleware from "../middlewares/userAuthMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

// ============================================
// GET USER PROFILE
// ============================================

router.get(
  "/profile",
  userAuthMiddleware,
  getUserProfile
);

// ============================================
// SEND EMAIL CHANGE OTP
// ============================================

router.post(
  "/profile/email/send-otp",
  userAuthMiddleware,
  sendEmailChangeOtp
);

// ============================================
// VERIFY EMAIL CHANGE OTP
// ============================================

router.post(
  "/profile/email/verify-otp",
  userAuthMiddleware,
  verifyEmailChangeOtp
);

// ============================================
// CHANGE PASSWORD
// ============================================

router.post(
  "/profile/change-password",
  userAuthMiddleware,
  changePassword
);

// ============================================
// UPDATE USER PROFILE
// ============================================

router.put(
  "/profile",
  userAuthMiddleware,
  upload.single("profileImage"),
  updateUserProfile
);

export default router;