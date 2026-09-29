import axiosInstance from "../../../../lib/axios";

const categoryApi = {
  // =========================================================
  // GET CATEGORIES
  // =========================================================

  getCategories: async () => {
    const response = await axiosInstance.get(
      "/api/admin/categories",
      {
        params: {
          page: 1,
          limit: 100,
        },
      }
    );

    return response.data;
  },
};

export default categoryApi;