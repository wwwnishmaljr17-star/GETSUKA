import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import razorpay from "../../../config/razorpay.js";
import Payment from "../models/Payment.js";
import Order from "../../order/models/Order.js";
import Product from "../../product/models/Product.js";
import Coupon from "../../coupon/models/Coupon.js";
import Address from "../../address/models/Address.js";
import { executeOrderPlacement } from "../../order/controllers/orderController.js";
import { creditWallet } from "../../wallet/controllers/walletController.js";

// =========================================================
// HELPER: EXTRACT USER ID SAFELY
// =========================================================

const extractUserId = (req) => {
  if (req.user?.userId) {
    return req.user.userId;
  }

  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.userId) {
        return decoded.userId;
      }
    } catch {
      // Ignored: Token might be expired or invalid
    }
  }

  return null;
};

// =========================================================
// CREATE RAZORPAY ORDER
// =========================================================

export const createRazorpayOrder = async (req, res) => {
  try {
    const userId = extractUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const orderData =
      req.body.orderData && typeof req.body.orderData === "object"
        ? req.body.orderData
        : req.body;

    const rawItems = orderData?.items || req.body?.items;

    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order must contain at least one item",
      });
    }

    // Validate product IDs
    const productIds = rawItems.map((item) => item?.productId);
    for (const pid of productIds) {
      if (!pid || !mongoose.Types.ObjectId.isValid(pid)) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID",
        });
      }
    }

    const uniqueProductIds = [...new Set(productIds.map((id) => String(id)))];

    // Load active, non-deleted products from database
    const products = await Product.find({
      _id: { $in: uniqueProductIds },
      isDeleted: false,
      isListed: true,
    });

    if (products.length !== uniqueProductIds.length) {
      return res.status(400).json({
        success: false,
        message: "One or more products are unavailable",
      });
    }

    const productMap = new Map();
    products.forEach((product) => {
      productMap.set(String(product._id), product);
    });

    // Validate quantities & consolidate variant stock requirements
    const variantQuantities = new Map();
    for (const item of rawItems) {
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

    let subtotal = 0;
    const validatedItems = [];

    for (const item of rawItems) {
      const { productId, variantId, quantity } = item || {};

      if (!productId || !variantId) {
        return res.status(400).json({
          success: false,
          message: "Product and variant are required",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(variantId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid variant ID",
        });
      }

      const requestedQuantity = Number(quantity);
      if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid product quantity",
        });
      }

      const product = productMap.get(String(productId));
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      const variant = product.variants.id(variantId);
      if (!variant) {
        return res.status(404).json({
          success: false,
          message: `Variant not found for ${product.name}`,
        });
      }

      const totalRequested =
        variantQuantities.get(String(variantId))?.quantity || requestedQuantity;

      if (variant.stock < totalRequested) {
        return res.status(400).json({
          success: false,
          message: `${product.name} (${variant.color} / ${variant.size}) has only ${variant.stock} item(s) available`,
        });
      }

      // Derived strictly from trusted database price (salePrice if active, else price)
      const itemPrice =
        product.salePrice !== null && product.salePrice !== undefined
          ? product.salePrice
          : product.price;

      const itemTotal = itemPrice * requestedQuantity;
      subtotal += itemTotal;

      validatedItems.push({
        productId: product._id,
        variantId: variant._id,
        productName: product.name,
        productImage: product.images?.[0] || "",
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        quantity: requestedQuantity,
        price: itemPrice,
        totalPrice: itemTotal,
      });
    }

    // Shipping charge calculation
    const deliveryMethod =
      orderData.deliveryMethod || req.body.deliveryMethod || "standard";
    const allowedDeliveryMethods = ["standard", "express"];
    if (!allowedDeliveryMethods.includes(deliveryMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery method",
      });
    }
    const shippingCharge = deliveryMethod === "express" ? 149 : 0;

    // Coupon discount verification from database
    let discount = 0;
    let appliedCouponCode = "";
    const rawCoupon = orderData.couponCode || req.body.couponCode || "";
    const normalizedCouponCode =
      typeof rawCoupon === "string" ? rawCoupon.trim().toUpperCase() : "";

    if (normalizedCouponCode) {
      const coupon = await Coupon.findOne({
        code: normalizedCouponCode,
      });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: "Invalid coupon code",
        });
      }

      if (!coupon.isActive) {
        return res.status(400).json({
          success: false,
          message: "This coupon is inactive",
        });
      }

      const now = new Date();
      if (now < coupon.validFrom) {
        return res.status(400).json({
          success: false,
          message: "This coupon is not active yet",
        });
      }

      if (now > coupon.validUntil) {
        return res.status(400).json({
          success: false,
          message: "This coupon has expired",
        });
      }

      if (
        coupon.usageLimit !== null &&
        coupon.usedCount >= coupon.usageLimit
      ) {
        return res.status(400).json({
          success: false,
          message: "This coupon usage limit has been reached",
        });
      }

      if (coupon.oneUsePerUser && userId) {
        const previousCouponOrder = await Order.exists({
          userId,
          couponCode: normalizedCouponCode,
        });

        if (previousCouponOrder) {
          return res.status(400).json({
            success: false,
            message: "You have already used this coupon",
          });
        }
      }

      if (subtotal < coupon.minOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `Minimum order amount is ₹${coupon.minOrderAmount}`,
        });
      }

      if (coupon.discountType === "percentage") {
        discount = (subtotal * coupon.discountValue) / 100;
        if (
          coupon.maxDiscountAmount !== null &&
          discount > coupon.maxDiscountAmount
        ) {
          discount = coupon.maxDiscountAmount;
        }
      } else if (coupon.discountType === "fixed") {
        discount = coupon.discountValue;
      }

      discount = Math.min(discount, subtotal);
      discount = Math.round(discount * 100) / 100;
      appliedCouponCode = normalizedCouponCode;
    }

    const tax = 0;
    const computedTotal = subtotal - discount + tax + shippingCharge;
    const normalizedAmount = Math.round(computedTotal * 100) / 100;

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Calculated payable amount must be greater than zero",
      });
    }

    // Convert to smallest currency unit (paise)
    const razorpayAmount = Math.round(normalizedAmount * 100);

    const addressId = orderData.addressId || req.body.addressId || null;
    if (addressId && mongoose.Types.ObjectId.isValid(addressId) && userId) {
      const address = await Address.findById(addressId);
      if (address && String(address.userId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: Delivery address belongs to another user",
        });
      }
    }

    const options = {
      amount: razorpayAmount,
      currency: "INR",
      receipt: `getsuka_${Date.now()}`,
      notes: {
        type: "order_checkout",
        ...(userId ? { userId: String(userId) } : {}),
      },
    };

    const order = await razorpay.orders.create(options);

    // Save initial Payment record for webhook reconciliation & recovery
    try {
      const sanitizedOrderData = {
        userId: userId || null,
        addressId: addressId || null,
        shippingAddress: orderData.shippingAddress || null,
        items: validatedItems,
        deliveryMethod,
        couponCode: appliedCouponCode,
        subtotal,
        discount,
        tax,
        shippingCharge,
        total: normalizedAmount,
      };

      await Payment.create({
        userId: userId || null,
        razorpayOrderId: order.id,
        amount: normalizedAmount,
        currency: "INR",
        status: "created",
        paymentType: "order_checkout",
        orderData: sanitizedOrderData,
      });
    } catch (savePaymentErr) {
      console.error("Save Payment Intent Error:", savePaymentErr);
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Create Razorpay Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
    });
  }
};

// =========================================================
// VERIFY RAZORPAY PAYMENT
// =========================================================

export const verifyRazorpayPayment = async (req, res) => {
  try {
    // 1. Authenticated user ID extraction (derived once)
    const authUserId = req.user?.userId || req.user?.id || req.user?._id?.toString();
    if (!authUserId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // 2. Validate request fields before trimming
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !razorpay_order_id.trim() ||
      !razorpay_payment_id.trim() ||
      !razorpay_signature.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification details are missing or invalid",
      });
    }

    const orderId = razorpay_order_id.trim();
    const paymentId = razorpay_payment_id.trim();
    const signature = razorpay_signature.trim();

    // 3. Find Payment record & enforce user ownership
    const payment = await Payment.findOne({
      razorpayOrderId: orderId,
      userId: authUserId,
    });

    if (!payment) {
      const anyUserPayment = await Payment.findOne({ razorpayOrderId: orderId });
      if (anyUserPayment) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: This payment does not belong to your account",
        });
      }

      return res.status(404).json({
        success: false,
        message: "Payment order not found",
      });
    }

    // 4. Reject payments already marked failed or refunded
    if (payment.status === "failed" || payment.status === "refunded") {
      return res.status(400).json({
        success: false,
        message: `Payment cannot be verified because it is already marked as ${payment.status}`,
      });
    }

    // 5. Handle repeated verification safely: if already captured with the same payment ID, return idempotent success
    if (payment.status === "captured") {
      if (payment.razorpayPaymentId === paymentId) {
        return res.status(200).json({
          success: true,
          message: "Payment verified successfully",
          alreadyVerified: true,
          payment: {
            razorpayOrderId: payment.razorpayOrderId,
            razorpayPaymentId: payment.razorpayPaymentId,
          },
        });
      }

      // Do not allow a different Razorpay payment ID to overwrite an already captured payment
      return res.status(409).json({
        success: false,
        message: "Payment has already been captured with a different payment ID",
      });
    }

    // 6. Cryptographic HMAC SHA-256 signature verification with timing-safe comparison
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isSignatureValid =
      generatedSignature.length === signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(generatedSignature, "utf-8"),
        Buffer.from(signature, "utf-8")
      );

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // 7. Conditional atomic database update to capture payment
    // Matches authenticated user ID directly to ensure ownership cannot be bypassed
    const capturedPayment = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        userId: authUserId,
        razorpayOrderId: orderId,
        status: { $in: ["created", "authorized"] },
      },
      {
        $set: {
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          status: "captured",
        },
      },
      {
        returnDocument: "after",
      }
    );

    // 8. Handle concurrency race: If capturedPayment is null, another request changed the document status
    if (!capturedPayment) {
      // Require both razorpayOrderId and authenticated user ID in fallback check
      const latestPayment = await Payment.findOne({
        razorpayOrderId: orderId,
        userId: authUserId,
      });

      if (!latestPayment) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: This payment does not belong to your account",
        });
      }

      // If another request captured with the EXACT SAME payment ID, return idempotent success
      if (
        latestPayment.status === "captured" &&
        latestPayment.razorpayPaymentId === paymentId
      ) {
        return res.status(200).json({
          success: true,
          message: "Payment verified successfully",
          alreadyVerified: true,
          payment: {
            razorpayOrderId: latestPayment.razorpayOrderId,
            razorpayPaymentId: latestPayment.razorpayPaymentId,
          },
        });
      }

      // Otherwise, it was captured with a different payment ID or marked failed/refunded
      return res.status(409).json({
        success: false,
        message:
          latestPayment.status === "captured"
            ? "Payment has already been captured with a different payment ID"
            : `Payment verification conflict: Payment status is ${latestPayment.status || "unavailable"}`,
      });
    }

    // 9. Return success response (frontend contract unchanged)
    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        razorpayOrderId: capturedPayment.razorpayOrderId,
        razorpayPaymentId: capturedPayment.razorpayPaymentId,
      },
    });
  } catch (error) {
    console.error("Verify Razorpay Payment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to verify payment",
    });
  }
};

// =========================================================
// CREATE WALLET TOP-UP RAZORPAY ORDER
// =========================================================

export const createWalletTopupOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const topupAmount = Number(amount);

    if (!Number.isFinite(topupAmount) || topupAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid wallet top-up amount is required",
      });
    }

    if (topupAmount > 50000) {
      return res.status(400).json({
        success: false,
        message: "Maximum wallet top-up limit per transaction is ₹50,000",
      });
    }

    const normalizedAmount = Math.round(topupAmount * 100) / 100;
    const razorpayAmount = Math.round(normalizedAmount * 100);

    const order = await razorpay.orders.create({
      amount: razorpayAmount,
      currency: "INR",
      receipt: `getsuka_wallet_${Date.now()}`,
      notes: {
        type: "wallet_topup",
        userId: String(req.user.userId),
        amount: String(normalizedAmount),
      },
    });

    try {
      await Payment.create({
        userId: req.user.userId,
        razorpayOrderId: order.id,
        amount: normalizedAmount,
        currency: "INR",
        status: "created",
        paymentType: "wallet_topup",
      });
    } catch (saveTopupErr) {
      console.error("Save Wallet Top-Up Payment Intent Error:", saveTopupErr);
    }

    return res.status(200).json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
    });
  } catch (error) {
    console.error("Create Wallet Top-Up Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create wallet top-up order",
    });
  }
};

// =========================================================
// VERIFY WALLET TOP-UP PAYMENT
// =========================================================

export const verifyWalletTopupPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !razorpay_order_id.trim() ||
      !razorpay_payment_id.trim() ||
      !razorpay_signature.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Wallet payment verification details are missing or invalid",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isSignatureValid =
      generatedSignature.length === razorpay_signature.length &&
      crypto.timingSafeEqual(
        Buffer.from(generatedSignature, "utf-8"),
        Buffer.from(razorpay_signature, "utf-8")
      );

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: "Wallet payment verification failed",
      });
    }

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);

    if (!razorpayOrder || razorpayOrder.id !== razorpay_order_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay wallet order",
      });
    }

    if (razorpayOrder.notes?.type !== "wallet_topup") {
      return res.status(400).json({
        success: false,
        message: "This Razorpay order is not a wallet top-up",
      });
    }

    if (razorpayOrder.notes?.userId !== String(req.user.userId)) {
      return res.status(403).json({
        success: false,
        message: "This wallet payment does not belong to this user",
      });
    }

    const topupAmount = Number(razorpayOrder.amount) / 100;

    if (!Number.isFinite(topupAmount) || topupAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid wallet top-up amount",
      });
    }

    const walletResult = await creditWallet({
      userId: req.user.userId,
      amount: topupAmount,
      reason: "wallet_topup",
      description: "Wallet money added through Razorpay",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    try {
      await Payment.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          $set: {
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            status: "captured",
          },
        }
      );
    } catch (updatePaymentErr) {
      console.error("Update Topup Payment Status Error:", updatePaymentErr);
    }

    return res.status(200).json({
      success: true,
      message: walletResult.alreadyCredited
        ? "Wallet top-up was already credited"
        : "Wallet topped up successfully",
      alreadyCredited: walletResult.alreadyCredited,
      wallet: {
        balance: walletResult.wallet.balance,
      },
      transaction: walletResult.transaction,
    });
  } catch (error) {
    console.error("Verify Wallet Top-Up Payment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to complete wallet top-up",
    });
  }
};

// =========================================================
// RAZORPAY WEBHOOK HANDLER (SERVER-TO-SERVER IDEMPOTENT)
// =========================================================

export const handleRazorpayWebhook = async (req, res) => {
  try {
    // -----------------------------------------------------
    // 1. SIGNATURE VERIFICATION
    // -----------------------------------------------------

    const webhookSignature = req.headers["x-razorpay-signature"];

    if (!webhookSignature) {
      return res.status(400).json({
        success: false,
        message: "Missing Razorpay webhook signature",
      });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET is not configured");
      return res.status(500).json({
        success: false,
        message: "Webhook secret is not configured",
      });
    }

    const rawPayload = req.rawBody
      ? req.rawBody
      : typeof req.body === "string"
      ? req.body
      : JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawPayload)
      .digest("hex");

    const isSignatureValid =
      expectedSignature.length === webhookSignature.length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf-8"),
        Buffer.from(webhookSignature, "utf-8")
      );

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid Razorpay webhook signature",
      });
    }

    // -----------------------------------------------------
    // 2. PARSE EVENT & IDENTIFIERS
    // -----------------------------------------------------

    const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const eventType = event?.event;
    const eventId = event?.event_id || event?.id || null;

    const paymentEntity = event?.payload?.payment?.entity;
    const orderEntity = event?.payload?.order?.entity;

    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
    const razorpayPaymentId = paymentEntity?.id;
    const rawAmount =
      paymentEntity?.amount ?? orderEntity?.amount_paid ?? orderEntity?.amount;
    const paidAmount =
      rawAmount !== undefined && rawAmount !== null
        ? Number(rawAmount) / 100
        : null;

    if (!razorpayOrderId) {
      return res.status(200).json({
        success: true,
        message: `Webhook event ${eventType} acknowledged (no razorpay order ID)`,
      });
    }

    // -----------------------------------------------------
    // 3. INSPECT PAYMENT RECORD
    // -----------------------------------------------------

    const payment = await Payment.findOne({ razorpayOrderId });

    if (payment && eventId) {
      const alreadyLogged = payment.webhookEvents?.some(
        (e) => e.eventId === eventId
      );
      if (!alreadyLogged) {
        payment.webhookEvents.push({
          eventId,
          event: eventType,
          receivedAt: new Date(),
        });
        await payment.save();
      }
    }

    // -----------------------------------------------------
    // 4. HANDLE EVENT TYPES
    // -----------------------------------------------------

    if (eventType === "order.paid" || eventType === "payment.captured") {
      // Amount verification: compare paid amount against payment record if available
      if (payment && paidAmount !== null) {
        if (Math.abs(payment.amount - paidAmount) > 0.01) {
          payment.status = "failed";
          payment.failureReason = `Amount mismatch: expected ${payment.amount}, received ${paidAmount}`;
          await payment.save();

          return res.status(400).json({
            success: false,
            message: "Payment amount mismatch",
          });
        }
      }

      // Check if this was a wallet top-up
      const isWalletTopup =
        payment?.paymentType === "wallet_topup" ||
        paymentEntity?.notes?.type === "wallet_topup";

      if (isWalletTopup) {
        const topupUserId = payment?.userId || paymentEntity?.notes?.userId;
        if (topupUserId && paidAmount) {
          await creditWallet({
            userId: topupUserId,
            amount: paidAmount,
            reason: "wallet_topup",
            description: "Wallet money added through Razorpay (webhook confirmed)",
            razorpayOrderId,
            razorpayPaymentId,
          });
        }

        if (payment) {
          payment.status = "captured";
          payment.razorpayPaymentId = razorpayPaymentId;
          await payment.save();
        }

        return res.status(200).json({
          success: true,
          message: "Wallet top-up processed via webhook",
        });
      }

      // Standard Product Checkout
      // Idempotency: check if Order already exists
      const queryConditions = [{ razorpayOrderId }];
      if (razorpayPaymentId) {
        queryConditions.push({ razorpayPaymentId });
      }

      const existingOrder = await Order.findOne({ $or: queryConditions });

      if (existingOrder) {
        if (existingOrder.paymentStatus !== "paid") {
          existingOrder.paymentStatus = "paid";
          if (!existingOrder.razorpayPaymentId && razorpayPaymentId) {
            existingOrder.razorpayPaymentId = razorpayPaymentId;
          }
          await existingOrder.save();
        }

        if (payment) {
          payment.status = "captured";
          payment.orderId = existingOrder._id;
          payment.razorpayPaymentId = razorpayPaymentId;
          await payment.save();
        }

        return res.status(200).json({
          success: true,
          message: "Order payment confirmed (order already placed)",
          orderId: existingOrder._id,
        });
      }

      // If order does not exist yet: Recover order creation from webhook
      if (!payment || !payment.orderData || !Array.isArray(payment.orderData.items) || payment.orderData.items.length === 0) {
        return res.status(200).json({
          success: true,
          message: "Payment confirmed, awaiting frontend order creation",
        });
      }

      try {
        const placementResult = await executeOrderPlacement({
          userId: payment.userId,
          addressId: payment.orderData.addressId,
          items: payment.orderData.items,
          paymentMethod: "razorpay",
          deliveryMethod: payment.orderData.deliveryMethod || "standard",
          couponCode: payment.orderData.couponCode || "",
          razorpayOrderId,
          razorpayPaymentId,
          paymentStatus: "paid",
        });

        payment.status = "captured";
        payment.orderId = placementResult.order._id;
        payment.razorpayPaymentId = razorpayPaymentId;
        await payment.save();

        return res.status(200).json({
          success: true,
          message: "Order placed successfully via webhook recovery",
          orderId: placementResult.order._id,
        });
      } catch (orderCreationError) {
        console.error("Webhook Order Placement Error:", orderCreationError);
        payment.status = "failed";
        payment.failureReason = orderCreationError.message;
        await payment.save();

        return res.status(500).json({
          success: false,
          message: `Failed to place order via webhook: ${orderCreationError.message}`,
        });
      }
    }

    if (eventType === "payment.failed") {
      if (payment) {
        payment.status = "failed";
        payment.failureReason =
          paymentEntity?.error_description ||
          paymentEntity?.error_reason ||
          "Payment failed";
        payment.razorpayPaymentId = razorpayPaymentId;
        await payment.save();
      }

      return res.status(200).json({
        success: true,
        message: "Payment failure recorded",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Webhook event ${eventType} acknowledged`,
    });
  } catch (error) {
    console.error("Razorpay Webhook Error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing error",
    });
  }
};