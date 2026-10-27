import mongoose from "mongoose";

import Referral from "../models/referral.js";
import User from "../../auth/models/User.js";
import Order from "../../order/models/Order.js";

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

// =========================================================
// ATTRIBUTE REFERRAL (CORE REUSABLE SERVICE)
// =========================================================

export const attributeReferral = async ({
  referralCode,
  referredUserId,
  referredEmail,
}) => {
  if (!referralCode || !referredUserId) {
    return {
      success: false,
      statusCode: 400,
      message: "Referral code and referred user ID are required.",
    };
  }

  const cleanReferralCode = referralCode.trim().toUpperCase();

  const referrer = await User.findOne({
    referralCode: cleanReferralCode,
  });

  if (!referrer) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid referral code.",
    };
  }

  // Self-referral protection
  if (
    referrer._id.toString() === referredUserId.toString() ||
    (referredEmail && referrer.email?.toLowerCase() === referredEmail.toLowerCase())
  ) {
    return {
      success: false,
      statusCode: 400,
      message: "You cannot use your own referral code.",
    };
  }

  // Maximum limit protection
  const completedReferrals = await Referral.countDocuments({
    referrer: referrer._id,
    status: "completed",
    rewardCredited: true,
  });

  if (completedReferrals >= MAX_REFERRALS) {
    return {
      success: false,
      statusCode: 400,
      message: `This referral account has already reached the maximum limit of ${MAX_REFERRALS} referrals.`,
    };
  }

  // Prevent duplicate referral attribution
  const existingReferral = await Referral.findOne({
    referredUser: referredUserId,
  });

  if (existingReferral) {
    return {
      success: false,
      statusCode: 400,
      message: "This user has already used a referral.",
    };
  }

  const referralLink = `${FRONTEND_URL}/register?ref=${encodeURIComponent(
    cleanReferralCode
  )}`;

  const referral = await Referral.create({
    referrer: referrer._id,
    referredUser: referredUserId,
    referralCode: cleanReferralCode,
    referralLink,
    status: "pending",
    rewardAmount: REFERRAL_REWARD,
    rewardCredited: false,
  });

  return {
    success: true,
    statusCode: 201,
    data: {
      referral,
    },
  };
};

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
    // VALIDATION & AUTH VERIFICATION
    // =======================================================

    const authUserId =
      req.user?.userId ||
      req.user?.id ||
      req.user?._id;

    // Security check: A user cannot apply a referral for a different user
    if (
      authUserId &&
      referredUserId &&
      authUserId.toString() !== referredUserId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot apply a referral code on behalf of another user.",
      });
    }

    const targetUserId =
      authUserId ||
      referredUserId;

    if (
      !referralCode ||
      !targetUserId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Referral code and referred user ID are required.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        targetUserId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid referred user ID.",
      });
    }

    const referredUser =
      await User.findById(
        targetUserId
      );

    if (!referredUser) {
      return res.status(404).json({
        success: false,
        message:
          "Referred user not found.",
      });
    }

    const result = await attributeReferral({
      referralCode,
      referredUserId: referredUser._id,
      referredEmail: referredUser.email,
    });

    if (!result.success) {
      return res.status(result.statusCode).json({
        success: false,
        message: result.message,
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Referral applied successfully. The reward will be credited after the referral requirement is completed.",
      data: result.data,
    });
  } catch (error) {
    console.error(
      "Apply Referral Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "This user has already used a referral.",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to apply referral.",
    });
  }
};

// =========================================================
// PROCESS REFERRAL COMPLETION (INTERNAL TRUSTED SERVICE)
// =========================================================
//
// Verifies all referral completion rules before awarding credits:
// 1. Referral relationship exists in database.
// 2. Self-referral is rejected.
// 3. Referrer account exists.
// 4. Maximum referral limit is enforced (<= 5).
// 5. Referral requirements are verified (at least one delivered order).
// 6. Atomic state transition prevents duplicate rewards / double crediting.
// 7. Wallet credit uses trusted backend reward amount (₹350) and credited
//    directly to the verified referrer.
//
// =========================================================

export const processReferralCompletion = async ({
  referredUserId,
  referralId,
}) => {
  if (!referredUserId && !referralId) {
    return {
      success: false,
      statusCode: 400,
      message: "Referred user ID or referral ID is required.",
    };
  }

  if (
    referredUserId &&
    !mongoose.Types.ObjectId.isValid(referredUserId)
  ) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid referred user ID.",
    };
  }

  if (
    referralId &&
    !mongoose.Types.ObjectId.isValid(referralId)
  ) {
    return {
      success: false,
      statusCode: 400,
      message: "Invalid referral ID.",
    };
  }

  // 1. Find referral
  const query = referralId
    ? { _id: referralId }
    : { referredUser: referredUserId };

  const referral = await Referral.findOne(query);

  if (!referral) {
    return {
      success: false,
      statusCode: 404,
      message: "Pending referral not found.",
    };
  }

  // Check if reward was already issued (Duplicate prevention)
  if (
    referral.rewardCredited === true ||
    referral.status === "completed"
  ) {
    return {
      success: false,
      statusCode: 400,
      message: "Referral has already been completed and reward already issued.",
    };
  }

  if (referral.status !== "pending") {
    return {
      success: false,
      statusCode: 400,
      message: `Cannot complete referral with status "${referral.status}".`,
    };
  }

  // 2. Self-referral prevention
  if (
    referral.referrer &&
    referral.referredUser &&
    referral.referrer.toString() === referral.referredUser.toString()
  ) {
    return {
      success: false,
      statusCode: 400,
      message: "Self-referral is not permitted.",
    };
  }

  // 3. Find referrer account
  const referrer = await User.findById(referral.referrer);
  if (!referrer) {
    return {
      success: false,
      statusCode: 404,
      message: "Referrer account not found.",
    };
  }

  // 4. Maximum limit check
  const completedReferrals = await Referral.countDocuments({
    referrer: referral.referrer,
    status: "completed",
    rewardCredited: true,
  });

  if (completedReferrals >= MAX_REFERRALS) {
    referral.status = "expired";
    await referral.save();

    return {
      success: false,
      statusCode: 400,
      message: `The referrer has already reached the maximum limit of ${MAX_REFERRALS} referrals.`,
    };
  }

  // 5. Verify referral requirement: Referred user must have at least one delivered order
  const qualifyingOrder = await Order.findOne({
    userId: referral.referredUser,
    status: "delivered",
  });

  if (!qualifyingOrder) {
    return {
      success: false,
      statusCode: 400,
      message: "Referral requirement incomplete. The referred user has not completed a qualifying delivered order.",
    };
  }

  // 6. Atomic state update (Guarantees idempotency and prevents concurrent duplicates)
  const updatedReferral = await Referral.findOneAndUpdate(
    {
      _id: referral._id,
      status: "pending",
      rewardCredited: false,
    },
    {
      $set: {
        status: "completed",
        rewardCredited: true,
        rewardAmount: REFERRAL_REWARD,
        rewardCreditedAt: new Date(),
        completedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  if (!updatedReferral) {
    return {
      success: false,
      statusCode: 400,
      message: "Referral has already been completed or reward already issued.",
    };
  }

  // 7. Credit wallet with trusted ₹350 reward amount
  const rewardAmount = REFERRAL_REWARD;

  const walletResult = await creditWallet({
    userId: referral.referrer,
    amount: rewardAmount,
    reason: "referral_reward",
    description: "Referral reward for referring a new GETSUKA user",
  });

  return {
    success: true,
    statusCode: 200,
    message: `₹${rewardAmount} referral reward credited successfully.`,
    data: {
      referral: updatedReferral,
      rewardAmount,
      totalCompletedReferrals: completedReferrals + 1,
      remainingReferrals: Math.max(
        MAX_REFERRALS - (completedReferrals + 1),
        0
      ),
      maximumEarning: MAX_REFERRALS * REFERRAL_REWARD,
      walletBalance:
        walletResult?.wallet?.balance ?? null,
    },
  };
};

// =========================================================
// COMPLETE REFERRAL (HTTP CONTROLLER)
// =========================================================
//
// POST /api/user/referrals/complete
//
// Restricted: Only admin or authorized internal callers can
// trigger referral completion via HTTP. Normal users are rejected.
//
// =========================================================

export const completeReferral = async (
  req,
  res
) => {
  try {
    // Security check: Only internal / admin callers can manually trigger completion via HTTP
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Referral completion cannot be triggered directly by users.",
      });
    }

    const {
      referredUserId,
      referralId,
    } = req.body;

    const result = await processReferralCompletion({
      referredUserId,
      referralId,
    });

    return res.status(result.statusCode).json({
      success: result.success,
      message: result.message,
      ...(result.data ? { data: result.data } : {}),
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