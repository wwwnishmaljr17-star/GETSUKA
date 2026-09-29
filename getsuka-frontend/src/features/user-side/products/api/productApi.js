import axiosInstance from "../../../../lib/axios";

const productApi = {
  // =========================================================
  // GET PRODUCT LIST
  // =========================================================

  getProducts: async (params = {}) => {
    const response = await axiosInstance.get("/api/products", {
      params: {
        search: params.search || "",
        category: params.category || "",
        anime: params.anime || "",
        minPrice: params.minPrice ?? "",
        maxPrice: params.maxPrice ?? "",
        size: params.size || "",
        color: params.color || "",
        sort: params.sort || "newest",
        page: params.page || 1,
        limit: params.limit || 12,
      },
    });

    return response.data;
  },

  // =========================================================
  // GET SINGLE PRODUCT
  // =========================================================

  getProductById: async (productId) => {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    const response = await axiosInstance.get(
      `/api/products/${productId}`
    );

    return response.data;
  },
};

export default productApi;