import mongoose from "mongoose";

// =========================================================
// COUPON
// =========================================================

const couponSchema = new mongoose.Schema(
  {
    // =======================================================
    // COUPON CODE
    // =======================================================

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    // =======================================================
    // DISCOUNT TYPE
    // =======================================================

    discountType: {
      type: String,
      enum: [
        "percentage",
        "fixed",
      ],
      required: true,
    },

    // =======================================================
    // DISCOUNT VALUE
    // =======================================================

    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    // =======================================================
    // MINIMUM ORDER AMOUNT
    // =======================================================

    minOrderAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // =======================================================
    // MAXIMUM DISCOUNT
    // =======================================================

    maxDiscountAmount: {
      type: Number,
      min: 0,
      default: null,
    },

    // =======================================================
    // VALIDITY
    // =======================================================

    validFrom: {
      type: Date,
      required: true,
    },

    validUntil: {
      type: Date,
      required: true,
    },

    // =======================================================
    // USAGE LIMIT
    // =======================================================

    usageLimit: {
      type: Number,
      min: 1,
      default: null,
    },

    // =======================================================
    // USED COUNT
    // =======================================================

    usedCount: {
      type: Number,
      min: 0,
      default: 0,
    },

    // =======================================================
    // ONE USE PER USER
    // =======================================================

    oneUsePerUser: {
      type: Boolean,
      default: true,
    },

    // =======================================================
    // ACTIVE STATUS
    // =======================================================

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// =========================================================
// DISCOUNT VALIDATION
// =========================================================

couponSchema.path("discountValue").validate(
  function (value) {
    if (
      this.discountType ===
      "percentage"
    ) {
      return (
        value > 0 &&
        value <= 100
      );
    }

    return value > 0;
  },
  "Invalid discount value."
);

// =========================================================
// DATE VALIDATION
// =========================================================

couponSchema.pre(
  "validate",
  async function () {
    if (
      !this.validFrom ||
      !this.validUntil
    ) {
      return;
    }

    // =======================================================
    // VALID FROM CANNOT BE BEFORE TODAY
    // =======================================================

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (
      this.validFrom < today
    ) {
      throw new Error(
        "Coupon start date cannot be in the past."
      );
    }

    // =======================================================
    // VALID UNTIL MUST BE AFTER VALID FROM
    // =======================================================

    if (
      this.validUntil <=
      this.validFrom
    ) {
      throw new Error(
        "Coupon expiry date must be after the start date."
      );
    }
  }
);

// =========================================================
// INDEXES
// =========================================================

// `code` already has `unique: true` above,
// so no duplicate code index is created here.

couponSchema.index({
  isActive: 1,
  validUntil: 1,
});

couponSchema.index({
  validFrom: 1,
  validUntil: 1,
});

// =========================================================
// MODEL
// =========================================================

const Coupon = mongoose.model(
  "Coupon",
  couponSchema
);

export default Coupon;