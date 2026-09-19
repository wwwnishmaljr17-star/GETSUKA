import axiosInstance from "../../../../lib/axios";

// ============================================
// GET USER ADDRESSES
// ============================================

export const getUserAddresses = async () => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axiosInstance.get(
    "/api/user/addresses",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ============================================
// ADD NEW ADDRESS
// ============================================

export const addAddress = async (
  addressData
) => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axiosInstance.post(
    "/api/user/addresses",
    addressData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ============================================
// UPDATE ADDRESS
// ============================================

export const updateAddress = async (
  addressId,
  addressData
) => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axiosInstance.put(
    `/api/user/addresses/${addressId}`,
    addressData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ============================================
// DELETE ADDRESS
// ============================================

export const deleteAddress = async (
  addressId
) => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axiosInstance.delete(
    `/api/user/addresses/${addressId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};