import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
  {
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    referredUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    referralCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    referralLink: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "expired", "cancelled"],
      default: "pending",
      index: true,
    },

    rewardAmount: {
      type: Number,
      default: 350,
      min: 0,
    },

    rewardCredited: {
      type: Boolean,
      default: false,
    },

    rewardCreditedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * One user cannot use multiple referral records
 * for the same referred account.
 */
referralSchema.index(
  { referrer: 1, referredUser: 1 },
  {
    unique: true,
    partialFilterExpression: {
      referredUser: { $type: "objectId" },
    },
  }
);

const Referral = mongoose.model("Referral", referralSchema);

export default Referral;