import axiosInstance from "../../../../lib/axios";

// In-memory caches and in-flight request registries
const productsCache = new Map();
const inFlightProducts = new Map();

const productByIdCache = new Map();
const inFlightProductById = new Map();

const PRODUCTS_CACHE_TTL = 60 * 1000; // 60 seconds
const PRODUCT_BY_ID_CACHE_TTL = 30 * 1000; // 30 seconds

const serializeParams = (params = {}) => {
  return JSON.stringify({
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
    trending: params.trending !== undefined ? params.trending : "",
  });
};

const productApi = {
  getProducts: async (params = {}, options = {}) => {
    const key = serializeParams(params);
    const now = Date.now();

    // Check memory cache unless caller requests forceRefresh
    if (!options.forceRefresh && productsCache.has(key)) {
      const entry = productsCache.get(key);
      if (now - entry.timestamp < PRODUCTS_CACHE_TTL) {
        return entry.data;
      }
      productsCache.delete(key);
    }

    // Deduplicate identical in-flight requests
    if (inFlightProducts.has(key)) {
      return inFlightProducts.get(key);
    }

    const cleanParams = {
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
    };

    if (params.trending !== undefined) {
      cleanParams.trending = params.trending;
    }

    const requestPromise = (async () => {
      try {
        const response = await axiosInstance.get("/api/products", {
          params: cleanParams,
        });

        if (response?.data?.success) {
          productsCache.set(key, {
            data: response.data,
            timestamp: Date.now(),
          });
        }

        return response.data;
      } finally {
        inFlightProducts.delete(key);
      }
    })();

    inFlightProducts.set(key, requestPromise);
    return requestPromise;
  },

  getProductById: async (productId, options = {}) => {
    if (!productId) {
      throw new Error("Product ID is required.");
    }

    const key = String(productId);
    const now = Date.now();

    // Check memory cache unless forceRefresh requested
    if (!options.forceRefresh && productByIdCache.has(key)) {
      const entry = productByIdCache.get(key);
      if (now - entry.timestamp < PRODUCT_BY_ID_CACHE_TTL) {
        return entry.data;
      }
      productByIdCache.delete(key);
    }

    // Deduplicate identical in-flight requests
    if (inFlightProductById.has(key)) {
      return inFlightProductById.get(key);
    }

    const requestPromise = (async () => {
      try {
        const config = options.forceRefresh
          ? {
              headers: {
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
              },
            }
          : {};

        const response = await axiosInstance.get(
          `/api/products/${productId}`,
          config
        );

        if (response?.data?.success) {
          productByIdCache.set(key, {
            data: response.data,
            timestamp: Date.now(),
          });
        }

        return response.data;
      } finally {
        inFlightProductById.delete(key);
      }
    })();

    inFlightProductById.set(key, requestPromise);
    return requestPromise;
  },

  getProductsBulk: async (productIds = []) => {
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return { success: true, products: [] };
    }

    // Bulk stock check is used for real-time inventory validation (cart / checkout)
    // Never cached; timestamp cache-buster removed from query parameters
    const response = await axiosInstance.post(
      "/api/products/bulk",
      { productIds },
      {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );

    return response.data;
  },

  clearCache: () => {
    productsCache.clear();
    productByIdCache.clear();
    inFlightProducts.clear();
    inFlightProductById.clear();
  },
};

export default productApi;