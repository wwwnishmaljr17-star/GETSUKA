import express from "express";

import {
  getMyReferral,
  createReferral,
  applyReferral,
  completeReferral,
  getReferralHistory,
} from "../controllers/referralController.js";

import authMiddleware from "../../../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| USER REFERRAL ROUTES
|--------------------------------------------------------------------------
*/

/*
 * Get current user's referral details
 *
 * GET /api/user/referrals
 */
router.get(
  "/",
  authMiddleware,
  getMyReferral
);

/*
 * Create / get referral link
 *
 * POST /api/user/referrals/create
 */
router.post(
  "/create",
  authMiddleware,
  createReferral
);

/*
 * Apply referral code
 *
 * POST /api/user/referrals/apply
 *
 * This creates the pending referral.
 * It does NOT credit ₹350 immediately.
 */
router.post(
  "/apply",
  authMiddleware,
  applyReferral
);

/*
 * Complete referral and credit ₹350
 *
 * POST /api/user/referrals/complete
 *
 * This should only be called by trusted backend logic
 * after the referral requirement has actually been completed.
 */
router.post(
  "/complete",
  authMiddleware,
  completeReferral
);

/*
 * Referral history
 *
 * GET /api/user/referrals/history
 */
router.get(
  "/history",
  authMiddleware,
  getReferralHistory
);

export default router;