import adminAxios from "../../../../lib/adminAxios";

// =========================================================
// GET ADMIN ORDERS
// =========================================================

export const getAdminOrders = async ({
  search = "",
  status = "",
  paymentStatus = "",
  sort = "newest",
  page = 1,
  limit = 10,
} = {}) => {
  try {
    const response = await adminAxios.get(
      "/api/admin/orders",
      {
        params: {
          search,
          status,
          paymentStatus,
          sort,
          page,
          limit,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Get Admin Orders Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// GET SINGLE ADMIN ORDER
// =========================================================

export const getAdminOrderById = async (
  orderId
) => {
  try {
    const response = await adminAxios.get(
      `/api/admin/orders/${orderId}`
    );

    return response.data;
  } catch (error) {
    console.error(
      "Get Admin Order Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// GET ADMIN RETURN REQUESTS
// =========================================================

export const getAdminReturns = async ({
  search = "",
  status = "",
  sort = "newest",
  page = 1,
  limit = 10,
} = {}) => {
  try {
    const response = await adminAxios.get(
      "/api/admin/orders/returns",
      {
        params: {
          search,
          status,
          sort,
          page,
          limit,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Get Admin Returns Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// UPDATE ADMIN ORDER STATUS
// =========================================================

export const updateAdminOrderStatus = async (
  orderId,
  status
) => {
  try {
    const response = await adminAxios.put(
      `/api/admin/orders/${orderId}/status`,
      {
        status,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Update Admin Order Status Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// APPROVE RETURN REQUEST
// =========================================================

export const approveReturnRequest = async (
  orderId
) => {
  try {
    const response = await adminAxios.put(
      `/api/admin/orders/${orderId}/return/approve`
    );

    return response.data;
  } catch (error) {
    console.error(
      "Approve Return Request Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// REJECT RETURN REQUEST
// =========================================================

export const rejectReturnRequest = async (
  orderId,
  rejectionReason
) => {
  try {
    const response = await adminAxios.put(
      `/api/admin/orders/${orderId}/return/reject`,
      {
        rejectionReason,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Reject Return Request Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// MARK RETURN COLLECTION PENDING
// =========================================================

export const markReturnCollectionPending =
  async (orderId) => {
    try {
      const response =
        await adminAxios.put(
          `/api/admin/orders/${orderId}/return/collection-pending`
        );

      return response.data;
    } catch (error) {
      console.error(
        "Mark Return Collection Pending Error:",
        error
      );

      throw error;
    }
  };

// =========================================================
// MARK RETURN COLLECTED
// =========================================================

export const markReturnCollected = async (
  orderId
) => {
  try {
    const response = await adminAxios.put(
      `/api/admin/orders/${orderId}/return/collected`
    );

    return response.data;
  } catch (error) {
    console.error(
      "Mark Return Collected Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// COMPLETE RETURN
// =========================================================

export const completeReturn = async (
  orderId
) => {
  try {
    const response = await adminAxios.put(
      `/api/admin/orders/${orderId}/return/complete`
    );

    return response.data;
  } catch (error) {
    console.error(
      "Complete Return Error:",
      error
    );

    throw error;
  }
};