import mongoose from "mongoose";

import Wishlist from "../models/Wishlist.js";
import Product from "../../product/models/Product.js";

/* =========================================
   GET WISHLIST
========================================= */

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const wishlist = await Wishlist.find({
      user: userId,
    })
      .populate({
        path: "product",
        match: {
          isDeleted: false,
          isListed: true,
        },
        populate: {
          path: "category",
          select: "name",
        },
      })
      .sort({ createdAt: -1 });

    /*
      Products that were later deleted/unlisted
      will have product = null because of populate match.
      Remove those entries from the response.
    */
    const availableWishlist = wishlist.filter(
      (item) => item.product
    );

    return res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      wishlist: availableWishlist,
    });
  } catch (error) {
    console.error(
      "Get Wishlist Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist",
    });
  }
};

/* =========================================
   ADD TO WISHLIST
========================================= */

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    /*
      Only active/listed products can be added.
    */
    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isListed: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product is unavailable or no longer listed",
      });
    }

    /*
      Prevent duplicate wishlist entries.
    */
    const existingWishlist =
      await Wishlist.findOne({
        user: userId,
        product: productId,
      });

    if (existingWishlist) {
      return res.status(409).json({
        success: false,
        message: "Product is already in wishlist",
      });
    }

    const wishlistItem =
      await Wishlist.create({
        user: userId,
        product: productId,
      });

    const populatedWishlistItem =
      await Wishlist.findById(
        wishlistItem._id
      ).populate({
        path: "product",
        populate: {
          path: "category",
          select: "name",
        },
      });

    return res.status(201).json({
      success: true,
      message: "Product added to wishlist",
      wishlistItem: populatedWishlistItem,
    });
  } catch (error) {
    /*
      Handles the unique index race condition
      if two requests arrive at the same time.
    */
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Product is already in wishlist",
      });
    }

    console.error(
      "Add Wishlist Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to add product to wishlist",
    });
  }
};

/* =========================================
   REMOVE FROM WISHLIST
========================================= */

export const removeFromWishlist = async (
  req,
  res
) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID is required",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const deletedWishlistItem =
      await Wishlist.findOneAndDelete({
        user: userId,
        product: productId,
      });

    if (!deletedWishlistItem) {
      return res.status(404).json({
        success: false,
        message: "Product is not in wishlist",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product removed from wishlist",
    });
  } catch (error) {
    console.error(
      "Remove Wishlist Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to remove product from wishlist",
    });
  }
};