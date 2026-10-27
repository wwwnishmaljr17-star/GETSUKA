import axiosInstance from "../../../../lib/axios";

let cachedCategories = null;
let categoryCacheTimestamp = 0;
let inFlightCategoriesPromise = null;
const CATEGORY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const categoryApi = {
  // =========================================================
  // GET CATEGORIES (CACHED WITH TTL + IN-FLIGHT DEDUPLICATION)
  // =========================================================

  getCategories: async (options = {}) => {
    const now = Date.now();

    if (
      !options.forceRefresh &&
      cachedCategories &&
      now - categoryCacheTimestamp < CATEGORY_CACHE_TTL
    ) {
      return cachedCategories;
    }

    if (inFlightCategoriesPromise) {
      return inFlightCategoriesPromise;
    }

    inFlightCategoriesPromise = (async () => {
      try {
        const response = await axiosInstance.get(
          "/api/admin/categories",
          {
            params: {
              page: 1,
              limit: 100,
            },
          }
        );

        if (response?.data?.success) {
          cachedCategories = response.data;
          categoryCacheTimestamp = Date.now();
        }

        return response.data;
      } finally {
        inFlightCategoriesPromise = null;
      }
    })();

    return inFlightCategoriesPromise;
  },

  clearCache: () => {
    cachedCategories = null;
    categoryCacheTimestamp = 0;
    inFlightCategoriesPromise = null;
  },
};

export default categoryApi;