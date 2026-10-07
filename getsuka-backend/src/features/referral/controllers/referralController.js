import mongoose from "mongoose";
import Referral from "../models/Referral.js";
import User from "../../users/models/User.js";
import { creditWallet } from "../../wallet/services/walletService.js";

const MAX_REFERRALS = 5;
const REFERRAL_REWARD = 350;

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

/*
|--------------------------------------------------------------------------
| Generate unique referral code
|--------------------------------------------------------------------------
*/
const generateReferralCode = (userId) => {
  const idPart = userId.toString().slice(-6).toUpperCase();

  const randomPart = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

  return `GETSUKA-${idPart}-${randomPart}`;
};

/*
|--------------------------------------------------------------------------
| GET MY REFERRAL DETAILS
|--------------------------------------------------------------------------
| GET /api/user/referrals
|
| Returns:
| - referral code
| - referral link
| - total successful referrals
| - remaining referrals
| - total earned
| - maximum possible earning
|--------------------------------------------------------------------------
*/
export const getMyReferral = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

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

    let referralCode = user.referralCode;

    /*
     * If the User model does not yet contain referralCode,
     * we temporarily use a deterministic code based on the user ID.
     */
    if (!referralCode) {
      referralCode = `GETSUKA-${userId
        .toString()
        .slice(-8)
        .toUpperCase()}`;
    }

    const completedReferrals = await Referral.countDocuments({
      referrer: userId,
      status: "completed",
      rewardCredited: true,
    });

    const pendingReferrals = await Referral.countDocuments({
      referrer: userId,
      status: "pending",
    });

    const remainingReferrals = Math.max(
      MAX_REFERRALS - completedReferrals,
      0
    );

    const totalEarned = completedReferrals * REFERRAL_REWARD;

    const maximumEarning = MAX_REFERRALS * REFERRAL_REWARD;

    const referralLink = `${FRONTEND_URL}/signup?ref=${referralCode}`;

    return res.status(200).json({
      success: true,
      data: {
        referralCode,
        referralLink,

        maxReferrals: MAX_REFERRALS,
        completedReferrals,
        pendingReferrals,
        remainingReferrals,

        rewardPerReferral: REFERRAL_REWARD,
        totalEarned,
        maximumEarning,

        referralLimitReached:
          completedReferrals >= MAX_REFERRALS,
      },
    });
  } catch (error) {
    console.error("Get Referral Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load referral details",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE / GET REFERRAL LINK
|--------------------------------------------------------------------------
| POST /api/user/referrals/create
|--------------------------------------------------------------------------
*/
export const createReferral = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

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

    let referralCode = user.referralCode;

    if (!referralCode) {
      referralCode = generateReferralCode(userId);

      /*
       * Only save if the User schema supports referralCode.
       * If it doesn't, the referral code can still be generated
       * and the User schema will be updated in the next step.
       */
      user.referralCode = referralCode;
      await user.save();
    }

    const completedReferrals = await Referral.countDocuments({
      referrer: userId,
      status: "completed",
      rewardCredited: true,
    });

    if (completedReferrals >= MAX_REFERRALS) {
      return res.status(200).json({
        success: true,
        limitReached: true,
        message:
          "You have reached the maximum limit of 5 successful referrals.",
        data: {
          referralCode,
          referralLink: `${FRONTEND_URL}/signup?ref=${referralCode}`,
          completedReferrals,
          remainingReferrals: 0,
          rewardPerReferral: REFERRAL_REWARD,
          totalEarned: MAX_REFERRALS * REFERRAL_REWARD,
          maximumEarning: MAX_REFERRALS * REFERRAL_REWARD,
        },
      });
    }

    return res.status(200).json({
      success: true,
      limitReached: false,
      message: "Referral link ready.",
      data: {
        referralCode,
        referralLink: `${FRONTEND_URL}/signup?ref=${referralCode}`,
        completedReferrals,
        remainingReferrals: MAX_REFERRALS - completedReferrals,
        rewardPerReferral: REFERRAL_REWARD,
        totalEarned: completedReferrals * REFERRAL_REWARD,
        maximumEarning: MAX_REFERRALS * REFERRAL_REWARD,
      },
    });
  } catch (error) {
    console.error("Create Referral Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create referral link",
    });
  }
};

/*
|--------------------------------------------------------------------------
| APPLY REFERRAL
|--------------------------------------------------------------------------
| Called when a new user signs up using:
|
| /signup?ref=GETSUKA-XXXX
|
| IMPORTANT:
| Reward is NOT credited here.
| This only creates the pending referral.
|--------------------------------------------------------------------------
*/
export const applyReferral = async (req, res) => {
  try {
    const {
      referralCode,
      referredUserId,
    } = req.body;

    if (!referralCode || !referredUserId) {
      return res.status(400).json({
        success: false,
        message:
          "Referral code and referred user ID are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(referredUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid referred user ID.",
      });
    }

    const referredUser = await User.findById(referredUserId);

    if (!referredUser) {
      return res.status(404).json({
        success: false,
        message: "Referred user not found.",
      });
    }

    /*
     * Find referrer.
     */
    const referrer = await User.findOne({
      referralCode: referralCode.toUpperCase().trim(),
    });

    if (!referrer) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code.",
      });
    }

    /*
     * Self referral protection.
     */
    if (referrer._id.toString() === referredUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot use your own referral code.",
      });
    }

    /*
     * Maximum 5 successful referrals.
     */
    const completedReferrals = await Referral.countDocuments({
      referrer: referrer._id,
      status: "completed",
      rewardCredited: true,
    });

    if (completedReferrals >= MAX_REFERRALS) {
      return res.status(400).json({
        success: false,
        message:
          "This referral account has already reached the maximum limit of 5 referrals.",
      });
    }

    /*
     * Prevent the same user from being referred multiple times.
     */
    const existingReferral = await Referral.findOne({
      referredUser: referredUserId,
    });

    if (existingReferral) {
      return res.status(400).json({
        success: false,
        message:
          "This user has already used a referral.",
      });
    }

    /*
     * Create pending referral.
     */
    const referral = await Referral.create({
      referrer: referrer._id,
      referredUser: referredUserId,
      referralCode: referralCode.toUpperCase().trim(),
      referralLink: `${FRONTEND_URL}/signup?ref=${referralCode}`,
      status: "pending",
      rewardAmount: REFERRAL_REWARD,
      rewardCredited: false,
    });

    return res.status(201).json({
      success: true,
      message:
        "Referral applied successfully. Reward will be credited after the referral requirement is completed.",
      data: referral,
    });
  } catch (error) {
    console.error("Apply Referral Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to apply referral.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| COMPLETE REFERRAL + CREDIT ₹350
|--------------------------------------------------------------------------
| This function will be called ONLY after the referred user
| completes our required referral condition.
|--------------------------------------------------------------------------
*/
export const completeReferral = async (req, res) => {
  try {
    const { referredUserId } = req.body;

    if (!referredUserId) {
      return res.status(400).json({
        success: false,
        message: "Referred user ID is required.",
      });
    }

    const referral = await Referral.findOne({
      referredUser: referredUserId,
      status: "pending",
      rewardCredited: false,
    });

    if (!referral) {
      return res.status(404).json({
        success: false,
        message: "Pending referral not found.",
      });
    }

    /*
     * Check maximum referral limit again.
     *
     * This is extremely important because another referral
     * could have been completed after the original check.
     */
    const completedReferrals = await Referral.countDocuments({
      referrer: referral.referrer,
      status: "completed",
      rewardCredited: true,
    });

    if (completedReferrals >= MAX_REFERRALS) {
      referral.status = "expired";
      await referral.save();

      return res.status(400).json({
        success: false,
        message:
          "The referrer has already reached the maximum limit of 5 referrals.",
      });
    }

    const referrer = await User.findById(referral.referrer);

    if (!referrer) {
      return res.status(404).json({
        success: false,
        message: "Referrer account not found.",
      });
    }

    /*
     * Credit exactly ₹350.
     */
    const rewardAmount = REFERRAL_REWARD;

    await creditWallet(
      referral.referrer,
      rewardAmount,
      `Referral reward for referring a new GETSUKA user`
    );

    referral.status = "completed";
    referral.rewardCredited = true;
    referral.rewardAmount = rewardAmount;
    referral.rewardCreditedAt = new Date();
    referral.completedAt = new Date();

    await referral.save();

    return res.status(200).json({
      success: true,
      message: `₹${rewardAmount} referral reward credited successfully.`,
      data: {
        rewardAmount,
        totalCompletedReferrals: completedReferrals + 1,
        remainingReferrals: Math.max(
          MAX_REFERRALS - (completedReferrals + 1),
          0
        ),
        maximumEarning: MAX_REFERRALS * REFERRAL_REWARD,
      },
    });
  } catch (error) {
    console.error("Complete Referral Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to complete referral.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET REFERRAL HISTORY
|--------------------------------------------------------------------------
| GET /api/user/referrals/history
|--------------------------------------------------------------------------
*/
export const getReferralHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const referrals = await Referral.find({
      referrer: userId,
    })
      .populate(
        "referredUser",
        "name email profileImage"
      )
      .sort({
        createdAt: -1,
      });

    const completedReferrals = referrals.filter(
      (referral) =>
        referral.status === "completed" &&
        referral.rewardCredited === true
    ).length;

    const totalEarned =
      completedReferrals * REFERRAL_REWARD;

    return res.status(200).json({
      success: true,
      data: {
        referrals,
        completedReferrals,
        pendingReferrals: referrals.filter(
          (referral) => referral.status === "pending"
        ).length,
        remainingReferrals: Math.max(
          MAX_REFERRALS - completedReferrals,
          0
        ),
        totalEarned,
        maximumEarning:
          MAX_REFERRALS * REFERRAL_REWARD,
      },
    });
  } catch (error) {
    console.error("Get Referral History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load referral history.",
    });
  }
};