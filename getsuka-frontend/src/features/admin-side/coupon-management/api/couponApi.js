import adminAxios from "../../../../lib/adminAxios";

// =========================================================
// COUPON API
// =========================================================

// =========================================================
// GET COUPONS
// =========================================================

export const getCoupons = async ({
  search = "",
  page = 1,
  limit = 10,
  status = "all",
} = {}) => {
  const response = await adminAxios.get(
    "/api/admin/coupons",
    {
      params: {
        search,
        page,
        limit,
        status,
      },
    }
  );

  return response.data;
};

// =========================================================
// GET SINGLE COUPON
// =========================================================

export const getCouponById = async (
  couponId
) => {
  const response = await adminAxios.get(
    `/api/admin/coupons/${couponId}`
  );

  return response.data;
};

// =========================================================
// CREATE COUPON
// =========================================================

export const createCoupon = async (
  couponData
) => {
  const response = await adminAxios.post(
    "/api/admin/coupons",
    couponData
  );

  return response.data;
};

// =========================================================
// UPDATE COUPON
// =========================================================

export const updateCoupon = async (
  couponId,
  couponData
) => {
  const response =
    await adminAxios.put(
      `/api/admin/coupons/${couponId}`,
      couponData
    );

  return response.data;
};

// =========================================================
// DELETE COUPON
// =========================================================

export const deleteCoupon = async (
  couponId
) => {
  const response =
    await adminAxios.delete(
      `/api/admin/coupons/${couponId}`
    );

  return response.data;
};

// =========================================================
// TOGGLE COUPON STATUS
// =========================================================

export const toggleCouponStatus =
  async (couponId) => {
    const response =
      await adminAxios.patch(
        `/api/admin/coupons/${couponId}/status`
      );

    return response.data;
  };