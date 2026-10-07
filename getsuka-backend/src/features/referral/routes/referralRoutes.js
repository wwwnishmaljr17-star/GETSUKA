import express from "express";

import userAuthMiddleware from "../../../middlewares/userAuthMiddleware.js";

import {
  getMyReferral,
  createReferral,
  applyReferral,
  getReferralHistory,
} from "../controllers/referralController.js";

const router = express.Router();

// =========================================================
// REFERRAL ROUTES
// =========================================================
//
// Base URL:
// /api/user/referrals
//
// All routes are protected using the same authentication
// middleware used by the user order routes.
//
// =========================================================


// =========================================================
// GET MY REFERRAL INFORMATION
// =========================================================
//
// GET /api/user/referrals
//
// Returns:
// - Referral code
// - Referral link
// - Completed referrals
// - Pending referrals
// - Remaining referral slots
// - Reward per referral
// - Total earned
// - Maximum earning
//
// =========================================================

router.get(
  "/",
  userAuthMiddleware,
  getMyReferral
);


// =========================================================
// CREATE / GET REFERRAL LINK
// =========================================================
//
// POST /api/user/referrals/create
//
// Creates the user's referral code if it does not already
// exist and returns the referral link.
//
// =========================================================

router.post(
  "/create",
  userAuthMiddleware,
  createReferral
);


// =========================================================
// APPLY REFERRAL CODE
// =========================================================
//
// POST /api/user/referrals/apply
//
// Creates a pending referral.
//
// No ₹350 reward is credited here.
//
// =========================================================

router.post(
  "/apply",
  userAuthMiddleware,
  applyReferral
);


// =========================================================
// GET REFERRAL HISTORY
// =========================================================
//
// GET /api/user/referrals/history
//
// Returns all referrals made by the logged-in user.
//
// =========================================================

router.get(
  "/history",
  userAuthMiddleware,
  getReferralHistory
);


// =========================================================
// NOTE
// =========================================================
//
// completeReferral is intentionally NOT exposed as a public
// user route.
//
// The completeReferral controller credits ₹350 to the
// referrer's wallet. It should be called from trusted backend
// logic only after the actual referral requirement is
// completed.
//
// Example future flow:
//
// New user signs up with referral
//              ↓
// Referral becomes PENDING
//              ↓
// Required referral condition completed
//              ↓
// Backend calls completeReferral logic
//              ↓
// ₹350 credited to referrer's wallet
//              ↓
// Referral becomes COMPLETED
//
// =========================================================


// =========================================================
// EXPORT ROUTER
// =========================================================

export default router;