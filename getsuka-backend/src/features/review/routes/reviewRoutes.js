import express from "express";

import {
  getProductReviews,
  addReview,
} from "../controllers/reviewController.js";

import userAuthMiddleware from "../../../middlewares/userAuthMiddleware.js";

const router = express.Router();

// PUBLIC
// Anyone can view product reviews
router.get(
  "/products/:productId/reviews",
  getProductReviews
);

// PROTECTED
// User must be logged in to add a review
router.post(
  "/products/:productId/reviews",
  userAuthMiddleware,
  addReview
);

export default router;