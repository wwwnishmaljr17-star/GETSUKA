import axiosInstance from "../../../../lib/axios";

const wishlistApi = {
  // =========================================================
  // GET WISHLIST
  // =========================================================

  getWishlist: async () => {
    const response = await axiosInstance.get(
      "/api/user/wishlist"
    );

    return response.data;
  },

  // =========================================================
  // ADD PRODUCT TO WISHLIST
  // =========================================================

  addToWishlist: async (productId) => {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

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

    const response = await axiosInstance.delete(
      `/api/user/wishlist/${productId}`
    );

    return response.data;
  },
};

export default wishlistApi;