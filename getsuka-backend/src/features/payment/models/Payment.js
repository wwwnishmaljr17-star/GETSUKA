import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
      trim: true,
    },

    razorpaySignature: {
      type: String,
      default: null,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      default: "INR",
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "created",
        "authorized",
        "captured",
        "failed",
        "refunded",
      ],
      default: "created",
    },

    paymentType: {
      type: String,
      enum: [
        "order_checkout",
        "wallet_topup",
      ],
      default: "order_checkout",
    },

    orderData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
      trim: true,
    },

    webhookEvents: [
      {
        eventId: {
          type: String,
          default: null,
        },
        event: {
          type: String,
          default: null,
        },
        receivedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// =========================================================
// INDEXES
// =========================================================

paymentSchema.index({
  razorpayPaymentId: 1,
});

paymentSchema.index({
  userId: 1,
  createdAt: -1,
});

paymentSchema.index({
  status: 1,
});

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
