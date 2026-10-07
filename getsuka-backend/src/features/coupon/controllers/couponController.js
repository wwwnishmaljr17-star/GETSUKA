import mongoose from "mongoose";

import Coupon from "../models/Coupon.js";

// =========================================================
// CREATE COUPON
// =========================================================

export const createCoupon = async (
  req,
  res
) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount = 0,
      maxDiscountAmount = null,
      validFrom,
      validUntil,
      usageLimit = null,
      oneUsePerUser = true,
      isActive = true,
    } = req.body;

    // =======================================================
    // REQUIRED FIELDS
    // =======================================================

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Coupon code is required",
      });
    }

    if (!discountType) {
      return res.status(400).json({
        success: false,
        message:
          "Discount type is required",
      });
    }

    if (
      discountValue === undefined ||
      discountValue === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount value is required",
      });
    }

    if (!validFrom) {
      return res.status(400).json({
        success: false,
        message:
          "Valid from date is required",
      });
    }

    if (!validUntil) {
      return res.status(400).json({
        success: false,
        message:
          "Valid until date is required",
      });
    }

    // =======================================================
    // NORMALIZE CODE
    // =======================================================

    const normalizedCode =
      String(code)
        .trim()
        .toUpperCase();

    if (!normalizedCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid coupon code",
      });
    }

    // =======================================================
    // VALIDATE DISCOUNT TYPE
    // =======================================================

    const allowedDiscountTypes = [
      "percentage",
      "fixed",
    ];

    if (
      !allowedDiscountTypes.includes(
        discountType
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid discount type",
      });
    }

    // =======================================================
    // VALIDATE DISCOUNT VALUE
    // =======================================================

    const numericDiscountValue =
      Number(discountValue);

    if (
      !Number.isFinite(
        numericDiscountValue
      ) ||
      numericDiscountValue <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount value must be greater than 0",
      });
    }

    if (
      discountType ===
        "percentage" &&
      numericDiscountValue > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Percentage discount cannot exceed 100%",
      });
    }

    // =======================================================
    // VALIDATE MINIMUM ORDER
    // =======================================================

    const numericMinOrderAmount =
      Number(minOrderAmount);

    if (
      !Number.isFinite(
        numericMinOrderAmount
      ) ||
      numericMinOrderAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid minimum order amount",
      });
    }

    // =======================================================
    // VALIDATE MAXIMUM DISCOUNT
    // =======================================================

    let numericMaxDiscountAmount =
      null;

    if (
      maxDiscountAmount !== null &&
      maxDiscountAmount !== undefined &&
      maxDiscountAmount !== ""
    ) {
      numericMaxDiscountAmount =
        Number(maxDiscountAmount);

      if (
        !Number.isFinite(
          numericMaxDiscountAmount
        ) ||
        numericMaxDiscountAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid maximum discount amount",
        });
      }
    }

    if (
      discountType === "fixed" &&
      numericMaxDiscountAmount !== null
    ) {
      numericMaxDiscountAmount =
        null;
    }

    // =======================================================
    // VALIDATE DATES
    // =======================================================

    const startDate =
      new Date(validFrom);

    const endDate =
      new Date(validUntil);

    if (
      Number.isNaN(
        startDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid valid from date",
      });
    }

    if (
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid valid until date",
      });
    }

    // validFrom cannot be in the past.

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (startDate < today) {
      return res.status(400).json({
        success: false,
        message:
          "Coupon start date cannot be in the past",
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message:
          "Valid until date must be after valid from date",
      });
    }

    // =======================================================
    // VALIDATE USAGE LIMIT
    // =======================================================

    let numericUsageLimit =
      null;

    if (
      usageLimit !== null &&
      usageLimit !== undefined &&
      usageLimit !== ""
    ) {
      numericUsageLimit =
        Number(usageLimit);

      if (
        !Number.isInteger(
          numericUsageLimit
        ) ||
        numericUsageLimit <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Usage limit must be a positive integer",
        });
      }
    }

    // =======================================================
    // CHECK DUPLICATE COUPON
    // =======================================================

    const existingCoupon =
      await Coupon.findOne({
        code: normalizedCode,
      });

    if (existingCoupon) {
      return res.status(409).json({
        success: false,
        message:
          "Coupon code already exists",
      });
    }

    // =======================================================
    // CREATE COUPON
    // =======================================================

    const coupon =
      await Coupon.create({
        code: normalizedCode,

        discountType,

        discountValue:
          numericDiscountValue,

        minOrderAmount:
          numericMinOrderAmount,

        maxDiscountAmount:
          numericMaxDiscountAmount,

        validFrom:
          startDate,

        validUntil:
          endDate,

        usageLimit:
          numericUsageLimit,

        usedCount: 0,

        oneUsePerUser:
          Boolean(oneUsePerUser),

        isActive:
          Boolean(isActive),
      });

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(201).json({
      success: true,
      message:
        "Coupon created successfully",
      coupon,
    });
  } catch (error) {
    console.error(
      "Create Coupon Error:",
      error
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Coupon code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create coupon",
    });
  }
};

// =========================================================
// GET COUPONS
// =========================================================

export const getCoupons = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      page = 1,
      limit = 10,
      status = "all",
    } = req.query;

    // =======================================================
    // PAGINATION
    // =======================================================

    const currentPage =
      Math.max(
        Number(page) || 1,
        1
      );

    const itemsPerPage =
      Math.min(
        Math.max(
          Number(limit) || 10,
          1
        ),
        100
      );

    const skip =
      (currentPage - 1) *
      itemsPerPage;

    // =======================================================
    // FILTER
    // =======================================================

    const filter = {};

    // =======================================================
    // SEARCH
    // =======================================================

    if (
      search &&
      String(search).trim()
    ) {
      filter.code = {
        $regex:
          String(search).trim(),
        $options: "i",
      };
    }

    // =======================================================
    // STATUS FILTER
    // =======================================================

    if (
      status === "active"
    ) {
      filter.isActive = true;
    }

    if (
      status === "inactive"
    ) {
      filter.isActive = false;
    }

    // =======================================================
    // FETCH
    // =======================================================

    const [
      coupons,
      totalCoupons,
    ] = await Promise.all([
      Coupon.find(filter)
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(itemsPerPage)
        .lean(),

      Coupon.countDocuments(
        filter
      ),
    ]);

    // =======================================================
    // PAGINATION
    // =======================================================

    const totalPages =
      Math.ceil(
        totalCoupons /
          itemsPerPage
      );

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(200).json({
      success: true,

      coupons,

      pagination: {
        currentPage,
        itemsPerPage,
        totalCoupons,
        totalPages,
        hasNextPage:
          currentPage <
          totalPages,
        hasPreviousPage:
          currentPage > 1,
      },
    });
  } catch (error) {
    console.error(
      "Get Coupons Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch coupons",
    });
  }
};

// =========================================================
// GET SINGLE COUPON
// =========================================================

export const getCouponById =
  async (
    req,
    res
  ) => {
    try {
      const {
        couponId,
      } = req.params;

      // =====================================================
      // VALIDATE ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          couponId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon ID",
        });
      }

      // =====================================================
      // FIND COUPON
      // =====================================================

      const coupon =
        await Coupon.findById(
          couponId
        );

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message:
            "Coupon not found",
        });
      }

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,
        coupon,
      });
    } catch (error) {
      console.error(
        "Get Coupon Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch coupon",
      });
    }
  };

// =========================================================
// UPDATE COUPON
// =========================================================

export const updateCoupon =
  async (
    req,
    res
  ) => {
    try {
      const {
        couponId,
      } = req.params;

      const {
        code,
        discountType,
        discountValue,
        minOrderAmount = 0,
        maxDiscountAmount = null,
        validFrom,
        validUntil,
        usageLimit = null,
        oneUsePerUser = true,
        isActive = true,
      } = req.body;

      // =====================================================
      // VALIDATE ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          couponId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon ID",
        });
      }

      // =====================================================
      // FIND COUPON
      // =====================================================

      const coupon =
        await Coupon.findById(
          couponId
        );

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message:
            "Coupon not found",
        });
      }

      // =====================================================
      // REQUIRED FIELDS
      // =====================================================

      if (!code) {
        return res.status(400).json({
          success: false,
          message:
            "Coupon code is required",
        });
      }

      if (!discountType) {
        return res.status(400).json({
          success: false,
          message:
            "Discount type is required",
        });
      }

      if (
        discountValue ===
          undefined ||
        discountValue === null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Discount value is required",
        });
      }

      if (!validFrom) {
        return res.status(400).json({
          success: false,
          message:
            "Valid from date is required",
        });
      }

      if (!validUntil) {
        return res.status(400).json({
          success: false,
          message:
            "Valid until date is required",
        });
      }

      // =====================================================
      // NORMALIZE CODE
      // =====================================================

      const normalizedCode =
        String(code)
          .trim()
          .toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon code",
        });
      }

      // =====================================================
      // VALIDATE DISCOUNT TYPE
      // =====================================================

      const allowedDiscountTypes = [
        "percentage",
        "fixed",
      ];

      if (
        !allowedDiscountTypes.includes(
          discountType
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid discount type",
        });
      }

      // =====================================================
      // VALIDATE DISCOUNT VALUE
      // =====================================================

      const numericDiscountValue =
        Number(discountValue);

      if (
        !Number.isFinite(
          numericDiscountValue
        ) ||
        numericDiscountValue <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Discount value must be greater than 0",
        });
      }

      if (
        discountType ===
          "percentage" &&
        numericDiscountValue > 100
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Percentage discount cannot exceed 100%",
        });
      }

      // =====================================================
      // VALIDATE MINIMUM ORDER
      // =====================================================

      const numericMinOrderAmount =
        Number(minOrderAmount);

      if (
        !Number.isFinite(
          numericMinOrderAmount
        ) ||
        numericMinOrderAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid minimum order amount",
        });
      }

      // =====================================================
      // VALIDATE MAXIMUM DISCOUNT
      // =====================================================

      let numericMaxDiscountAmount =
        null;

      if (
        maxDiscountAmount !== null &&
        maxDiscountAmount !== undefined &&
        maxDiscountAmount !== ""
      ) {
        numericMaxDiscountAmount =
          Number(
            maxDiscountAmount
          );

        if (
          !Number.isFinite(
            numericMaxDiscountAmount
          ) ||
          numericMaxDiscountAmount <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid maximum discount amount",
          });
        }
      }

      if (
        discountType === "fixed"
      ) {
        numericMaxDiscountAmount =
          null;
      }

      // =====================================================
      // VALIDATE DATES
      // =====================================================

      const startDate =
        new Date(validFrom);

      const endDate =
        new Date(validUntil);

      if (
        Number.isNaN(
          startDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid valid from date",
        });
      }

      if (
        Number.isNaN(
          endDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid valid until date",
        });
      }

      // =====================================================
      // PREVENT PAST START DATE
      // =====================================================

      const today = new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      if (
        startDate < today
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Coupon start date cannot be in the past",
        });
      }

      // =====================================================
      // END DATE CHECK
      // =====================================================

      if (
        endDate <= startDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid until date must be after valid from date",
        });
      }

      // =====================================================
      // VALIDATE USAGE LIMIT
      // =====================================================

      let numericUsageLimit =
        null;

      if (
        usageLimit !== null &&
        usageLimit !== undefined &&
        usageLimit !== ""
      ) {
        numericUsageLimit =
          Number(usageLimit);

        if (
          !Number.isInteger(
            numericUsageLimit
          ) ||
          numericUsageLimit <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Usage limit must be a positive integer",
          });
        }

        // Do not allow the new limit
        // to be smaller than already used count.

        if (
          numericUsageLimit <
          coupon.usedCount
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Usage limit cannot be less than the current used count of ${coupon.usedCount}`,
          });
        }
      }

      // =====================================================
      // CHECK DUPLICATE COUPON CODE
      // =====================================================

      const duplicateCoupon =
        await Coupon.findOne({
          code: normalizedCode,
          _id: {
            $ne: couponId,
          },
        });

      if (duplicateCoupon) {
        return res.status(409).json({
          success: false,
          message:
            "Coupon code already exists",
        });
      }

      // =====================================================
      // UPDATE FIELDS
      // =====================================================

      coupon.code =
        normalizedCode;

      coupon.discountType =
        discountType;

      coupon.discountValue =
        numericDiscountValue;

      coupon.minOrderAmount =
        numericMinOrderAmount;

      coupon.maxDiscountAmount =
        numericMaxDiscountAmount;

      coupon.validFrom =
        startDate;

      coupon.validUntil =
        endDate;

      coupon.usageLimit =
        numericUsageLimit;

      coupon.oneUsePerUser =
        Boolean(oneUsePerUser);

      coupon.isActive =
        Boolean(isActive);

      // IMPORTANT:
      // usedCount is intentionally NOT changed.
      //
      // Editing a coupon should never reset
      // the number of times it has already
      // been used.

      await coupon.save();

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,
        message:
          "Coupon updated successfully",
        coupon,
      });
    } catch (error) {
      console.error(
        "Update Coupon Error:",
        error
      );

      // =====================================================
      // DUPLICATE KEY ERROR
      // =====================================================

      if (
        error.code === 11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Coupon code already exists",
        });
      }

      // =====================================================
      // MONGOOSE VALIDATION ERROR
      // =====================================================

      if (
        error.name ===
        "ValidationError"
      ) {
        const firstError =
          Object.values(
            error.errors
          )[0];

        return res.status(400).json({
          success: false,
          message:
            firstError?.message ||
            "Invalid coupon data",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to update coupon",
      });
    }
  };

// =========================================================
// DELETE COUPON
// =========================================================

export const deleteCoupon =
  async (
    req,
    res
  ) => {
    try {
      const {
        couponId,
      } = req.params;

      // =====================================================
      // VALIDATE ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          couponId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon ID",
        });
      }

      // =====================================================
      // FIND COUPON
      // =====================================================

      const coupon =
        await Coupon.findById(
          couponId
        );

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message:
            "Coupon not found",
        });
      }

      // =====================================================
      // DELETE
      // =====================================================

      await Coupon.findByIdAndDelete(
        couponId
      );

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,
        message:
          "Coupon deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete Coupon Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete coupon",
      });
    }
  };

// =========================================================
// TOGGLE COUPON STATUS
// =========================================================

export const toggleCouponStatus =
  async (
    req,
    res
  ) => {
    try {
      const {
        couponId,
      } = req.params;

      // =====================================================
      // VALIDATE ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          couponId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon ID",
        });
      }

      // =====================================================
      // FIND COUPON
      // =====================================================

      const coupon =
        await Coupon.findById(
          couponId
        );

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message:
            "Coupon not found",
        });
      }

      // =====================================================
      // TOGGLE
      // =====================================================

      coupon.isActive =
        !coupon.isActive;

      await coupon.save();

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,
        message: coupon.isActive
          ? "Coupon activated successfully"
          : "Coupon deactivated successfully",
        coupon,
      });
    } catch (error) {
      console.error(
        "Toggle Coupon Status Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update coupon status",
      });
    }
  };

// =========================================================
// VALIDATE COUPON
// =========================================================

export const validateCoupon =
  async (
    req,
    res
  ) => {
    try {
      const {
        code,
        orderAmount,
      } = req.body;

      // =====================================================
      // VALIDATE INPUT
      // =====================================================

      if (!code) {
        return res.status(400).json({
          success: false,
          message:
            "Coupon code is required",
        });
      }

      const numericOrderAmount =
        Number(orderAmount);

      if (
        !Number.isFinite(
          numericOrderAmount
        ) ||
        numericOrderAmount < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order amount",
        });
      }

      // =====================================================
      // FIND COUPON
      // =====================================================

      const normalizedCode =
        String(code)
          .trim()
          .toUpperCase();

      const coupon =
        await Coupon.findOne({
          code: normalizedCode,
        });

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message:
            "Invalid coupon code",
        });
      }

      // =====================================================
      // ACTIVE CHECK
      // =====================================================

      if (!coupon.isActive) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon is inactive",
        });
      }

      // =====================================================
      // DATE CHECK
      // =====================================================

      const now =
        new Date();

      if (
        now < coupon.validFrom
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon is not active yet",
        });
      }

      if (
        now >
        coupon.validUntil
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon has expired",
        });
      }

      // =====================================================
      // USAGE LIMIT CHECK
      // =====================================================

      if (
        coupon.usageLimit !==
          null &&
        coupon.usedCount >=
          coupon.usageLimit
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon usage limit has been reached",
        });
      }

      // =====================================================
      // MINIMUM ORDER CHECK
      // =====================================================

      if (
        numericOrderAmount <
        coupon.minOrderAmount
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Minimum order amount is ₹${coupon.minOrderAmount}`,
        });
      }

      // =====================================================
      // CALCULATE DISCOUNT
      // =====================================================

      let discountAmount = 0;

      if (
        coupon.discountType ===
        "percentage"
      ) {
        discountAmount =
          (numericOrderAmount *
            coupon.discountValue) /
          100;

        // ===================================================
        // MAXIMUM DISCOUNT
        // ===================================================

        if (
          coupon.maxDiscountAmount !==
            null &&
          discountAmount >
            coupon.maxDiscountAmount
        ) {
          discountAmount =
            coupon.maxDiscountAmount;
        }
      }

      if (
        coupon.discountType ===
        "fixed"
      ) {
        discountAmount =
          coupon.discountValue;
      }

      // =====================================================
      // NEVER DISCOUNT MORE THAN ORDER
      // =====================================================

      discountAmount =
        Math.min(
          discountAmount,
          numericOrderAmount
        );

      discountAmount =
        Math.round(
          discountAmount * 100
        ) / 100;

      const finalAmount =
        Math.max(
          numericOrderAmount -
            discountAmount,
          0
        );

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        success: true,

        message:
          "Coupon applied successfully",

        coupon: {
          id: coupon._id,
          code: coupon.code,
          discountType:
            coupon.discountType,
          discountValue:
            coupon.discountValue,
          minOrderAmount:
            coupon.minOrderAmount,
          maxDiscountAmount:
            coupon.maxDiscountAmount,
        },

        discountAmount,

        orderAmount:
          numericOrderAmount,

        finalAmount,
      });
    } catch (error) {
      console.error(
        "Validate Coupon Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to validate coupon",
      });
    }
  };