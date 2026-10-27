import axiosInstance from "../../../../lib/axios";

let cachedWishlist = null;
let cachedWishlistToken = null;
let wishlistCacheTimestamp = 0;
let inFlightWishlistPromise = null;
const WISHLIST_CACHE_TTL = 15 * 1000; // 15 seconds

const wishlistApi = {
  // =========================================================
  // GET WISHLIST (IN-FLIGHT DEDUPLICATION + SHORT TTL CACHE)
  // =========================================================

  getWishlist: async (options = {}) => {
    const currentToken = localStorage.getItem("token") || null;

    // Invalidate cache if user/token changed
    if (cachedWishlistToken !== currentToken) {
      cachedWishlist = null;
      cachedWishlistToken = currentToken;
      wishlistCacheTimestamp = 0;
    }

    const now = Date.now();
    if (
      !options.forceRefresh &&
      cachedWishlist &&
      now - wishlistCacheTimestamp < WISHLIST_CACHE_TTL
    ) {
      return cachedWishlist;
    }

    if (inFlightWishlistPromise) {
      return inFlightWishlistPromise;
    }

    inFlightWishlistPromise = (async () => {
      try {
        const response = await axiosInstance.get("/api/user/wishlist");

        if (response?.data?.success) {
          cachedWishlist = response.data;
          cachedWishlistToken = currentToken;
          wishlistCacheTimestamp = Date.now();
        }

        return response.data;
      } finally {
        inFlightWishlistPromise = null;
      }
    })();

    return inFlightWishlistPromise;
  },

  // =========================================================
  // ADD PRODUCT TO WISHLIST
  // =========================================================

  addToWishlist: async (productId) => {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    // Invalidate cached wishlist upon mutation
    wishlistApi.clearCache();

    const response = await axiosInstance.post(
      "/api/user/wishlist",
      {
        productId,
      }
    );

    return response.data;
  },

  // =========================================================
  // REMOVE PRODUCT FROM WISHLIST
  // =========================================================

  removeFromWishlist: async (productId) => {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    // Invalidate cached wishlist upon mutation
    wishlistApi.clearCache();

    const response = await axiosInstance.delete(
      `/api/user/wishlist/${productId}`
    );

    return response.data;
  },

  clearCache: () => {
    cachedWishlist = null;
    cachedWishlistToken = null;
    wishlistCacheTimestamp = 0;
    inFlightWishlistPromise = null;
  },
};

export default wishlistApi;