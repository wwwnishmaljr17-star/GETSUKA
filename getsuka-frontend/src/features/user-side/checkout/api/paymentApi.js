import axiosInstance from "../../../../lib/axios";

// =========================================================
// CREATE RAZORPAY ORDER
// =========================================================

export const createRazorpayOrder = async (amountOrOrderData, maybeOrderData = null) => {
  try {
    let payload;
    if (maybeOrderData && typeof maybeOrderData === "object") {
      payload = { orderData: maybeOrderData };
    } else if (amountOrOrderData && typeof amountOrOrderData === "object") {
      payload = { orderData: amountOrOrderData };
    } else {
      payload = { amount: amountOrOrderData };
    }

    const response = await axiosInstance.post(
      "/api/payment/create-order",
      payload
    );

    return response.data;
  } catch (error) {
    console.error(
      "Create Razorpay Order Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// VERIFY RAZORPAY PAYMENT
// =========================================================

export const verifyRazorpayPayment = async (
  paymentData
) => {
  try {
    const response = await axiosInstance.post(
      "/api/payment/verify-payment",
      paymentData
    );

    return response.data;
  } catch (error) {
    console.error(
      "Verify Razorpay Payment Error:",
      error
    );

    throw error;
  }
};