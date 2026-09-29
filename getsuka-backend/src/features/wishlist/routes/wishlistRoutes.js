import express from "express";

import userAuthMiddleware from "../../../middlewares/userAuthMiddleware.js";

import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";

const router = express.Router();

router.get(
  "/wishlist",
  userAuthMiddleware,
  getWishlist
);

router.post(
  "/wishlist",
  userAuthMiddleware,
  addToWishlist
);

router.delete(
  "/wishlist/:productId",
  userAuthMiddleware,
  removeFromWishlist
);

export default router;