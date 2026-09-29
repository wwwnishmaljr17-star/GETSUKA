import mongoose from "mongoose";

import Review from "../models/Review.js";
import Product from "../../product/models/Product.js";

// =========================================================
// GET PRODUCT REVIEWS
// =========================================================

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;

    // ---------------------------------------------------------
    // Validate Product ID
    // ---------------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // ---------------------------------------------------------
    // Check Product
    // ---------------------------------------------------------

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isListed: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ---------------------------------------------------------
    // Get Reviews
    // ---------------------------------------------------------

    const reviews = await Review.find({
      product: productId,
    })
      .populate("user")
      .sort({ createdAt: -1 });

    // ---------------------------------------------------------
    // Calculate Rating
    // ---------------------------------------------------------

    const totalReviews = reviews.length;

    const totalRating = reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );

    const averageRating =
      totalReviews > 0
        ? Number((totalRating / totalReviews).toFixed(1))
        : 0;

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: {
        reviews,
        totalReviews,
        averageRating,
      },
    });
  } catch (error) {
    console.error("Get Product Reviews Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
    });
  }
};

// =========================================================
// ADD PRODUCT REVIEW
// =========================================================

export const addReview = async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    // ---------------------------------------------------------
    // Check Authentication
    // ---------------------------------------------------------

    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // ---------------------------------------------------------
    // Validate Product ID
    // ---------------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // ---------------------------------------------------------
    // Validate Rating
    // ---------------------------------------------------------

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    // ---------------------------------------------------------
    // Validate Comment
    // ---------------------------------------------------------

    if (
      typeof comment !== "string" ||
      comment.trim().length < 3
    ) {
      return res.status(400).json({
        success: false,
        message: "Comment must be at least 3 characters",
      });
    }

    if (comment.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot exceed 1000 characters",
      });
    }

    // ---------------------------------------------------------
    // Check Product
    // ---------------------------------------------------------

    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isListed: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // ---------------------------------------------------------
    // Check Existing Review
    // ---------------------------------------------------------

    const existingReview = await Review.findOne({
      user: req.user.userId,
      product: productId,
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    // ---------------------------------------------------------
    // Create Review
    // ---------------------------------------------------------

    const review = await Review.create({
      user: req.user.userId,
      product: productId,
      rating: numericRating,
      comment: comment.trim(),
    });

    // ---------------------------------------------------------
    // Populate User
    // ---------------------------------------------------------

    await review.populate("user");

    // ---------------------------------------------------------
    // Response
    // ---------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: review,
    });
  } catch (error) {
    console.error("Add Product Review Error:", error);

    // ---------------------------------------------------------
    // Duplicate Review
    // ---------------------------------------------------------

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this product",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to add review",
    });
  }
};