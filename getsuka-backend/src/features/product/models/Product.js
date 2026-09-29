import mongoose from "mongoose";

const variantSchema = new mongoose.Schema(
  {
    color: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    _id: true,
  }
);

// =========================================================
// PRODUCT DETAILS
// =========================================================

const productDetailsSchema = new mongoose.Schema(
  {
    material: {
      type: String,
      trim: true,
      default: "",
    },

    fit: {
      type: String,
      trim: true,
      default: "",
    },

    careInstructions: {
      type: String,
      trim: true,
      default: "",
    },

    shippingInfo: {
      type: String,
      trim: true,
      default: "",
    },

    returnInfo: {
      type: String,
      trim: true,
      default: "",
    },

    productDetails: {
      type: String,
      trim: true,
      default: "",
    },

    highlights: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

const productSchema = new mongoose.Schema(
  {
    // =========================================================
    // BASIC INFORMATION
    // =========================================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    productCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    anime: {
      type: String,
      required: true,
      trim: true,
    },

    // =========================================================
    // IMAGES
    // =========================================================

    images: {
      type: [String],
      required: true,

      validate: {
        validator: function (images) {
          return images.length >= 3;
        },

        message:
          "At least 3 product images are required",
      },
    },

    // =========================================================
    // PRICE
    // =========================================================

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    salePrice: {
      type: Number,
      min: 0,
      default: null,
    },

    // =========================================================
    // VARIANTS
    // =========================================================

    variants: {
      type: [variantSchema],
      required: true,

      validate: {
        validator: function (variants) {
          return variants.length > 0;
        },

        message:
          "At least one product variant is required",
      },
    },

    // =========================================================
    // PRODUCT DETAILS
    // =========================================================

    details: {
      type: productDetailsSchema,
      default: () => ({}),
    },

    // =========================================================
    // LISTING
    // =========================================================

    isListed: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model(
  "Product",
  productSchema
);

export default Product; 