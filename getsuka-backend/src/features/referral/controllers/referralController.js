import mongoose from "mongoose";

import Referral from "../models/referral.js";
import User from "../../auth/models/User.js";

import {
  creditWallet,
} from "../../wallet/controllers/walletController.js";

// =========================================================
// REFERRAL CONSTANTS
// =========================================================

const MAX_REFERRALS = 5;
const REFERRAL_REWARD = 350;

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

// =========================================================
// GENERATE UNIQUE REFERRAL CODE
// =========================================================

const generateReferralCode = (userId) => {
  const idPart = userId
    .toString()
    .slice(-6)
    .toUpperCase();

  const randomPart = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

  return `GETSUKA-${idPart}-${randomPart}`;
};

// =========================================================
// GET MY REFERRAL DETAILS
// =========================================================
//
// GET /api/user/referrals
//
// =========================================================

export const getMyReferral = async (req, res) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?.id ||
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // =======================================================
    // CREATE REFERRAL CODE IF MISSING
    // =======================================================

    let referralCode = user.referralCode;

    if (!referralCode) {
      let generatedCode =
        generateReferralCode(user._id);

      let existingCode =
        await User.findOne({
          referralCode: generatedCode,
        });

      while (existingCode) {
        generatedCode =
          generateReferralCode(user._id);

        existingCode =
          await User.findOne({
            referralCode: generatedCode,
          });
      }

      user.referralCode = generatedCode;

      await user.save();

      referralCode = generatedCode;
    }

    // =======================================================
    // COMPLETED REFERRALS
    // =======================================================

    const completedReferrals =
      await Referral.countDocuments({
        referrer: userId,
        status: "completed",
        rewardCredited: true,
      });

    // =======================================================
    // PENDING REFERRALS
    // =======================================================

    const pendingReferrals =
      await Referral.countDocuments({
        referrer: userId,
        status: "pending",
      });

    // =======================================================
    // REMAINING REFERRALS
    // =======================================================

    const remainingReferrals = Math.max(
      MAX_REFERRALS - completedReferrals,
      0
    );

    // =======================================================
    // TOTAL EARNED
    // =======================================================

    const totalEarned =
      completedReferrals *
      REFERRAL_REWARD;

    // =======================================================
    // MAXIMUM EARNING
    // =======================================================

    const maximumEarning =
      MAX_REFERRALS *
      REFERRAL_REWARD;

    // =======================================================
    // REFERRAL LINK
    // =======================================================
    //
    // IMPORTANT:
    // Frontend registration route is /register
    //
    // =======================================================

    const referralLink =
      `${FRONTEND_URL}/register?ref=${encodeURIComponent(
        referralCode
      )}`;

    return res.status(200).json({
      success: true,

      data: {
        referralCode,

        referralLink,

        maxReferrals:
          MAX_REFERRALS,

        completedReferrals,

        pendingReferrals,

        remainingReferrals,

        rewardPerReferral:
          REFERRAL_REWARD,

        totalEarned,

        maximumEarning,

        referralLimitReached:
          completedReferrals >=
          MAX_REFERRALS,
      },
    });
  } catch (error) {
    console.error(
      "Get Referral Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load referral details",
    });
  }
};

// =========================================================
// CREATE / GET REFERRAL LINK
// =========================================================
//
// POST /api/user/referrals/create
//
// =========================================================

export const createReferral = async (
  req,
  res
) => {
  try {
    const userId =
      req.user?.userId ||
      req.user?.id ||
      req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // =======================================================
    // CREATE CODE IF MISSING
    // =======================================================

    let referralCode = user.referralCode;

    if (!referralCode) {
      let generatedCode =
        generateReferralCode(user._id);

      let existingCode =
        await User.findOne({
          referralCode: generatedCode,
        });

      while (existingCode) {
        generatedCode =
          generateReferralCode(user._id);

        existingCode =
          await User.findOne({
            referralCode: generatedCode,
          });
      }

      user.referralCode = generatedCode;

      await user.save();

      referralCode = generatedCode;
    }

    // =======================================================
    // COUNT COMPLETED REFERRALS
    // =======================================================

    const completedReferrals =
      await Referral.countDocuments({
        referrer: userId,
        status: "completed",
        rewardCredited: true,
      });

    // =======================================================
    // LIMIT REACHED
    // =======================================================

    if (
      completedReferrals >=
      MAX_REFERRALS
    ) {
      return res.status(200).json({
        success: true,

        limitReached: true,

        message:
          "You have reached the maximum limit of 5 successful referrals.",

        data: {
          referralCode,

          referralLink:
            `${FRONTEND_URL}/register?ref=${encodeURIComponent(
              referralCode
            )}`,

          completedReferrals,

          remainingReferrals: 0,

          rewardPerReferral:
            REFERRAL_REWARD,

          totalEarned:
            MAX_REFERRALS *
            REFERRAL_REWARD,

          maximumEarning:
            MAX_REFERRALS *
            REFERRAL_REWARD,
        },
      });
    }

    // =======================================================
    // RETURN REFERRAL DETAILS
    // =======================================================

    return res.status(200).json({
      success: true,

      limitReached: false,

      message:
        "Referral link ready.",

      data: {
        referralCode,

        referralLink:
          `${FRONTEND_URL}/register?ref=${encodeURIComponent(
            referralCode
          )}`,

        completedReferrals,

        remainingReferrals:
          MAX_REFERRALS -
          completedReferrals,

        rewardPerReferral:
          REFERRAL_REWARD,

        totalEarned:
          completedReferrals *
          REFERRAL_REWARD,

        maximumEarning:
          MAX_REFERRALS *
          REFERRAL_REWARD,
      },
    });
  } catch (error) {
    console.error(
      "Create Referral Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create referral link",
    });
  }
};

// =========================================================
// APPLY REFERRAL CODE
// =========================================================
//
// POST /api/user/referrals/apply
//
// Creates a PENDING referral.
// No ₹350 is credited here.
//
// =========================================================

export const applyReferral = async (
  req,
  res
) => {
  try {
    const {
      referralCode,
      referredUserId,
    } = req.body;

    // =======================================================
    // VALIDATION
    // =======================================================

    if (
      !referralCode ||
      !referredUserId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Referral code and referred user ID are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        referredUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid referred user ID.",
      });
    }

    // =======================================================
    // FIND REFERRED USER
    // =======================================================

    const referredUser =
      await User.findById(
        referredUserId
      );

    if (!referredUser) {
      return res.status(404).json({
        success: false,
        message:
          "Referred user not found.",
      });
    }

    // =======================================================
    // FIND REFERRER
    // =======================================================

    const cleanReferralCode =
      referralCode
        .trim()
        .toUpperCase();

    const referrer =
      await User.findOne({
        referralCode:
          cleanReferralCode,
      });

    if (!referrer) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid referral code.",
      });
    }

    // =======================================================
    // SELF REFERRAL PROTECTION
    // =======================================================

    if (
      referrer._id.toString() ===
      referredUser._id.toString()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot use your own referral code.",
      });
    }

    // =======================================================
    // CHECK MAXIMUM REFERRAL LIMIT
    // =======================================================

    const completedReferrals =
      await Referral.countDocuments({
        referrer: referrer._id,
        status: "completed",
        rewardCredited: true,
      });

    if (
      completedReferrals >=
      MAX_REFERRALS
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This referral account has already reached the maximum limit of 5 referrals.",
      });
    }

    // =======================================================
    // PREVENT DUPLICATE REFERRAL
    // =======================================================

    const existingReferral =
      await Referral.findOne({
        referredUser:
          referredUser._id,
      });

    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message:
          "This user has already used a referral.",
      });
    }

    // =======================================================
    // CREATE PENDING REFERRAL
    // =======================================================

    const referralLink =
      `${FRONTEND_URL}/register?ref=${encodeURIComponent(
        cleanReferralCode
      )}`;

    const referral =
      await Referral.create({
        referrer:
          referrer._id,

        referredUser:
          referredUser._id,

        referralCode:
          cleanReferralCode,

        referralLink,

        status: "pending",

        rewardAmount:
          REFERRAL_REWARD,

        rewardCredited: false,
      });

    return res.status(201).json({
      success: true,

      message:
        "Referral applied successfully. The reward will be credited after the referral requirement is completed.",

      data: {
        referral,
      },
    });
  } catch (error) {
    console.error(
      "Apply Referral Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to apply referral.",
    });
  }
};

// =========================================================
// COMPLETE REFERRAL
// =========================================================
//
// POST /api/user/referrals/complete
//
// Credits ₹350 to the referrer's wallet.
//
// NOTE:
// This function should eventually be triggered by trusted
// backend logic after the referral requirement is fulfilled.
// It should NOT be exposed as a normal user reward button.
//
// =========================================================

export const completeReferral = async (
  req,
  res
) => {
  try {
    const {
      referredUserId,
    } = req.body;

    if (!referredUserId) {
      return res.status(400).json({
        success: false,
        message:
          "Referred user ID is required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        referredUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid referred user ID.",
      });
    }

    // =======================================================
    // FIND PENDING REFERRAL
    // =======================================================

    const referral =
      await Referral.findOne({
        referredUser:
          referredUserId,

        status: "pending",

        rewardCredited: false,
      });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message:
          "Pending referral not found.",
      });
    }

    // =======================================================
    // CHECK MAXIMUM LIMIT AGAIN
    // =======================================================

    const completedReferrals =
      await Referral.countDocuments({
        referrer:
          referral.referrer,

        status: "completed",

        rewardCredited: true,
      });

    if (
      completedReferrals >=
      MAX_REFERRALS
    ) {
      referral.status = "expired";

      await referral.save();

      return res.status(400).json({
        success: false,
        message:
          "The referrer has already reached the maximum limit of 5 referrals.",
      });
    }

    // =======================================================
    // FIND REFERRER
    // =======================================================

    const referrer =
      await User.findById(
        referral.referrer
      );

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message:
          "Referrer account not found.",
      });
    }

    // =======================================================
    // CREDIT ₹350
    // =======================================================

    const rewardAmount =
      REFERRAL_REWARD;

    const walletResult =
      await creditWallet({
        userId:
          referral.referrer,

        amount:
          rewardAmount,

        reason:
          "referral_reward",

        description:
          "Referral reward for referring a new GETSUKA user",
      });

    // =======================================================
    // MARK REFERRAL COMPLETED
    // =======================================================

    referral.status =
      "completed";

    referral.rewardCredited =
      true;

    referral.rewardAmount =
      rewardAmount;

    referral.rewardCreditedAt =
      new Date();

    referral.completedAt =
      new Date();

    await referral.save();

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(200).json({
      success: true,

      message:
        `₹${rewardAmount} referral reward credited successfully.`,

      data: {
        rewardAmount,

        totalCompletedReferrals:
          completedReferrals + 1,

        remainingReferrals:
          Math.max(
            MAX_REFERRALS -
              (completedReferrals + 1),
            0
          ),

        maximumEarning:
          MAX_REFERRALS *
          REFERRAL_REWARD,

        walletBalance:
          walletResult
            ?.wallet
            ?.balance ?? null,
      },
    });
  } catch (error) {
    console.error(
      "Complete Referral Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to complete referral.",
    });
  }
};

// =========================================================
// GET REFERRAL HISTORY
// =========================================================
//
// GET /api/user/referrals/history
//
// =========================================================

export const getReferralHistory =
  async (req, res) => {
    try {
      const userId =
        req.user?.userId ||
        req.user?.id ||
        req.user?._id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      // =====================================================
      // GET REFERRALS
      // =====================================================

      const referrals =
        await Referral.find({
          referrer: userId,
        })
          .populate(
            "referredUser",
            "fullName email profileImage"
          )
          .sort({
            createdAt: -1,
          });

      // =====================================================
      // COMPLETED COUNT
      // =====================================================

      const completedReferrals =
        referrals.filter(
          (referral) =>
            referral.status ===
              "completed" &&
            referral.rewardCredited ===
              true
        ).length;

      // =====================================================
      // PENDING COUNT
      // =====================================================

      const pendingReferrals =
        referrals.filter(
          (referral) =>
            referral.status ===
            "pending"
        ).length;

      // =====================================================
      // TOTAL EARNED
      // =====================================================

      const totalEarned =
        completedReferrals *
        REFERRAL_REWARD;

      // =====================================================
      // REMAINING
      // =====================================================

      const remainingReferrals =
        Math.max(
          MAX_REFERRALS -
            completedReferrals,
          0
        );

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,

        data: {
          referrals,

          completedReferrals,

          pendingReferrals,

          remainingReferrals,

          totalEarned,

          maximumEarning:
            MAX_REFERRALS *
            REFERRAL_REWARD,

          maxReferrals:
            MAX_REFERRALS,

          rewardPerReferral:
            REFERRAL_REWARD,
        },
      });
    } catch (error) {
      console.error(
        "Get Referral History Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to load referral history.",
      });
    }
  };