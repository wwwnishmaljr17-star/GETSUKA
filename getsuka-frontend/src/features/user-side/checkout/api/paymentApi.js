import axiosInstance from "../../../../lib/axios";

// =========================================================
// CREATE RAZORPAY ORDER
// =========================================================

export const createRazorpayOrder = async (amount) => {
  try {
    const response = await axiosInstance.post(
      "/api/payment/create-order",
      {
        amount,
      }
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