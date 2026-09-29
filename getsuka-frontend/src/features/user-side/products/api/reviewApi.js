import axiosInstance from "../../../../lib/axios";

const reviewApi = {
  // =========================================================
  // GET PRODUCT REVIEWS
  // =========================================================

  getProductReviews: async (productId) => {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    const response = await axiosInstance.get(
      `/api/products/${productId}/reviews`
    );

    return response.data;
  },

  // =========================================================
  // ADD PRODUCT REVIEW
  // =========================================================

  addReview: async (productId, reviewData) => {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    const response = await axiosInstance.post(
      `/api/products/${productId}/reviews`,
      reviewData
    );

    return response.data;
  },
};

export default reviewApi;