import crypto from "crypto";

import razorpay from "../../../config/razorpay.js";

import {
  creditWallet,
} from "../../wallet/controllers/walletController.js";

// =========================================================
// CREATE RAZORPAY ORDER
// =========================================================

export const createRazorpayOrder = async (
  req,
  res
) => {
  try {
    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const options = {
      amount: Math.round(
        Number(amount) * 100
      ),
      currency: "INR",
      receipt: `getsuka_${Date.now()}`,
    };

    const order =
      await razorpay.orders.create(
        options
      );

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error(
      "Create Razorpay Order Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create Razorpay order",
    });
  }
};

// =========================================================
// VERIFY RAZORPAY PAYMENT
// =========================================================

export const verifyRazorpayPayment = async (
  req,
  res
) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment verification details are missing",
      });
    }

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    const isValid =
      generatedSignature ===
      razorpay_signature;

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message:
          "Payment verification failed",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Payment verified successfully",

      payment: {
        razorpayOrderId:
          razorpay_order_id,

        razorpayPaymentId:
          razorpay_payment_id,
      },
    });
  } catch (error) {
    console.error(
      "Verify Razorpay Payment Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to verify payment",
    });
  }
};

// =========================================================
// CREATE WALLET TOP-UP RAZORPAY ORDER
// =========================================================

export const createWalletTopupOrder =
  async (
    req,
    res
  ) => {
    try {
      const { amount } =
        req.body;

      const topupAmount =
        Number(amount);

      // -----------------------------------------------------
      // VALIDATE AMOUNT
      // -----------------------------------------------------

      if (
        !Number.isFinite(
          topupAmount
        ) ||
        topupAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid wallet top-up amount is required",
        });
      }

      // -----------------------------------------------------
      // ROUND TO TWO DECIMAL PLACES
      // -----------------------------------------------------

      const normalizedAmount =
        Math.round(
          topupAmount * 100
        ) / 100;

      // -----------------------------------------------------
      // RAZORPAY AMOUNT
      // -----------------------------------------------------

      const razorpayAmount =
        Math.round(
          normalizedAmount * 100
        );

      // -----------------------------------------------------
      // CREATE RAZORPAY ORDER
      // -----------------------------------------------------

      const order =
        await razorpay.orders.create({
          amount:
            razorpayAmount,

          currency:
            "INR",

          receipt:
            `getsuka_wallet_${Date.now()}`,

          notes: {
            type:
              "wallet_topup",

            userId:
              String(
                req.user.userId
              ),

            amount:
              String(
                normalizedAmount
              ),
          },
        });

      return res.status(200).json({
        success: true,

        order: {
          id: order.id,

          amount:
            order.amount,

          currency:
            order.currency,

          receipt:
            order.receipt,
        },
      });
    } catch (error) {
      console.error(
        "Create Wallet Top-Up Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to create wallet top-up order",
      });
    }
  };

// =========================================================
// VERIFY WALLET TOP-UP PAYMENT
// =========================================================

export const verifyWalletTopupPayment =
  async (
    req,
    res
  ) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;

      // -----------------------------------------------------
      // VALIDATE PAYMENT DATA
      // -----------------------------------------------------

      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Wallet payment verification details are missing",
        });
      }

      // -----------------------------------------------------
      // VERIFY RAZORPAY SIGNATURE
      // -----------------------------------------------------

      const generatedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env
              .RAZORPAY_KEY_SECRET
          )
          .update(
            `${razorpay_order_id}|${razorpay_payment_id}`
          )
          .digest("hex");

      const isValid =
        generatedSignature ===
        razorpay_signature;

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message:
            "Wallet payment verification failed",
        });
      }

      // -----------------------------------------------------
      // FETCH RAZORPAY ORDER
      // -----------------------------------------------------

      const razorpayOrder =
        await razorpay.orders.fetch(
          razorpay_order_id
        );

      // -----------------------------------------------------
      // VALIDATE RAZORPAY ORDER
      // -----------------------------------------------------

      if (
        !razorpayOrder ||
        razorpayOrder.id !==
          razorpay_order_id
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Razorpay wallet order",
        });
      }

      // -----------------------------------------------------
      // CHECK WALLET TOP-UP ORDER
      // -----------------------------------------------------

      if (
        razorpayOrder.notes?.type !==
        "wallet_topup"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This Razorpay order is not a wallet top-up",
        });
      }

      // -----------------------------------------------------
      // CHECK USER OWNERSHIP
      // -----------------------------------------------------

      if (
        razorpayOrder.notes?.userId !==
        String(
          req.user.userId
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This wallet payment does not belong to this user",
        });
      }

      // -----------------------------------------------------
      // GET TOP-UP AMOUNT
      // -----------------------------------------------------

      const topupAmount =
        Number(
          razorpayOrder.amount
        ) / 100;

      if (
        !Number.isFinite(
          topupAmount
        ) ||
        topupAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid wallet top-up amount",
        });
      }

      // -----------------------------------------------------
      // CREDIT WALLET
      // -----------------------------------------------------

      const walletResult =
        await creditWallet({
          userId:
            req.user.userId,

          amount:
            topupAmount,

          reason:
            "wallet_topup",

          description:
            "Wallet money added through Razorpay",

          razorpayOrderId:
            razorpay_order_id,

          razorpayPaymentId:
            razorpay_payment_id,
        });

      // -----------------------------------------------------
      // RESPONSE
      // -----------------------------------------------------

      return res.status(200).json({
        success: true,

        message:
          walletResult.alreadyCredited
            ? "Wallet top-up was already credited"
            : "Wallet topped up successfully",

        alreadyCredited:
          walletResult.alreadyCredited,

        wallet: {
          balance:
            walletResult.wallet
              .balance,
        },

        transaction:
          walletResult.transaction,
      });
    } catch (error) {
      console.error(
        "Verify Wallet Top-Up Payment Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to complete wallet top-up",
      });
    }
  };