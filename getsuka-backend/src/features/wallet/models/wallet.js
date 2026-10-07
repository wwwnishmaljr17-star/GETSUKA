import mongoose from "mongoose";

// =========================================================
// WALLET TRANSACTION
// =========================================================

const walletTransactionSchema =
  new mongoose.Schema(
    {
      type: {
        type: String,
        enum: [
          "credit",
          "debit",
        ],
        required: true,
      },

      amount: {
        type: Number,
        required: true,
        min: 0.01,
      },

      reason: {
        type: String,
        enum: [
          "wallet_topup",
          "order_cancellation_refund",
          "order_return_refund",
          "wallet_payment",
          "manual_credit",
          "manual_debit",
        ],
        required: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null,
      },

      orderNumber: {
        type: String,
        default: "",
        trim: true,
      },

      // =====================================================
      // RAZORPAY PAYMENT REFERENCES
      // Used for wallet top-up idempotency.
      // =====================================================

      razorpayOrderId: {
        type: String,
        default: "",
        trim: true,
      },

      razorpayPaymentId: {
        type: String,
        default: "",
        trim: true,
      },

      balanceAfterTransaction: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      timestamps: true,
    }
  );

// =========================================================
// WALLET
// =========================================================

const walletSchema =
  new mongoose.Schema(
    {
      userId: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true,
      },

      balance: {
        type: Number,
        default: 0,
        min: 0,
      },

      transactions: {
        type: [
          walletTransactionSchema,
        ],
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

// =========================================================
// MODEL
// =========================================================

const Wallet =
  mongoose.model(
    "Wallet",
    walletSchema
  );

export default Wallet;