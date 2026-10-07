import axiosInstance from "../../../../lib/axios";

// =========================================================
// GET AVAILABLE COUPONS
// =========================================================

export const getAvailableCoupons = async () => {
  try {
    const response = await axiosInstance.get(
      "/api/admin/coupons",
      {
        params: {
          status: "active",
          page: 1,
          limit: 100,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Get Available Coupons Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// VALIDATE COUPON
// =========================================================

export const validateCoupon = async (
  code,
  orderAmount
) => {
  try {
    const response = await axiosInstance.post(
      "/api/admin/coupons/validate",
      {
        code,
        orderAmount,
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      "Validate Coupon Error:",
      error
    );

    throw error;
  }
};