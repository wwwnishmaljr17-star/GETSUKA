import mongoose from "mongoose";
import crypto from "crypto";

import Order from "../models/Order.js";
import Product from "../../product/models/Product.js";
import Address from "../../address/models/Address.js";
import Coupon from "../../coupon/models/Coupon.js";
import Payment from "../../payment/models/Payment.js";

import {
  creditWallet,
  debitWallet,
} from "../../wallet/controllers/walletController.js";
import { processReferralCompletion } from "../../referral/controllers/referralController.js";

// =========================================================
// HELPER: TRANSACTION SUPPORT DETECTION
// =========================================================

const isTransactionSupported = () => {
  try {
    const topology = mongoose.connection?.client?.topology;
    if (!topology) return false;
    const type = topology.description?.type;
    return (
      type === "ReplicaSetWithPrimary" ||
      type === "ReplicaSetNoPrimary" ||
      type === "Sharded"
    );
  } catch {
    return false;
  }
};

// =========================================================
// CREATE ORDER
// =========================================================

export const createOrder = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const {
      addressId,
      paymentMethod = "cod",
      deliveryMethod = "standard",
      couponCode = "",
    } = req.body;

    const rawRazorpayOrderId =
      req.body.razorpayOrderId || req.body.razorpay_order_id || null;
    const rawRazorpayPaymentId =
      req.body.razorpayPaymentId || req.body.razorpay_payment_id || null;
    const rawRazorpaySignature =
      req.body.razorpaySignature || req.body.razorpay_signature || null;

    const razorpayOrderId =
      typeof rawRazorpayOrderId === "string" ? rawRazorpayOrderId.trim() : null;
    const razorpayPaymentId =
      typeof rawRazorpayPaymentId === "string" ? rawRazorpayPaymentId.trim() : null;
    const razorpaySignature =
      typeof rawRazorpaySignature === "string" ? rawRazorpaySignature.trim() : null;

    // =======================================================
    // IDEMPOTENCY CHECK FOR RAZORPAY ORDERS
    // =======================================================

    if (razorpayOrderId || razorpayPaymentId) {
      const queryConditions = [];
      if (razorpayOrderId) queryConditions.push({ razorpayOrderId });
      if (razorpayPaymentId) queryConditions.push({ razorpayPaymentId });

      const existingOrder = await Order.findOne({ $or: queryConditions });
      if (existingOrder) {
        return res.status(200).json({
          success: true,
          message: "Order already placed successfully",
          order: existingOrder,
          alreadyProcessed: true,
        });
      }
    }

    // =======================================================
    // VALIDATE USER
    // =======================================================

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user",
      });
    }

    // =======================================================
    // VALIDATE ADDRESS
    // =======================================================

    const clientShippingAddress =
      req.body.shippingAddress || req.body.address;

    if (!addressId && !clientShippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    let address = null;

    if (addressId && mongoose.Types.ObjectId.isValid(addressId)) {
      address = await Address.findOne({
        _id: addressId,
        userId,
      }).lean();

      if (!address) {
        address = await Address.findById(addressId).lean();
      }
    }

    if (
      !address &&
      clientShippingAddress &&
      typeof clientShippingAddress === "object"
    ) {
      const sa = clientShippingAddress;
      if (
        sa.fullName &&
        sa.phone &&
        sa.addressLine &&
        sa.city &&
        sa.state &&
        sa.pincode
      ) {
        try {
          const createdAddr = await Address.create({
            userId,
            fullName: String(sa.fullName).trim(),
            phone: String(sa.phone).trim(),
            addressLine: String(sa.addressLine).trim(),
            city: String(sa.city).trim(),
            state: String(sa.state).trim(),
            pincode: String(sa.pincode).trim(),
            isDefault: false,
          });
          address = createdAddr.toObject();
        } catch (createErr) {
          console.error("Auto-create shipping address error:", createErr);
        }
      }
    }

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Shipping address not found",
      });
    }

    // =======================================================
    // VALIDATE PAYMENT METHOD
    // =======================================================

    const allowedPaymentMethods = [
      "razorpay",
      "wallet",
      "cod",
    ];

    if (
      !allowedPaymentMethods.includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment method",
      });
    }

    // =======================================================
    // VALIDATE DELIVERY METHOD
    // =======================================================

    const allowedDeliveryMethods = [
      "standard",
      "express",
    ];

    if (
      !allowedDeliveryMethods.includes(
        deliveryMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid delivery method",
      });
    }

    // =======================================================
    // CART
    // =======================================================

    const { items = [] } =
      req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order must contain at least one item",
      });
    }

    // =======================================================
    // LOAD PRODUCTS
    // =======================================================

    const productIds =
      items.map(
        (item) =>
          item.productId
      );

    const uniqueProductIds = [
      ...new Set(
        productIds.map(
          (id) => String(id)
        )
      ),
    ];

    for (
      const productId of
      uniqueProductIds
    ) {
      if (
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID",
        });
      }
    }

    const products =
      await Product.find({
        _id: {
          $in: uniqueProductIds,
        },
        isDeleted: false,
        isListed: true,
      });

    if (
      products.length !==
      uniqueProductIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "One or more products are unavailable",
      });
    }

    // =======================================================
    // CREATE PRODUCT MAP
    // =======================================================

    const productMap =
      new Map();

    products.forEach(
      (product) => {
        productMap.set(
          String(product._id),
          product
        );
      }
    );

    // =======================================================
    // PREPARE ORDER ITEMS
    // =======================================================

    // Consolidate requested quantities by variant for validation and atomic deduction
    const variantQuantities = new Map();
    for (const item of items) {
      if (item?.variantId) {
        const vKey = String(item.variantId);
        const current = variantQuantities.get(vKey) || {
          productId: item.productId,
          variantId: item.variantId,
          quantity: 0,
        };
        current.quantity += Number(item.quantity) || 0;
        variantQuantities.set(vKey, current);
      }
    }

    const orderItems = [];

    let subtotal = 0;

    for (const item of items) {
      const {
        productId,
        variantId,
        quantity,
      } = item;

      // -----------------------------------------------------
      // BASIC VALIDATION
      // -----------------------------------------------------

      if (
        !productId ||
        !variantId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product and variant are required",
        });
      }

      const requestedQuantity =
        Number(quantity);

      if (
        !Number.isInteger(
          requestedQuantity
        ) ||
        requestedQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product quantity",
        });
      }

      // -----------------------------------------------------
      // PRODUCT
      // -----------------------------------------------------

      const product =
        productMap.get(
          String(productId)
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      // -----------------------------------------------------
      // VARIANT
      // -----------------------------------------------------

      const variant =
        product.variants.id(
          variantId
        );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message:
            `Variant not found for ${product.name}`,
        });
      }

      // -----------------------------------------------------
      // STOCK VALIDATION (IN-MEMORY CHECK)
      // -----------------------------------------------------

      const totalRequested =
        variantQuantities.get(String(variantId))?.quantity ||
        requestedQuantity;

      if (
        variant.stock <
        totalRequested
      ) {
        return res.status(400).json({
          success: false,
          message:
            `${product.name} (${variant.color} / ${variant.size}) has only ${variant.stock} item(s) available`,
        });
      }

      // -----------------------------------------------------
      // PRICE
      // -----------------------------------------------------

      const itemPrice =
        product.salePrice !==
          null &&
        product.salePrice !==
          undefined
          ? product.salePrice
          : product.price;

      const itemTotal =
        itemPrice *
        requestedQuantity;

      subtotal += itemTotal;

      // -----------------------------------------------------
      // ORDER ITEM
      // -----------------------------------------------------

      orderItems.push({
        productId:
          product._id,

        variantId:
          variant._id,

        productName:
          product.name,

        productImage:
          product.images?.[0] ||
          "",

        sku:
          variant.sku,

        size:
          variant.size,

        color:
          variant.color,

        quantity:
          requestedQuantity,

        price:
          itemPrice,

        totalPrice:
          itemTotal,
      });
    }

    // =======================================================
    // SHIPPING
    // =======================================================

    const shippingCharge =
      deliveryMethod ===
      "express"
        ? 149
        : 0;

    // =======================================================
    // COUPON / DISCOUNT
    // =======================================================

    let discount = 0;
    let appliedCoupon = null;

    const normalizedCouponCode =
      typeof couponCode === "string"
        ? couponCode.trim().toUpperCase()
        : "";

    if (normalizedCouponCode) {
      const coupon =
        await Coupon.findOne({
          code: normalizedCouponCode,
        });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid coupon code",
        });
      }

      if (!coupon.isActive) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon is inactive",
        });
      }

      const now =
        new Date();

      if (
        now <
        coupon.validFrom
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

      if (
        coupon.usageLimit !== null &&
        coupon.usedCount >=
          coupon.usageLimit
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This coupon usage limit has been reached",
        });
      }

      if (
        coupon.oneUsePerUser
      ) {
        const previousCouponOrder =
          await Order.exists({
            userId,
            couponCode:
              normalizedCouponCode,
          });

        if (
          previousCouponOrder
        ) {
          return res.status(400).json({
            success: false,
            message:
              "You have already used this coupon",
          });
        }
      }

      if (
        subtotal <
        coupon.minOrderAmount
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Minimum order amount is ₹${coupon.minOrderAmount}`,
        });
      }

      if (
        coupon.discountType ===
        "percentage"
      ) {
        discount =
          (subtotal *
            coupon.discountValue) /
          100;

        if (
          coupon.maxDiscountAmount !==
            null &&
          discount >
            coupon.maxDiscountAmount
        ) {
          discount =
            coupon.maxDiscountAmount;
        }
      } else if (
        coupon.discountType ===
        "fixed"
      ) {
        discount =
          coupon.discountValue;
      }

      discount =
        Math.min(
          discount,
          subtotal
        );

      discount =
        Math.round(
          discount * 100
        ) / 100;

      appliedCoupon =
        coupon;
    }

    // =======================================================
    // TAX
    // =======================================================

    const tax = 0;

    // =======================================================
    // TOTAL
    // =======================================================

    const totalAmount =
      subtotal -
      discount +
      tax +
      shippingCharge;

    // =======================================================
    // COD LIMIT
    // =======================================================

    const COD_LIMIT = 25000;

    if (
      paymentMethod === "cod" &&
      totalAmount > COD_LIMIT
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cash on Delivery is available only for orders up to ₹25,000. Please choose an online payment method for this order.",
      });
    }

    // =======================================================
    // ORDER NUMBER
    // =======================================================

    const orderNumber =
      `GET-${Date.now()}-${Math.floor(
        1000 +
          Math.random() *
            9000
      )}`;

    // =======================================================
    // PAYMENT VERIFICATION (GET-002 SECURITY ENFORCEMENT)
    // =======================================================

    let verifiedPaymentRecord = null;

    if (paymentMethod === "razorpay") {
      if (!razorpayOrderId) {
        return res.status(400).json({
          success: false,
          message: "Razorpay order ID is required for Razorpay payments",
        });
      }

      // 1. Find Payment record in database
      const paymentRecord = await Payment.findOne({ razorpayOrderId });

      if (!paymentRecord) {
        return res.status(404).json({
          success: false,
          message: "Payment record not found for the provided Razorpay order ID",
        });
      }

      // 2. Ownership verification: ensure payment belongs to authenticated user
      if (paymentRecord.userId && String(paymentRecord.userId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: This payment does not belong to your account",
        });
      }

      // 3. Reject payments already marked failed or refunded
      if (paymentRecord.status === "failed" || paymentRecord.status === "refunded") {
        return res.status(400).json({
          success: false,
          message: `Payment cannot be processed because it is already marked as ${paymentRecord.status}`,
        });
      }

      // 4. Verify paymentType is order_checkout
      if (paymentRecord.paymentType && paymentRecord.paymentType !== "order_checkout") {
        return res.status(400).json({
          success: false,
          message: "Invalid payment type for order checkout",
        });
      }

      // 5. Double-spend prevention: ensure payment has not already been used for another order
      if (paymentRecord.orderId) {
        const alreadyLinkedOrder = await Order.findById(paymentRecord.orderId);
        if (alreadyLinkedOrder) {
          return res.status(200).json({
            success: true,
            message: "Order already placed successfully",
            order: alreadyLinkedOrder,
            alreadyProcessed: true,
          });
        }
      }

      // 6. Amount validation against server-calculated total
      if (!req.isInternalCaller && Math.abs(paymentRecord.amount - totalAmount) > 0.01) {
        return res.status(400).json({
          success: false,
          message: `Payment amount mismatch: expected ₹${totalAmount}, recorded ₹${paymentRecord.amount}`,
        });
      }

      // 7. Currency validation
      if (paymentRecord.currency && paymentRecord.currency.toUpperCase() !== "INR") {
        return res.status(400).json({
          success: false,
          message: `Payment currency mismatch: expected INR, received ${paymentRecord.currency}`,
        });
      }

      // 8. Signature & Capture Verification
      if (req.isInternalCaller) {
        // Internal server caller (e.g., executeOrderPlacement invoked by verified webhook)
        verifiedPaymentRecord = paymentRecord;
      } else if (paymentRecord.status === "captured") {
        // Payment was already verified and captured (e.g. by verifyRazorpayPayment endpoint or webhook)
        if (razorpayPaymentId && paymentRecord.razorpayPaymentId && paymentRecord.razorpayPaymentId !== razorpayPaymentId) {
          return res.status(409).json({
            success: false,
            message: "Payment has already been captured with a different payment ID",
          });
        }
        verifiedPaymentRecord = paymentRecord;
      } else {
        // Payment is not yet captured — direct signature verification required
        if (!razorpayPaymentId || !razorpaySignature) {
          return res.status(400).json({
            success: false,
            message: "Payment verification failed: valid payment ID and signature are required",
          });
        }

        const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;
        if (!razorpaySecret) {
          console.error("RAZORPAY_KEY_SECRET is not configured");
          return res.status(500).json({
            success: false,
            message: "Payment gateway configuration error",
          });
        }

        const generatedSignature = crypto
          .createHmac("sha256", razorpaySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest("hex");

        const isSignatureValid =
          generatedSignature.length === razorpaySignature.length &&
          crypto.timingSafeEqual(
            Buffer.from(generatedSignature, "utf-8"),
            Buffer.from(razorpaySignature, "utf-8")
          );

        if (!isSignatureValid) {
          return res.status(400).json({
            success: false,
            message: "Payment verification failed: invalid payment signature",
          });
        }

        paymentRecord.status = "captured";
        paymentRecord.razorpayPaymentId = razorpayPaymentId;
        paymentRecord.razorpaySignature = razorpaySignature;
        await paymentRecord.save();

        verifiedPaymentRecord = paymentRecord;
      }
    }

    // =======================================================
    // PAYMENT STATUS (DERIVED SECURELY ON SERVER)
    // =======================================================

    const paymentStatus =
      paymentMethod === "cod"
        ? "pending"
        : (paymentMethod === "razorpay" && verifiedPaymentRecord
            ? "paid"
            : (paymentMethod === "wallet"
                ? "paid"
                : "pending"));

    // =======================================================
    // SHIPPING ADDRESS SNAPSHOT
    // =======================================================

    const shippingAddress = {
      addressId:
        address._id,

      fullName:
        address.fullName,

      phone:
        address.phone,

      addressLine:
        address.addressLine,

      city:
        address.city,

      state:
        address.state,

      pincode:
        address.pincode,
    };

    // =======================================================
    // CONCURRENCY-SAFE TRANSACTION & STOCK DEDUCTION
    // =======================================================

    let session = null;
    if (isTransactionSupported()) {
      session = await mongoose.startSession();
      session.startTransaction();
    }

    const deductedItems = [];
    let stockDeductionError = null;
    let order = null;
    let couponIncremented = false;
    let walletDebitResult = null;

    try {
      // -----------------------------------------------------
      // 1. ATOMIC CONDITIONAL STOCK DEDUCTIONS
      // -----------------------------------------------------

      for (const entry of variantQuantities.values()) {
        const deductionResult = await Product.findOneAndUpdate(
          {
            _id: entry.productId,
            isDeleted: false,
            variants: {
              $elemMatch: {
                _id: entry.variantId,
                stock: { $gte: entry.quantity },
              },
            },
          },
          {
            $inc: {
              "variants.$.stock": -entry.quantity,
            },
          },
          {
            returnDocument: "after",
            session,
          }
        );

        if (!deductionResult) {
          const currentProduct = await Product.findOne(
            {
              _id: entry.productId,
              "variants._id": entry.variantId,
            },
            {
              name: 1,
              "variants.$": 1,
            }
          ).lean();

          const currentVariant = currentProduct?.variants?.[0];
          const availableStock = currentVariant?.stock ?? 0;
          const productName = currentProduct?.name || "Product";
          const variantLabel = currentVariant
            ? ` (${currentVariant.color} / ${currentVariant.size})`
            : "";

          stockDeductionError = `${productName}${variantLabel} has only ${availableStock} item(s) available`;
          break;
        }

        deductedItems.push({
          productId: entry.productId,
          variantId: entry.variantId,
          quantity: entry.quantity,
        });
      }

      if (stockDeductionError) {
        if (session) {
          await session.abortTransaction();
        } else {
          for (const item of deductedItems) {
            await Product.updateOne(
              {
                _id: item.productId,
                "variants._id": item.variantId,
              },
              {
                $inc: {
                  "variants.$.stock": item.quantity,
                },
              }
            );
          }
        }

        return res.status(400).json({
          success: false,
          message: stockDeductionError,
        });
      }

      // -----------------------------------------------------
      // 2. CREATE ORDER
      // -----------------------------------------------------

      if (discount > 0 && subtotal > 0) {
        orderItems.forEach((it) => {
          const itemDiscount =
            Math.round(
              ((Number(it.totalPrice) || 0) / subtotal) * discount * 100
            ) / 100;
          it.discountShare = itemDiscount;
        });
      }

      order = new Order({
        userId,
        orderNumber,
        items: orderItems,
        shippingAddress,
        deliveryMethod,
        shippingCharge,
        subtotal,
        originalSubtotal: subtotal,
        discount,
        originalDiscount: discount,
        tax,
        totalAmount,
        originalTotalAmount: totalAmount,
        totalRefundedAmount: 0,
        couponCode: normalizedCouponCode,
        paymentMethod,
        paymentStatus,
        status: "placed",
        returnStatus: "none",
        razorpayOrderId: razorpayOrderId || null,
        razorpayPaymentId:
          razorpayPaymentId ||
          verifiedPaymentRecord?.razorpayPaymentId ||
          null,
      });

      await order.save({ session });

      // -----------------------------------------------------
      // 2B. LINK PAYMENT RECORD IF AVAILABLE
      // -----------------------------------------------------

      if (verifiedPaymentRecord) {
        try {
          verifiedPaymentRecord.orderId = order._id;
          verifiedPaymentRecord.status = "captured";
          if (razorpayPaymentId) {
            verifiedPaymentRecord.razorpayPaymentId = razorpayPaymentId;
          }
          if (razorpaySignature) {
            verifiedPaymentRecord.razorpaySignature = razorpaySignature;
          }
          await verifiedPaymentRecord.save({ session });
        } catch (paymentLinkErr) {
          console.error("Link payment record error:", paymentLinkErr);
        }
      }

      // -----------------------------------------------------
      // 3. INCREMENT COUPON USAGE
      // -----------------------------------------------------

      if (appliedCoupon) {
        const usageFilter = {
          _id: appliedCoupon._id,
          isActive: true,
        };

        if (appliedCoupon.usageLimit !== null) {
          usageFilter.usedCount = {
            $lt: appliedCoupon.usageLimit,
          };
        }

        const updatedCoupon = await Coupon.findOneAndUpdate(
          usageFilter,
          {
            $inc: {
              usedCount: 1,
            },
          },
          {
            returnDocument: "after",
            session,
          }
        );

        if (!updatedCoupon) {
          if (session) {
            await session.abortTransaction();
          } else {
            await Order.deleteOne({ _id: order._id });
            for (const item of deductedItems) {
              await Product.updateOne(
                {
                  _id: item.productId,
                  "variants._id": item.variantId,
                },
                {
                  $inc: {
                    "variants.$.stock": item.quantity,
                  },
                }
              );
            }
          }

          return res.status(400).json({
            success: false,
            message:
              "This coupon usage limit has been reached. Please try again.",
          });
        }

        couponIncremented = true;
      }

      // -----------------------------------------------------
      // 4. DEBIT WALLET FOR WALLET PAYMENT
      // -----------------------------------------------------

      if (paymentMethod === "wallet") {
        try {
          walletDebitResult = await debitWallet({
            userId,
            amount: totalAmount,
            reason: "wallet_payment",
            description: `Payment for order ${orderNumber}`,
            orderId: order._id,
            orderNumber,
          });
        } catch (walletError) {
          if (session) {
            await session.abortTransaction();
          } else {
            await Order.deleteOne({ _id: order._id });
            if (couponIncremented) {
              await Coupon.findOneAndUpdate(
                {
                  _id: appliedCoupon._id,
                  usedCount: { $gt: 0 },
                },
                {
                  $inc: {
                    usedCount: -1,
                  },
                }
              );
            }
            for (const item of deductedItems) {
              await Product.updateOne(
                {
                  _id: item.productId,
                  "variants._id": item.variantId,
                },
                {
                  $inc: {
                    "variants.$.stock": item.quantity,
                  },
                }
              );
            }
          }

          return res.status(400).json({
            success: false,
            message:
              walletError.message ||
              "Insufficient wallet balance",
          });
        }
      }

      // -----------------------------------------------------
      // 5. COMMIT TRANSACTION IF ACTIVE
      // -----------------------------------------------------

      if (session) {
        await session.commitTransaction();
      }

      return res.status(201).json({
        success: true,
        message: "Order created successfully",
        order,
      });
    } catch (innerError) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch (abortErr) {
          console.error("Abort transaction error:", abortErr);
        }
      } else {
        if (order?._id) {
          try {
            await Order.deleteOne({ _id: order._id });
          } catch (e) {
            console.error("Cleanup order error:", e);
          }
        }
        if (couponIncremented && appliedCoupon?._id) {
          try {
            await Coupon.findOneAndUpdate(
              {
                _id: appliedCoupon._id,
                usedCount: { $gt: 0 },
              },
              {
                $inc: { usedCount: -1 },
              }
            );
          } catch (e) {
            console.error("Cleanup coupon error:", e);
          }
        }
        for (const item of deductedItems) {
          try {
            await Product.updateOne(
              {
                _id: item.productId,
                "variants._id": item.variantId,
              },
              {
                $inc: { "variants.$.stock": item.quantity },
              }
            );
          } catch (e) {
            console.error("Cleanup stock error:", e);
          }
        }
      }

      if (walletDebitResult && paymentMethod === "wallet") {
        try {
          await creditWallet({
            userId,
            amount: totalAmount,
            reason: "order_cancellation_refund",
            description: `Refund for failed order creation ${orderNumber}`,
            orderId: order?._id,
            orderNumber,
          });
        } catch (walletRefundErr) {
          console.error("Wallet refund error:", walletRefundErr);
        }
      }

      throw innerError;
    } finally {
      if (session) {
        try {
          await session.endSession();
        } catch (endErr) {
          console.error("End session error:", endErr);
        }
      }
    }
  } catch (error) {
    console.error(
      "Create Order Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create order",
    });
  }
};

// =========================================================
// EXECUTE ORDER PLACEMENT (PROGRAMMATIC HELPER)
// =========================================================

export const executeOrderPlacement = async ({
  userId,
  addressId,
  paymentMethod = "cod",
  deliveryMethod = "standard",
  couponCode = "",
  items = [],
  razorpayOrderId = null,
  razorpayPaymentId = null,
  paymentStatus = "paid",
}) => {
  return new Promise(async (resolve, reject) => {
    const mockReq = {
      user: { userId },
      isInternalCaller: true,
      body: {
        addressId,
        paymentMethod,
        deliveryMethod,
        couponCode,
        items,
        razorpayOrderId,
        razorpayPaymentId,
        paymentStatus,
      },
    };

    const mockRes = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        if (this.statusCode >= 400 || !data?.success) {
          const err = new Error(data?.message || "Order placement failed");
          err.statusCode = this.statusCode;
          err.body = data;
          return reject(err);
        }
        return resolve({
          success: true,
          order: data.order,
          alreadyProcessed: data.alreadyProcessed || false,
        });
      },
    };

    try {
      await createOrder(mockReq, mockRes);
    } catch (err) {
      reject(err);
    }
  });
};

// =========================================================
// GET USER ORDERS
// =========================================================

export const getUserOrders = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    const orders =
      await Order.find({
        userId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Get User Orders Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch orders",
    });
  }
};

// =========================================================
// GET USER ORDER BY ID
// =========================================================

export const getUserOrderById =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user.userId;

      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findOne({
          _id:
            orderId,
          userId,
        }).lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      return res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      console.error(
        "Get User Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch order",
      });
    }
  };

// =========================================================
// CANCEL USER ORDER
// =========================================================

export const cancelUserOrder =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user.userId;

      const { orderId } =
        req.params;

      const {
        cancellationReason = "",
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const reason =
        String(
          cancellationReason
        ).trim();

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Cancellation reason is required",
        });
      }

      const order =
        await Order.findOne({
          _id:
            orderId,
          userId,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      const cancellableStatuses =
        [
          "placed",
          "confirmed",
        ];

      if (
        !cancellableStatuses.includes(
          order.status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This order can no longer be cancelled",
        });
      }

      const activeItems =
        order.items.filter(
          (item) =>
            (item.itemStatus ||
              "active") ===
            "active"
        );

      if (
        activeItems.length ===
        0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "All items in this order are already cancelled",
        });
      }

      const cancelledAt =
        new Date();

      // =====================================================
      // ATOMIC CANCELLATION CLAIM
      // Prevents concurrent requests from restoring stock twice
      // =====================================================

      const claimedOrder =
        await Order.findOneAndUpdate(
          {
            _id: orderId,
            userId,
            status: {
              $in: cancellableStatuses,
            },
          },
          {
            $set: {
              status:
                "cancelled",
              cancellationReason:
                reason,
              cancellationSource:
                "user",
              cancelledAt,
            },
          },
          {
            returnDocument: "after",
          }
        );

      if (!claimedOrder) {
        return res.status(400).json({
          success: false,
          message:
            "This order can no longer be cancelled",
        });
      }

      // =====================================================
      // 1. RESTORE STOCK FOR ELIGIBLE QUANTITIES
      // Never restores already-cancelled or already-returned items
      // =====================================================

      const claimedActiveItems =
        claimedOrder.items.filter(
          (item) =>
            (item.itemStatus ||
              "active") ===
            "active"
        );

      for (
        const item of claimedActiveItems
      ) {
        if (
          !item.productId ||
          !item.variantId
        ) {
          continue;
        }

        const restoreQty =
          (Number(
            item.quantity
          ) || 0) -
          (Number(
            item.cancelledQuantity
          ) || 0);

        if (restoreQty > 0) {
          await Product.updateOne(
            {
              _id: item.productId,
              isDeleted: false,
              "variants._id":
                item.variantId,
            },
            {
              $inc: {
                "variants.$.stock":
                  restoreQty,
              },
            }
          );
        }
      }

      // =====================================================
      // 2. REFUND PAID ORDER (EXCLUDING EXPRESS DELIVERY FEE)
      // =====================================================

      const isPaidOnline =
        claimedOrder.paymentStatus ===
          "paid" &&
        (
          claimedOrder.paymentMethod ===
            "razorpay" ||
          claimedOrder.paymentMethod ===
            "wallet"
        );

      const isExpress =
        claimedOrder.deliveryMethod ===
        "express";

      const expressCharge =
        isExpress
          ? Number(
              claimedOrder.shippingCharge
            ) || 0
          : 0;

      const orderBaseTotal =
        Number(
          claimedOrder.originalTotalAmount !=
            null
            ? claimedOrder.originalTotalAmount
            : claimedOrder.totalAmount
        ) || 0;

      const maxOrderRefund =
        Math.max(
          0,
          orderBaseTotal -
            expressCharge
        );

      const alreadyRefunded =
        Number(
          claimedOrder.totalRefundedAmount
        ) ||
        claimedOrder.items.reduce(
          (sum, it) =>
            sum +
            (Number(
              it.refundedAmount
            ) || 0),
          0
        );

      const refundableAmount =
        isPaidOnline
          ? Math.max(
              0,
              Math.round(
                (maxOrderRefund -
                  alreadyRefunded) *
                  100
              ) / 100
            )
          : 0;

      let refundResult =
        null;

      if (
        isPaidOnline &&
        refundableAmount > 0
      ) {
        refundResult =
          await creditWallet({
            userId,

            amount:
              refundableAmount,

            reason:
              "order_cancellation_refund",

            description:
              `Refund for cancelled order ${claimedOrder.orderNumber}`,

            orderId:
              claimedOrder._id,

            orderNumber:
              claimedOrder.orderNumber,
          });

        claimedOrder.paymentStatus =
          "refunded";
      }

      // =====================================================
      // 3. MARK ITEMS CANCELLED
      // =====================================================

      const activeSubtotal =
        claimedActiveItems.reduce(
          (sum, it) =>
            sum +
            (Number(
              it.totalPrice
            ) || 0),
          0
        );

      claimedOrder.items.forEach(
        (item) => {
          if (
            (item.itemStatus ||
              "active") ===
            "active"
          ) {
            item.itemStatus =
              "cancelled";

            item.cancelledQuantity =
              Number(
                item.quantity || 0
              );

            item.cancellationReason =
              reason;

            item.cancellationSource =
              "user";

            item.cancelledAt =
              cancelledAt;

            if (
              refundResult &&
              refundableAmount > 0
            ) {
              item.refundStatus =
                "refunded";

              if (
                activeSubtotal > 0
              ) {
                const itemShare =
                  (Number(
                    item.totalPrice
                  ) || 0) /
                  activeSubtotal;

                item.refundedAmount =
                  Math.round(
                    itemShare *
                      refundableAmount *
                      100
                  ) / 100;
              } else {
                item.refundedAmount = 0;
              }
            }
          }
        }
      );

      if (
        refundResult &&
        refundableAmount > 0
      ) {
        claimedOrder.totalRefundedAmount =
          (Number(
            claimedOrder.totalRefundedAmount
          ) || 0) +
          refundableAmount;
      }

      // Preserve original financial values
      if (
        claimedOrder.originalSubtotal ==
          null &&
        claimedOrder.subtotal != null
      ) {
        claimedOrder.originalSubtotal =
          claimedOrder.subtotal;
      }

      if (
        claimedOrder.originalDiscount ==
          null &&
        claimedOrder.discount != null
      ) {
        claimedOrder.originalDiscount =
          claimedOrder.discount;
      }

      if (
        claimedOrder.originalTotalAmount ==
          null &&
        claimedOrder.totalAmount != null
      ) {
        claimedOrder.originalTotalAmount =
          claimedOrder.totalAmount;
      }

      await claimedOrder.save();

      return res.status(200).json({
        success: true,

        message:
          refundResult
            ? "Order cancelled successfully and refund added to wallet"
            : "Order cancelled successfully",

        refund:
          refundResult
            ? {
                amount:
                  refundableAmount,

                walletBalance:
                  refundResult.wallet
                    ?.balance ??
                  null,
              }
            : null,

        order: claimedOrder,
      });
    } catch (error) {
      console.error(
        "Cancel User Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to cancel order",
      });
    }
  };

// =========================================================
// =========================================================
// CANCEL USER ORDER ITEMS (BATCH & ITEM-LEVEL CORE LOGIC)
// =========================================================

export const executeOrderItemsCancellation = async ({
  req,
  res,
  orderId,
  userId,
  itemsToCancel,
  cancellationReason,
}) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const reason = String(cancellationReason || "").trim();
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Cancellation reason is required",
      });
    }

    if (!Array.isArray(itemsToCancel) || itemsToCancel.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item must be selected for cancellation",
      });
    }

    // Validate item ID formats and quantities
    for (const it of itemsToCancel) {
      if (!it.itemId || !mongoose.Types.ObjectId.isValid(it.itemId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order item ID",
        });
      }
      if (it.quantity !== undefined) {
        const q = Number(it.quantity);
        if (!Number.isInteger(q) || q < 1) {
          return res.status(400).json({
            success: false,
            message: "Cancellation quantity must be a positive whole number",
          });
        }
      }
    }

    const useTransaction = isTransactionSupported();
    const session = useTransaction ? await mongoose.startSession() : null;
    if (session) {
      session.startTransaction();
    }

    const stockRestorations = [];

    try {
      const order = await Order.findOne(
        { _id: orderId, userId },
        null,
        session ? { session } : {}
      );

      if (!order) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }

      const cancellableStatuses = ["placed", "confirmed"];
      if (!cancellableStatuses.includes(order.status)) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        return res.status(400).json({
          success: false,
          message: "This order can no longer be cancelled",
        });
      }

      // Check items existence and active quantity
      const preparedItems = [];
      for (const it of itemsToCancel) {
        const orderItem = order.items.id(it.itemId);
        if (!orderItem) {
          if (session) {
            await session.abortTransaction();
            session.endSession();
          }
          return res.status(404).json({
            success: false,
            message: "Order item not found in this order",
          });
        }

        const totalQty = Number(orderItem.quantity) || 0;
        const cancelledQty = Number(orderItem.cancelledQuantity) || 0;
        const returnedQty = Number(orderItem.returnedQuantity) || 0;
        const activeRemainingQty = Math.max(0, totalQty - cancelledQty - returnedQty);

        if (activeRemainingQty <= 0 || (orderItem.itemStatus || "active") === "cancelled") {
          if (session) {
            await session.abortTransaction();
            session.endSession();
          }
          return res.status(400).json({
            success: false,
            message: `Item "${orderItem.productName}" is already cancelled or returned`,
          });
        }

        const cancelQty = it.quantity !== undefined ? Number(it.quantity) : activeRemainingQty;
        if (cancelQty > activeRemainingQty) {
          if (session) {
            await session.abortTransaction();
            session.endSession();
          }
          return res.status(400).json({
            success: false,
            message: `Cannot cancel ${cancelQty} units of "${orderItem.productName}". Only ${activeRemainingQty} units are active.`,
          });
        }

        preparedItems.push({
          orderItem,
          cancelQty,
        });
      }

      // =======================================================
      // REFUND CALCULATION
      // =======================================================
      const isPaidOnline =
        order.paymentStatus === "paid" &&
        (order.paymentMethod === "razorpay" || order.paymentMethod === "wallet");

      const isExpress = order.deliveryMethod === "express";
      const expressCharge = isExpress ? (Number(order.shippingCharge) || 149) : 0;
      const orderBaseTotal = Number(
        order.originalTotalAmount != null ? order.originalTotalAmount : order.totalAmount
      ) || 0;

      const maxOrderRefund = Math.max(0, orderBaseTotal - expressCharge);
      const totalPreviouslyRefunded = Number(order.totalRefundedAmount) || 0;
      let availableRefundBudget = isPaidOnline
        ? Math.max(0, Math.round((maxOrderRefund - totalPreviouslyRefunded) * 100) / 100)
        : 0;

      const baseSubtotal = Number(
        order.originalSubtotal != null ? order.originalSubtotal : order.subtotal
      ) || 0;
      const baseDiscount = Number(
        order.originalDiscount != null ? order.originalDiscount : order.discount
      ) || 0;

      let totalBatchRefund = 0;
      const itemRefunds = [];

      for (const { orderItem, cancelQty } of preparedItems) {
        let itemRefund = 0;

        if (isPaidOnline) {
          const totalItemQty = Number(orderItem.quantity) || 1;
          const itemGrossForUnits = Math.round(Number(orderItem.price) * cancelQty * 100) / 100;

          let allocatedDiscountForUnits = 0;
          if (orderItem.discountShare != null && Number(orderItem.discountShare) > 0) {
            const unitDiscount = Number(orderItem.discountShare) / totalItemQty;
            allocatedDiscountForUnits = Math.round(unitDiscount * cancelQty * 100) / 100;
          } else if (baseDiscount > 0 && baseSubtotal > 0) {
            const itemTotal = Number(orderItem.totalPrice) || (Number(orderItem.price) * totalItemQty);
            const itemDiscountShare = (itemTotal / baseSubtotal) * baseDiscount;
            const unitDiscount = itemDiscountShare / totalItemQty;
            allocatedDiscountForUnits = Math.round(unitDiscount * cancelQty * 100) / 100;
          }

          const calculatedItemRefund = Math.max(
            0,
            Math.round((itemGrossForUnits - allocatedDiscountForUnits) * 100) / 100
          );
          itemRefund = Math.min(calculatedItemRefund, availableRefundBudget);
          availableRefundBudget = Math.max(0, Math.round((availableRefundBudget - itemRefund) * 100) / 100);
        }

        totalBatchRefund = Math.round((totalBatchRefund + itemRefund) * 100) / 100;
        itemRefunds.push({
          orderItem,
          cancelQty,
          itemRefund,
        });
      }

      // =======================================================
      // ATOMIC CANCELLATION CLAIM
      // Prevents concurrent requests from double-cancelling or double-restocking
      // =======================================================
      const claimFilter = {
        _id: orderId,
        userId,
        status: { $in: cancellableStatuses },
      };

      const andConditions = preparedItems.map(({ orderItem }) => ({
        items: {
          $elemMatch: {
            _id: orderItem._id,
            cancelledQuantity: Number(orderItem.cancelledQuantity) || 0,
            itemStatus: { $ne: "cancelled" },
          },
        },
      }));

      if (andConditions.length > 0) {
        claimFilter.$and = andConditions;
      }

      const incDoc = {};
      const arrayFilters = [];
      preparedItems.forEach(({ orderItem, cancelQty }, idx) => {
        const filterName = `elem${idx}`;
        incDoc[`items.$[${filterName}].cancelledQuantity`] = cancelQty;
        arrayFilters.push({ [`${filterName}._id`]: orderItem._id });
      });

      const claimedOrder = await Order.findOneAndUpdate(
        claimFilter,
        {
          $inc: incDoc,
          $set: {
            cancellationReason: reason,
            cancellationSource: "user",
            cancelledAt: new Date(),
          },
        },
        {
          arrayFilters,
          returnDocument: "after",
          ...(session ? { session } : {}),
        }
      );

      if (!claimedOrder) {
        if (session) {
          await session.abortTransaction();
          session.endSession();
        }
        return res.status(400).json({
          success: false,
          message: "Item was already modified, cancelled, or concurrent cancellation conflict detected",
        });
      }

      // =======================================================
      // RESTORE STOCK
      // =======================================================
      for (const { orderItem, cancelQty } of itemRefunds) {
        if (orderItem.productId && orderItem.variantId && cancelQty > 0) {
          await Product.updateOne(
            {
              _id: orderItem.productId,
              isDeleted: false,
              "variants._id": orderItem.variantId,
            },
            {
              $inc: { "variants.$.stock": cancelQty },
            },
            session ? { session } : {}
          );

          stockRestorations.push({
            productId: orderItem.productId,
            variantId: orderItem.variantId,
            quantity: cancelQty,
          });
        }
      }

      // =======================================================
      // WALLET CREDITS & ITEM UPDATES
      // =======================================================
      let lastRefundResult = null;
      const cancelledAt = new Date();

      for (const { orderItem, cancelQty, itemRefund } of itemRefunds) {
        const claimedItem = claimedOrder.items.id(orderItem._id);
        if (!claimedItem) continue;

        const currentCancelled = Number(claimedItem.cancelledQuantity) || 0;
        if (currentCancelled >= Number(claimedItem.quantity)) {
          claimedItem.itemStatus = "cancelled";
        }
        claimedItem.cancellationReason = reason;
        claimedItem.cancellationSource = "user";
        claimedItem.cancelledAt = cancelledAt;

        if (isPaidOnline && itemRefund > 0) {
          const refundResult = await creditWallet({
            userId,
            amount: itemRefund,
            reason: "order_cancellation_refund",
            description: `Refund for cancelled item ${claimedItem.productName} (${cancelQty} units) from order ${claimedOrder.orderNumber}`,
            orderId: claimedOrder._id,
            orderItemId: claimedItem._id,
            refundOperationId: `cancel_${claimedOrder._id}_${claimedItem._id}_qty${currentCancelled}`,
            orderNumber: claimedOrder.orderNumber,
            session,
          });

          lastRefundResult = refundResult;
          claimedItem.refundStatus = "refunded";
          claimedItem.refundedAmount = Math.round(((Number(claimedItem.refundedAmount) || 0) + itemRefund) * 100) / 100;
        }
      }

      if (isPaidOnline && totalBatchRefund > 0) {
        claimedOrder.totalRefundedAmount = Math.round(
          ((Number(claimedOrder.totalRefundedAmount) || 0) + totalBatchRefund) * 100
        ) / 100;
      }

      // =======================================================
      // ORDER TOTALS AND STATUS UPDATES
      // =======================================================
      const allCancelled = claimedOrder.items.every(
        (it) => (Number(it.cancelledQuantity) || 0) >= Number(it.quantity) || it.itemStatus === "cancelled"
      );

      if (allCancelled) {
        claimedOrder.status = "cancelled";
        claimedOrder.cancellationReason = reason;
        claimedOrder.cancellationSource = "user";
        claimedOrder.cancelledAt = cancelledAt;
        if (isPaidOnline) {
          claimedOrder.paymentStatus = "refunded";
        }
        claimedOrder.subtotal = 0;
        claimedOrder.discount = 0;
        claimedOrder.totalAmount = 0;
        claimedOrder.tax = 0;
      } else {
        const activeItems = claimedOrder.items.filter(
          (it) =>
            (it.itemStatus || "active") === "active" &&
            (Number(it.quantity) - (Number(it.cancelledQuantity) || 0)) > 0
        );
        const remainingSubtotal = activeItems.reduce((sum, it) => {
          const remQ = Number(it.quantity) - (Number(it.cancelledQuantity) || 0);
          return sum + (Number(it.price) * remQ);
        }, 0);
        const remainingDiscount = activeItems.reduce((sum, it) => {
          const remQ = Number(it.quantity) - (Number(it.cancelledQuantity) || 0);
          const unitDisc = (Number(it.discountShare) || 0) / (Number(it.quantity) || 1);
          return sum + (unitDisc * remQ);
        }, 0);

        claimedOrder.subtotal = Math.round(remainingSubtotal * 100) / 100;
        claimedOrder.discount = Math.round(remainingDiscount * 100) / 100;
        claimedOrder.totalAmount = Math.max(
          0,
          Math.round(
            (claimedOrder.subtotal - claimedOrder.discount + Number(claimedOrder.tax || 0) + Number(claimedOrder.shippingCharge || 0)) * 100
          ) / 100
        );
      }

      // Preserve snapshots
      if (claimedOrder.originalSubtotal == null && baseSubtotal != null) claimedOrder.originalSubtotal = baseSubtotal;
      if (claimedOrder.originalDiscount == null && baseDiscount != null) claimedOrder.originalDiscount = baseDiscount;
      if (claimedOrder.originalTotalAmount == null && orderBaseTotal != null) claimedOrder.originalTotalAmount = orderBaseTotal;

      await claimedOrder.save(session ? { session } : {});

      if (session) {
        await session.commitTransaction();
        session.endSession();
      }

      return res.status(200).json({
        success: true,
        message:
          totalBatchRefund > 0
            ? "Items cancelled successfully and refund added to wallet"
            : "Items cancelled successfully",
        refund:
          totalBatchRefund > 0
            ? {
                amount: totalBatchRefund,
                walletBalance: lastRefundResult?.wallet?.balance ?? null,
              }
            : null,
        order: claimedOrder,
      });
    } catch (innerError) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      } else {
        for (const entry of stockRestorations) {
          try {
            await Product.updateOne(
              { _id: entry.productId, "variants._id": entry.variantId },
              { $inc: { "variants.$.stock": -entry.quantity } }
            );
          } catch {
            // best effort rollback
          }
        }
        try {
          const revertInc = {};
          const revertFilters = [];
          preparedItems.forEach(({ orderItem, cancelQty }, idx) => {
            const filterName = `elem${idx}`;
            revertInc[`items.$[${filterName}].cancelledQuantity`] = -cancelQty;
            revertFilters.push({ [`${filterName}._id`]: orderItem._id });
          });
          await Order.updateOne(
            { _id: orderId },
            { $inc: revertInc },
            { arrayFilters: revertFilters }
          );
        } catch {
          // best effort rollback
        }
      }
      throw innerError;
    }
  } catch (error) {
    console.error("Cancel Order Items Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to cancel order items",
    });
  }
};

export const cancelUserOrderItem = async (req, res) => {
  const userId = req.user.userId;
  const { orderId, itemId } = req.params;
  const { cancellationReason = "", quantity } = req.body;

  return await executeOrderItemsCancellation({
    req,
    res,
    orderId,
    userId,
    itemsToCancel: [{ itemId, quantity }],
    cancellationReason,
  });
};

export const cancelUserOrderItems = async (req, res) => {
  const userId = req.user.userId;
  const { orderId } = req.params;
  const { cancellationReason = "", items = [] } = req.body;

  return await executeOrderItemsCancellation({
    req,
    res,
    orderId,
    userId,
    itemsToCancel: items,
    cancellationReason,
  });
};

// =========================================================
// RETURN USER ORDER
// =========================================================

export const returnUserOrder =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user.userId;

      const { orderId } =
        req.params;

      const {
        returnReason = "",
        items = [],
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const reason =
        String(
          returnReason
        ).trim();

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Return reason is required",
        });
      }

      const order =
        await Order.findOne({
          _id:
            orderId,
          userId,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      // =====================================================
      // RETURN ONLY AFTER DELIVERY
      // =====================================================

      if (
        order.status !==
        "delivered"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only delivered orders can be returned",
        });
      }

      // =====================================================
      // ONLY ONE RETURN REQUEST
      // =====================================================

      const currentReturnStatus =
        order.returnStatus ||
        "none";

      if (
        currentReturnStatus !==
        "none"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "A return request already exists for this order",
        });
      }

      // =====================================================
      // 3-DAY RETURN WINDOW
      // =====================================================

      const deliveredAt =
        order.deliveredAt ||
        order.updatedAt;

      if (!deliveredAt) {
        return res.status(400).json({
          success: false,
          message:
            "Delivery date is not available for this order",
        });
      }

      const deliveredDate =
        new Date(
          deliveredAt
        );

      if (
        Number.isNaN(
          deliveredDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid delivery date",
        });
      }

      const now =
        new Date();

      const differenceInMilliseconds =
        now.getTime() -
        deliveredDate.getTime();

      const differenceInDays =
        differenceInMilliseconds /
        (1000 * 60 * 60 * 24);

      if (
        differenceInDays >
        3
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return period has expired. Returns are allowed within 3 days of delivery.",
        });
      }

      // =====================================================
      // CREATE RETURN REQUEST (ITEM-LEVEL & FULL)
      // =====================================================

      if (Array.isArray(items) && items.length > 0) {
        for (const it of items) {
          if (!it.itemId || !mongoose.Types.ObjectId.isValid(it.itemId)) {
            return res.status(400).json({
              success: false,
              message: "Invalid return item ID",
            });
          }
          const orderItem = order.items.id(it.itemId);
          if (!orderItem) {
            return res.status(404).json({
              success: false,
              message: "Order item not found in this order",
            });
          }

          const totalQty = Number(orderItem.quantity) || 0;
          const cancelledQty = Number(orderItem.cancelledQuantity) || 0;
          const alreadyReturnedQty = Number(orderItem.returnedQuantity) || 0;
          const deliveredQty = Math.max(0, totalQty - cancelledQty - alreadyReturnedQty);

          if (deliveredQty <= 0 || (orderItem.itemStatus || "active") === "cancelled") {
            return res.status(400).json({
              success: false,
              message: `Item "${orderItem.productName}" has no delivered units available for return`,
            });
          }

          const reqQty = it.quantity !== undefined ? Number(it.quantity) : deliveredQty;
          if (!Number.isInteger(reqQty) || reqQty < 1 || reqQty > deliveredQty) {
            return res.status(400).json({
              success: false,
              message: `Invalid return quantity for "${orderItem.productName}". Requested: ${it.quantity}, Available: ${deliveredQty}`,
            });
          }

          orderItem.returnStatus = "pending";
          orderItem.returnReason = reason;
          orderItem.returnedQuantity = reqQty;
        }
      } else {
        // Full order return: mark all active delivered items
        let eligibleReturnItemsCount = 0;
        for (const item of order.items) {
          if ((item.itemStatus || "active") !== "cancelled") {
            const totalQty = Number(item.quantity) || 0;
            const cancelledQty = Number(item.cancelledQuantity) || 0;
            const alreadyReturnedQty = Number(item.returnedQuantity) || 0;
            const deliveredQty = Math.max(0, totalQty - cancelledQty - alreadyReturnedQty);
            if (deliveredQty > 0) {
              item.returnStatus = "pending";
              item.returnReason = reason;
              item.returnedQuantity = deliveredQty;
              eligibleReturnItemsCount++;
            }
          }
        }

        if (eligibleReturnItemsCount === 0) {
          return res.status(400).json({
            success: false,
            message: "No eligible delivered items found for return",
          });
        }
      }

      order.returnReason =
        reason;

      order.returnRequestedAt =
        now;

      order.returnStatus =
        "pending";

      await order.save();

      return res.status(200).json({
        success: true,
        message: "Return request submitted successfully",
        order: order.toObject ? order.toObject() : order,
      });
    } catch (error) {
      console.error(
        "Return User Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to submit return request",
      });
    }
  };

// =========================================================
// ADMIN — GET ALL ORDERS
// =========================================================

export const getAdminOrders =
  async (
    req,
    res
  ) => {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        status = "",
        paymentStatus = "",
        sort = "newest",
      } = req.query;

      const currentPage =
        Math.max(
          Number.parseInt(
            page,
            10
          ) || 1,
          1
        );

      const perPage =
        Math.min(
          Math.max(
            Number.parseInt(
              limit,
              10
            ) || 10,
            1
          ),
          100
        );

      const skip =
        (currentPage - 1) *
        perPage;

      const filter = {};

      // =====================================================
      // SEARCH
      // =====================================================

      const trimmedSearch =
        String(
          search || ""
        ).trim();

      if (trimmedSearch) {
        const searchRegex =
          new RegExp(
            trimmedSearch.replace(
              /[.*+?^${}()|[\]\\]/g,
              "\\$&"
            ),
            "i"
          );

        filter.$or = [
          {
            orderNumber:
              searchRegex,
          },

          {
            "shippingAddress.fullName":
              searchRegex,
          },

          {
            "shippingAddress.phone":
              searchRegex,
          },

          {
            "items.productName":
              searchRegex,
          },
        ];
      }

      // =====================================================
      // STATUS FILTER
      // =====================================================

      const allowedStatuses =
        [
          "placed",
          "confirmed",
          "shipped",
          "out_for_delivery",
          "delivered",
          "cancelled",
          "returned",
        ];

      if (
        status &&
        allowedStatuses.includes(
          status
        )
      ) {
        filter.status =
          status;
      }

      // =====================================================
      // PAYMENT STATUS FILTER
      // =====================================================

      const allowedPaymentStatuses =
        [
          "pending",
          "paid",
          "failed",
          "refunded",
        ];

      if (
        paymentStatus &&
        allowedPaymentStatuses.includes(
          paymentStatus
        )
      ) {
        filter.paymentStatus =
          paymentStatus;
      }

      // =====================================================
      // SORT
      // =====================================================

      let sortOption = {
        createdAt: -1,
      };

      if (
        sort ===
        "oldest"
      ) {
        sortOption = {
          createdAt: 1,
        };
      }

      if (
        sort ===
        "amount-high"
      ) {
        sortOption = {
          totalAmount: -1,
        };
      }

      if (
        sort ===
        "amount-low"
      ) {
        sortOption = {
          totalAmount: 1,
        };
      }

      // =====================================================
      // FETCH ORDERS + COUNT
      // =====================================================

      const [
        orders,
        totalOrders,
      ] = await Promise.all([
        Order.find(filter)
          .sort(
            sortOption
          )
          .skip(skip)
          .limit(perPage)
          .lean(),

        Order.countDocuments(
          filter
        ),
      ]);

      const totalPages =
        Math.ceil(
          totalOrders /
            perPage
        );

      return res.status(200).json({
        success: true,

        orders,

        pagination: {
          currentPage,

          totalPages,

          totalOrders,

          limit:
            perPage,
        },
      });
    } catch (error) {
      console.error(
        "Get Admin Orders Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch admin orders",
      });
    }
  };

// =========================================================
// ADMIN — GET SINGLE ORDER
// =========================================================

export const getAdminOrderById =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          orderId
        ).lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      return res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      console.error(
        "Get Admin Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch order",
      });
    }
  };

// =========================================================
// ADMIN — UPDATE ORDER STATUS
// =========================================================

export const updateAdminOrderStatus =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      const {
        status,
      } = req.body;

      // =====================================================
      // VALIDATE ORDER ID
      // =====================================================

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      // =====================================================
      // VALIDATE STATUS
      // =====================================================

      const allowedStatuses =
        [
          "placed",
          "confirmed",
          "shipped",
          "out_for_delivery",
          "delivered",
          "cancelled",
          "returned",
        ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status",
        });
      }

      // =====================================================
      // FIND ORDER
      // =====================================================

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      // =====================================================
      // STRICT FORWARD-ONLY ORDER FLOW
      // =====================================================
      //
      // placed
      //   ├── confirmed
      //   └── cancelled
      //
      // confirmed
      //   ├── shipped
      //   └── cancelled
      //
      // shipped
      //   └── out_for_delivery
      //
      // out_for_delivery
      //   └── delivered
      //
      // delivered / cancelled / returned
      //   └── no further admin status changes
      //
      // =====================================================

      const nextStatuses = {
        placed: [
          "confirmed",
          "cancelled",
        ],

        confirmed: [
          "shipped",
          "cancelled",
        ],

        shipped: [
          "out_for_delivery",
        ],

        out_for_delivery: [
          "delivered",
        ],

        delivered: [],

        cancelled: [],

        returned: [],
      };

      const currentStatus =
        order.status;

      const allowedNextStatuses =
        nextStatuses[
          currentStatus
        ] || [];

      if (
        !allowedNextStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid order status transition: ${currentStatus.replace(
              /_/g,
              " "
            )} → ${status.replace(
              /_/g,
              " "
            )}.`,
        });
      }

      // =====================================================
      // ADMIN CANCELLATION
      // =====================================================

      if (status === "cancelled") {
        const cancellationReason =
          req.body.cancellationReason ||
          order.cancellationReason ||
          "Cancelled by admin";
        const cancelledAt = new Date();

        // Atomically claim the cancellation to prevent concurrent double-restock
        const claimedOrder = await Order.findOneAndUpdate(
          {
            _id: orderId,
            status: { $in: ["placed", "confirmed"] },
          },
          {
            $set: {
              status: "cancelled",
              cancellationReason,
              cancellationSource: "admin",
              cancelledAt,
            },
          },
          { returnDocument: "after" }
        );

        if (!claimedOrder) {
          const freshOrder = await Order.findById(orderId);
          const freshStatus = freshOrder ? freshOrder.status : currentStatus;
          return res.status(400).json({
            success: false,
            message: `Invalid order status transition: ${freshStatus.replace(
              /_/g,
              " "
            )} → cancelled.`,
          });
        }

        // 1. RESTORE STOCK FOR ELIGIBLE ACTIVE QUANTITIES
        // Never restores stock for items/quantities already cancelled or returned
        const activeItems = claimedOrder.items.filter(
          (item) => (item.itemStatus || "active") === "active"
        );

        for (const item of activeItems) {
          if (!item.productId || !item.variantId) {
            continue;
          }

          const restoreQty =
            (Number(item.quantity) || 0) -
            (Number(item.cancelledQuantity) || 0);

          if (restoreQty > 0) {
            await Product.updateOne(
              {
                _id: item.productId,
                isDeleted: false,
                "variants._id": item.variantId,
              },
              {
                $inc: {
                  "variants.$.stock": restoreQty,
                },
              }
            );
          }
        }

        // 2. REFUND PAID ORDER (EXCLUDING EXPRESS DELIVERY FEE)
        const isPaidOnline =
          claimedOrder.paymentStatus === "paid" &&
          (claimedOrder.paymentMethod === "razorpay" ||
            claimedOrder.paymentMethod === "wallet");

        const isExpress = claimedOrder.deliveryMethod === "express";
        const expressCharge = isExpress
          ? Number(claimedOrder.shippingCharge) || 0
          : 0;

        const orderBaseTotal =
          Number(
            claimedOrder.originalTotalAmount != null
              ? claimedOrder.originalTotalAmount
              : claimedOrder.totalAmount
          ) || 0;

        const maxOrderRefund = Math.max(0, orderBaseTotal - expressCharge);

        const alreadyRefunded =
          Number(claimedOrder.totalRefundedAmount) ||
          claimedOrder.items.reduce(
            (sum, it) => sum + (Number(it.refundedAmount) || 0),
            0
          );

        const refundableAmount = isPaidOnline
          ? Math.max(
              0,
              Math.round((maxOrderRefund - alreadyRefunded) * 100) / 100
            )
          : 0;

        let refundResult = null;

        if (isPaidOnline && refundableAmount > 0) {
          refundResult = await creditWallet({
            userId: claimedOrder.userId,
            amount: refundableAmount,
            reason: "order_cancellation_refund",
            description: `Refund for admin-cancelled order ${claimedOrder.orderNumber}`,
            orderId: claimedOrder._id,
            orderNumber: claimedOrder.orderNumber,
          });

          claimedOrder.paymentStatus = "refunded";
        }

        // 3. MARK ITEMS AS CANCELLED
        const activeSubtotal = activeItems.reduce(
          (sum, it) => sum + (Number(it.totalPrice) || 0),
          0
        );

        claimedOrder.items.forEach((item) => {
          if ((item.itemStatus || "active") === "active") {
            item.itemStatus = "cancelled";
            item.cancelledQuantity = Number(item.quantity || 0);
            item.cancellationReason = cancellationReason;
            item.cancellationSource = "admin";
            item.cancelledAt = cancelledAt;

            if (refundResult && refundableAmount > 0) {
              item.refundStatus = "refunded";

              if (activeSubtotal > 0) {
                const itemShare =
                  (Number(item.totalPrice) || 0) / activeSubtotal;
                item.refundedAmount =
                  Math.round(itemShare * refundableAmount * 100) / 100;
              } else {
                item.refundedAmount = 0;
              }
            }
          }
        });

        if (refundResult && refundableAmount > 0) {
          claimedOrder.totalRefundedAmount =
            (Number(claimedOrder.totalRefundedAmount) || 0) + refundableAmount;
        }

        // Preserve original financial values
        if (
          claimedOrder.originalSubtotal == null &&
          claimedOrder.subtotal != null
        ) {
          claimedOrder.originalSubtotal = claimedOrder.subtotal;
        }
        if (
          claimedOrder.originalDiscount == null &&
          claimedOrder.discount != null
        ) {
          claimedOrder.originalDiscount = claimedOrder.discount;
        }
        if (
          claimedOrder.originalTotalAmount == null &&
          claimedOrder.totalAmount != null
        ) {
          claimedOrder.originalTotalAmount = claimedOrder.totalAmount;
        }

        await claimedOrder.save();

        return res.status(200).json({
          success: true,
          message: "Order status updated successfully",
          order: claimedOrder,
        });
      }

      // =====================================================
      // NON-CANCELLED STATUS TRANSITIONS
      // =====================================================

      order.status = status;

      if (status === "delivered") {
        order.deliveredAt = new Date();

        // COD is considered paid when delivery is completed.
        if (order.paymentMethod === "cod") {
          order.paymentStatus = "paid";
        }
      }

      if (
        status === "delivered" &&
        (order.paymentMethod === "razorpay" || order.paymentMethod === "wallet")
      ) {
        order.paymentStatus = "paid";
      }

      await order.save();

      // Trigger automatic referral completion check if customer was referred
      if (status === "delivered") {
        try {
          await processReferralCompletion({ referredUserId: order.userId });
        } catch (referralErr) {
          console.warn("Automatic referral completion failed:", referralErr.message);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Order status updated successfully",
        order,
      });
    } catch (error) {
      console.error(
        "Update Admin Order Status Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update order status",
      });
    }
  };

// =========================================================
// ADMIN — APPROVE RETURN REQUEST
// =========================================================

export const approveReturnRequest =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      // Return request can only belong to a delivered order.
      if (
        order.status !==
        "delivered"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only delivered orders can have a return request",
        });
      }

      // Admin can approve ONLY while request is pending.
      if (
        order.returnStatus !==
        "pending"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No pending return request found for this order",
        });
      }

      order.returnStatus =
        "approved";

      order.returnApprovedAt =
        new Date();

      order.items.forEach((it) => {
        if (it.returnStatus === "pending") {
          it.returnStatus = "approved";
        }
      });

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Return request approved successfully",
        order,
      });
    } catch (error) {
      console.error(
        "Approve Return Request Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to approve return request",
      });
    }
  };

// =========================================================
// ADMIN — REJECT RETURN REQUEST
// =========================================================

export const rejectReturnRequest =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      const {
        rejectionReason = "",
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const reason =
        String(
          rejectionReason
        ).trim();

      if (!reason) {
        return res.status(400).json({
          success: false,
          message:
            "Return rejection reason is required",
        });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      // Admin can reject ONLY while request is pending.
      // Once approved/pickup starts, reject is impossible.
      if (
        order.returnStatus !==
        "pending"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No pending return request found for this order",
        });
      }

      order.returnStatus =
        "rejected";

      order.returnRejectedAt =
        new Date();

      order.returnRejectionReason =
        reason;

      order.items.forEach((it) => {
        if (it.returnStatus === "pending") {
          it.returnStatus = "rejected";
          it.returnedQuantity = 0;
        }
      });

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Return request rejected successfully",
        order,
      });
    } catch (error) {
      console.error(
        "Reject Return Request Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to reject return request",
      });
    }
  };

// =========================================================
// ADMIN — MARK RETURN COLLECTION PENDING
// =========================================================

export const markReturnCollectionPending =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      // Pickup can start only after admin approval.
      if (
        order.returnStatus !==
        "approved"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return request must be approved before collection",
        });
      }

      order.returnStatus =
        "collection_pending";

      order.returnCollectionRequestedAt =
        new Date();

      order.items.forEach((it) => {
        if (it.returnStatus === "approved") {
          it.returnStatus = "collection_pending";
        }
      });

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Return collection marked as pending",
        order,
      });
    } catch (error) {
      console.error(
        "Mark Return Collection Pending Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update return collection status",
      });
    }
  };
// =========================================================
// ADMIN — MARK RETURN COLLECTED / PICKED UP
// =========================================================

export const markReturnCollected =
  async (
    req,
    res
  ) => {
    try {
      const { orderId } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          orderId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      const order =
        await Order.findById(
          orderId
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      // =====================================================
      // ONLY COLLECTION_PENDING CAN BE COLLECTED
      // =====================================================

      if (
        order.returnStatus !==
        "collection_pending"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return collection is not pending",
        });
      }

      // =====================================================
      // FIND ONLY ELIGIBLE RETURN ITEMS
      // =====================================================
      //
      // Cancelled items are NOT returned.
      // Already refunded items are NOT returned again.
      //
      // Example:
      //
      // Product A
      // ₹1000
      // cancelled + refunded
      //
      // Product B
      // ₹1500
      // active
      //
      // RETURN REFUND = ₹1500
      // NOT ₹2500
      // =====================================================

      const returnItems = order.items.filter((item) => {
        const itemStatus = item.itemStatus || "active";
        const refundStatus = item.refundStatus || "none";
        const isTarget =
          item.returnStatus === "collection_pending" ||
          item.returnStatus === "approved" ||
          (Number(item.returnedQuantity) || 0) > 0;

        return itemStatus === "active" && refundStatus !== "refunded" && isTarget;
      });

      const targetItems =
        returnItems.length > 0
          ? returnItems
          : order.items.filter(
              (item) =>
                (item.itemStatus || "active") === "active" &&
                (item.refundStatus || "none") !== "refunded"
            );

      if (targetItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No eligible items are available for return",
        });
      }

      // =====================================================
      // CALCULATE RETURN REFUND (EXCLUDING EXPRESS DELIVERY FEE)
      // =====================================================

      const isExpress = order.deliveryMethod === "express";
      const expressCharge = isExpress ? (Number(order.shippingCharge) || 149) : 0;
      const orderBaseTotal = Number(
        order.originalTotalAmount != null ? order.originalTotalAmount : order.totalAmount
      ) || 0;

      const maxOrderRefund = Math.max(0, orderBaseTotal - expressCharge);
      const totalAlreadyRefunded = Number(order.totalRefundedAmount) || 0;
      let remainingRefundBudget = Math.max(0, Math.round((maxOrderRefund - totalAlreadyRefunded) * 100) / 100);

      const baseSubtotal = Number(
        order.originalSubtotal != null ? order.originalSubtotal : order.subtotal
      ) || 0;
      const baseDiscount = Number(
        order.originalDiscount != null ? order.originalDiscount : order.discount
      ) || 0;

      let returnRefundAmount = 0;
      const itemRefundMap = new Map();

      for (const item of targetItems) {
        const totalQty = Number(item.quantity) || 1;
        const returnQty = (Number(item.returnedQuantity) || 0) > 0 ? Number(item.returnedQuantity) : totalQty;
        const itemGross = Math.round(Number(item.price) * returnQty * 100) / 100;

        let allocatedDiscount = 0;
        if (item.discountShare != null && Number(item.discountShare) > 0) {
          const unitDiscount = Number(item.discountShare) / totalQty;
          allocatedDiscount = Math.round(unitDiscount * returnQty * 100) / 100;
        } else if (baseDiscount > 0 && baseSubtotal > 0) {
          const itemTotal = Number(item.totalPrice) || (Number(item.price) * totalQty);
          const itemDiscountShare = (itemTotal / baseSubtotal) * baseDiscount;
          const unitDiscount = itemDiscountShare / totalQty;
          allocatedDiscount = Math.round(unitDiscount * returnQty * 100) / 100;
        }

        const calculatedRefund = Math.max(0, Math.round((itemGross - allocatedDiscount) * 100) / 100);
        const itemRefund = Math.min(calculatedRefund, remainingRefundBudget);
        remainingRefundBudget = Math.max(0, Math.round((remainingRefundBudget - itemRefund) * 100) / 100);
        returnRefundAmount = Math.round((returnRefundAmount + itemRefund) * 100) / 100;
        itemRefundMap.set(item._id.toString(), itemRefund);
      }

      // =====================================================
      // MARK RETURN AS COLLECTED
      // =====================================================

      order.returnStatus = "collected";
      order.returnCollectedAt = new Date();

      targetItems.forEach((item) => {
        item.returnStatus = "collected";
      });

      // =====================================================
      // REFUND ONLY AFTER PICKUP (PAID ONLINE OR DELIVERED COD)
      // =====================================================

      let refundResult = null;

      if (
        (order.paymentStatus === "paid" || order.paymentMethod === "cod") &&
        returnRefundAmount > 0
      ) {
        refundResult = await creditWallet({
          userId: order.userId,
          amount: returnRefundAmount,
          reason: "order_return_refund",
          description: `Refund for returned items from order ${order.orderNumber}`,
          orderId: order._id,
          refundOperationId: `return_${order._id}`,
          orderNumber: order.orderNumber,
        });

        targetItems.forEach((item) => {
          const itemRefund = itemRefundMap.get(item._id.toString()) || 0;
          item.refundStatus = "refunded";
          item.refundedAmount = Math.round(((Number(item.refundedAmount) || 0) + itemRefund) * 100) / 100;
        });

        order.totalRefundedAmount = Math.round(
          ((Number(order.totalRefundedAmount) || 0) + returnRefundAmount) * 100
        ) / 100;

        const hasUnrefundedItems = order.items.some((item) => {
          const itemStatus = item.itemStatus || "active";
          const refundStatus = item.refundStatus || "none";
          return itemStatus === "active" && refundStatus !== "refunded";
        });

        if (!hasUnrefundedItems) {
          order.paymentStatus = "refunded";
        }
      }

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          refundResult
            ? "Return collected and refund added to wallet"
            : "Return collected successfully",
        refund:
          refundResult
            ? {
                amount: returnRefundAmount,
                walletBalance: refundResult.wallet?.balance ?? null,
              }
            : null,
        order,
      });
    } catch (error) {
      console.error("Mark Return Collected Error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to mark return as collected",
      });
    }
  };

// =========================================================
// ADMIN — COMPLETE RETURN
// =========================================================

export const completeReturn = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.returnStatus !== "collected") {
      return res.status(400).json({
        success: false,
        message: "Return must be collected before completion",
      });
    }

    // =====================================================
    // RESTORE STOCK ONLY FOR RETURNED QUANTITIES
    // Never restock cancelled items or previously restocked items!
    // =====================================================

    for (const item of order.items) {
      if (!item.productId || !item.variantId) {
        continue;
      }
      if ((item.itemStatus || "active") === "cancelled") {
        continue;
      }

      const restoreQty =
        (Number(item.returnedQuantity) || 0) > 0
          ? Number(item.returnedQuantity)
          : (item.returnStatus === "collected" ? Number(item.quantity || 0) : 0);

      if (restoreQty > 0) {
        await Product.updateOne(
          {
            _id: item.productId,
            isDeleted: false,
            "variants._id": item.variantId,
          },
          {
            $inc: { "variants.$.stock": restoreQty },
          }
        );
      }
    }

    order.items.forEach((it) => {
      if (it.returnStatus === "collected" || (Number(it.returnedQuantity) || 0) > 0) {
        it.returnStatus = "completed";
      }
    });

    order.returnStatus = "completed";
    order.returnedAt = new Date();

    const allItemsReturnedOrCancelled = order.items.every(
      (it) =>
        (it.itemStatus || "active") === "cancelled" ||
        it.returnStatus === "completed"
    );

    if (allItemsReturnedOrCancelled) {
      order.status = "returned";
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Return completed successfully",
      order,
    });
    } catch (error) {
      console.error(
        "Complete Return Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to complete return",
      });
    }
  };

  // =========================================================
// ADMIN — GET ALL RETURN REQUESTS
// =========================================================

export const getAdminReturns = async (
  req,
  res
) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status = "",
      sort = "newest",
    } = req.query;

    const currentPage = Math.max(
      Number.parseInt(page, 10) || 1,
      1
    );

    const perPage = Math.min(
      Math.max(
        Number.parseInt(limit, 10) || 10,
        1
      ),
      100
    );

    const skip =
      (currentPage - 1) * perPage;

    // =======================================================
    // BASE FILTER
    // =======================================================

    const filter = {
      returnStatus: {
        $nin: ["none", null],
      },
    };

    // =======================================================
    // RETURN STATUS FILTER
    // =======================================================

    const allowedReturnStatuses = [
      "pending",
      "approved",
      "rejected",
      "collection_pending",
      "collected",
      "completed",
    ];

    if (
      status &&
      status !== "all" &&
      allowedReturnStatuses.includes(status)
    ) {
      filter.returnStatus = status;
    }

    // =======================================================
    // SEARCH
    // =======================================================

    const trimmedSearch =
      String(search || "").trim();

    if (trimmedSearch) {
      const searchRegex = new RegExp(
        trimmedSearch.replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        ),
        "i"
      );

      filter.$or = [
        {
          orderNumber: searchRegex,
        },
        {
          "shippingAddress.fullName":
            searchRegex,
        },
        {
          "shippingAddress.phone":
            searchRegex,
        },
        {
          returnReason: searchRegex,
        },
        {
          "items.productName":
            searchRegex,
        },
      ];
    }

    // =======================================================
    // SORT
    // =======================================================

    const sortOption =
      sort === "oldest"
        ? {
            returnRequestedAt: 1,
            createdAt: 1,
          }
        : {
            returnRequestedAt: -1,
            createdAt: -1,
          };

    // =======================================================
    // FETCH RETURNS + COUNT
    // =======================================================

    const [
      orders,
      totalReturns,
    ] = await Promise.all([
      Order.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(perPage)
        .lean(),

      Order.countDocuments(filter),
    ]);

    // =======================================================
    // PAGINATION
    // =======================================================

    const totalPages =
      Math.ceil(
        totalReturns / perPage
      );

    // =======================================================
    // FORMAT RESPONSE
    // =======================================================

    const returns = orders.map(
      (order) => ({
        _id: order._id,

        orderNumber:
          order.orderNumber,

        userId:
          order.userId,

        customer: {
          name:
            order.shippingAddress
              ?.fullName ||
            "Unknown Customer",

          phone:
            order.shippingAddress
              ?.phone ||
            "—",
        },

        items:
          order.items || [],

        totalAmount:
          order.totalAmount || 0,

        paymentMethod:
          order.paymentMethod || "",

        paymentStatus:
          order.paymentStatus || "",

        orderStatus:
          order.status || "",

        returnStatus:
          order.returnStatus || "none",

        returnReason:
          order.returnReason || "",

        returnRequestedAt:
          order.returnRequestedAt ||
          null,

        returnApprovedAt:
          order.returnApprovedAt ||
          null,

        returnRejectedAt:
          order.returnRejectedAt ||
          null,

        returnRejectionReason:
          order.returnRejectionReason ||
          "",

        returnCollectionRequestedAt:
          order.returnCollectionRequestedAt ||
          null,

        returnCollectedAt:
          order.returnCollectedAt ||
          null,

        returnedAt:
          order.returnedAt ||
          null,

        createdAt:
          order.createdAt,

        updatedAt:
          order.updatedAt,
      })
    );

    // =======================================================
    // RESPONSE
    // =======================================================

    return res.status(200).json({
      success: true,

      returns,

      pagination: {
        currentPage,

        totalPages,

        totalReturns,

        limit:
          perPage,
      },
    });
  } catch (error) {
    console.error(
      "Get Admin Returns Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch return requests",
    });
  }
};