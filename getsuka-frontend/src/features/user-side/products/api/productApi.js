import axiosInstance from "../../../../lib/axios";

const productApi = {
  getProducts: async (params = {}) => {
    const response = await axiosInstance.get(
      "/api/products",
      {
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
          _t: Date.now(),
        },
      }
    );

    return response.data;
  },

  getProductById: async (productId) => {
    if (!productId) {
      throw new Error(
        "Product ID is required."
      );
    }

    const response =
      await axiosInstance.get(
        `/api/products/${productId}`,
        {
          params: {
            _t: Date.now(),
          },

          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

    return response.data;
  },
};

export default productApi;