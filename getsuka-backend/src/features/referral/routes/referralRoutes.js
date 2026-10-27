import express from "express";

import userAuthMiddleware from "../../../middlewares/userAuthMiddleware.js";

import {
  getMyReferral,
  createReferral,
  applyReferral,
  getReferralHistory,
  completeReferral,
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
// COMPLETE REFERRAL
// =========================================================
//
// POST /api/user/referrals/complete
//
// Protected: Restricted to admin / authorized internal callers.
// Normal users are rejected with 403 Forbidden.
// Requires verified referral relationship and completed order requirements.
//
// =========================================================

router.post(
  "/complete",
  userAuthMiddleware,
  completeReferral
);


// =========================================================
// EXPORT ROUTER
// =========================================================

export default router;