import mongoose from "mongoose";

// =========================================================
// ORDER ITEM
// =========================================================

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    productImage: {
      type: String,
      default: "",
    },

    sku: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: String,
      default: "",
      trim: true,
    },

    color: {
      type: String,
      default: "",
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    // =======================================================
    // ITEM CANCELLATION
    // =======================================================

    itemStatus: {
      type: String,
      enum: [
        "active",
        "cancelled",
      ],
      default: "active",
    },

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },

    cancellationSource: {
      type: String,
      enum: [
        "user",
        "admin",
      ],
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    // =======================================================
    // ITEM REFUND
    // =======================================================

    refundStatus: {
      type: String,
      enum: [
        "none",
        "refunded",
      ],
      default: "none",
    },

    refundedAmount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

// =========================================================
// SHIPPING ADDRESS SNAPSHOT
// =========================================================

const shippingAddressSchema = new mongoose.Schema(
  {
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Address",
      required: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    addressLine: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    pincode: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

// =========================================================
// ORDER
// =========================================================

const orderSchema = new mongoose.Schema(
  {
    // =======================================================
    // USER
    // =======================================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // =======================================================
    // ORDER NUMBER
    // =======================================================

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    // =======================================================
    // ITEMS
    // =======================================================

    items: {
      type: [orderItemSchema],
      required: true,

      validate: {
        validator: function (items) {
          return items.length > 0;
        },

        message:
          "Order must contain at least one item",
      },
    },

    // =======================================================
    // SHIPPING
    // =======================================================

    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },

    deliveryMethod: {
      type: String,
      enum: [
        "standard",
        "express",
      ],
      default: "standard",
    },

    shippingCharge: {
      type: Number,
      min: 0,
      default: 0,
    },

    // =======================================================
    // PRICE
    // =======================================================

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    discount: {
      type: Number,
      min: 0,
      default: 0,
    },

    tax: {
      type: Number,
      min: 0,
      default: 0,
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    couponCode: {
      type: String,
      default: "",
      trim: true,
    },

    // =======================================================
    // PAYMENT
    // =======================================================

    paymentMethod: {
      type: String,
      enum: [
        "razorpay",
        "wallet",
        "upi",
        "card",
        "netbanking",
        "cod",
      ],
      required: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "refunded",
      ],
      default: "pending",
    },

    // =======================================================
    // ORDER STATUS
    // =======================================================

    status: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "placed",
    },

    // =======================================================
    // DELIVERY
    // =======================================================

    deliveredAt: {
      type: Date,
      default: null,
    },

    // =======================================================
    // ORDER-LEVEL CANCELLATION
    // =======================================================

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },

    cancellationSource: {
      type: String,
      enum: [
        "user",
        "admin",
      ],
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    // =======================================================
    // RETURN REQUEST
    // =======================================================

    returnReason: {
      type: String,
      default: "",
      trim: true,
    },

    returnRequestedAt: {
      type: Date,
      default: null,
    },

    // =======================================================
    // RETURN STATUS
    // =======================================================

    returnStatus: {
      type: String,
      enum: [
        "none",
        "pending",
        "approved",
        "rejected",
        "collection_pending",
        "collected",
        "completed",
      ],
      default: "none",
    },

    // =======================================================
    // RETURN APPROVAL
    // =======================================================

    returnApprovedAt: {
      type: Date,
      default: null,
    },

    returnRejectedAt: {
      type: Date,
      default: null,
    },

    returnRejectionReason: {
      type: String,
      default: "",
      trim: true,
    },

    // =======================================================
    // RETURN COLLECTION
    // =======================================================

    returnCollectionRequestedAt: {
      type: Date,
      default: null,
    },

    returnCollectedAt: {
      type: Date,
      default: null,
    },

    // =======================================================
    // RETURN COMPLETION
    // =======================================================

    returnedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =========================================================
// INDEXES
// =========================================================

orderSchema.index({
  userId: 1,
  createdAt: -1,
});

orderSchema.index({
  status: 1,
  createdAt: -1,
});

orderSchema.index({
  returnStatus: 1,
  returnRequestedAt: -1,
});

// =========================================================
// MODEL
// =========================================================

const Order = mongoose.model(
  "Order",
  orderSchema
);

export default Order;