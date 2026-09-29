import mongoose from "mongoose";

import Product from "../models/Product.js";

const getPublicProductById = async (req, res) => {
  try {
    const { productId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isListed: true,
    })
      .populate("category", "name")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    // =========================================================
    // STOCK CALCULATION
    // =========================================================

    const variants = Array.isArray(product.variants)
      ? product.variants
      : [];

    const totalStock = variants.reduce(
      (total, variant) =>
        total + Number(variant.stock || 0),
      0
    );

    const availableVariants = variants.filter(
      (variant) => Number(variant.stock || 0) > 0
    );

    const sizes = [
      ...new Set(
        variants
          .map((variant) => variant.size)
          .filter(Boolean)
      ),
    ];

    const colors = [
      ...new Set(
        variants
          .map((variant) => variant.color)
          .filter(Boolean)
      ),
    ];

    let stockStatus = "IN_STOCK";

    if (totalStock <= 0) {
      stockStatus = "OUT_OF_STOCK";
    } else if (totalStock <= 5) {
      stockStatus = "LOW_STOCK";
    }

    // =========================================================
    // PRICE
    // =========================================================

    const finalPrice =
      product.salePrice !== null &&
      product.salePrice !== undefined &&
      Number(product.salePrice) < Number(product.price)
        ? Number(product.salePrice)
        : Number(product.price);

    // =========================================================
    // RESPONSE
    // =========================================================

    return res.status(200).json({
      success: true,
      message: "Product fetched successfully.",
      product: {
        ...product,

        totalStock,

        stockStatus,

        sizes,

        colors,

        availableVariants,

        finalPrice,

        isAvailable: totalStock > 0,
      },
    });
  } catch (error) {
    console.error(
      "GET PUBLIC PRODUCT BY ID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product.",
    });
  }
};

export {
  getPublicProductById,
};