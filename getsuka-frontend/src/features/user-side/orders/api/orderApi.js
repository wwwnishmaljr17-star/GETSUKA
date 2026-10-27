import axiosInstance from "../../../../lib/axios";

// =========================================================
// CREATE ORDER
// =========================================================

export const createOrder = async (
  orderData
) => {
  try {
    const response =
      await axiosInstance.post(
        "/api/user/orders",
        orderData
      );

    return response.data;
  } catch (error) {
    console.error(
      "Create Order Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// GET USER ORDERS
// =========================================================

export const getUserOrders = async () => {
  try {
    const response =
      await axiosInstance.get(
        "/api/user/orders"
      );

    return response.data;
  } catch (error) {
    console.error(
      "Get User Orders Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// GET SINGLE USER ORDER
// =========================================================

export const getUserOrderById = async (
  orderId
) => {
  try {
    const response =
      await axiosInstance.get(
        `/api/user/orders/${orderId}`
      );

    return response.data;
  } catch (error) {
    console.error(
      "Get User Order Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// CANCEL USER ORDER
// =========================================================

export const cancelUserOrder = async (
  orderId,
  cancellationReason
) => {
  try {
    const response =
      await axiosInstance.post(
        `/api/user/orders/${orderId}/cancel`,
        {
          cancellationReason,
        }
      );

    return response.data;
  } catch (error) {
    console.error(
      "Cancel User Order Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// CANCEL SINGLE ORDER ITEM
// =========================================================

export const cancelUserOrderItem = async (
  orderId,
  itemId,
  cancellationReason,
  quantity
) => {
  try {
    const response =
      await axiosInstance.post(
        `/api/user/orders/${orderId}/items/${itemId}/cancel`,
        {
          cancellationReason,
          quantity,
        }
      );

    return response.data;
  } catch (error) {
    console.error(
      "Cancel User Order Item Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// CANCEL MULTIPLE ORDER ITEMS (BATCH)
// =========================================================

export const cancelUserOrderItems = async (
  orderId,
  items,
  cancellationReason
) => {
  try {
    const response = await axiosInstance.post(
      `/api/user/orders/${orderId}/cancel-items`,
      {
        items,
        cancellationReason,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Cancel User Order Items Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// RETURN USER ORDER
// =========================================================

export const returnUserOrder = async (
  orderId,
  returnReason,
  items = []
) => {
  try {
    const response =
      await axiosInstance.post(
        `/api/user/orders/${orderId}/return`,
        {
          returnReason,
          items,
        }
      );

    return response.data;
  } catch (error) {
    console.error(
      "Return User Order Error:",
      error
    );

    throw error;
  }
};