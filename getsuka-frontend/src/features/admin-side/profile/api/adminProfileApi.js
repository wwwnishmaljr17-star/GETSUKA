import adminAxios from "../../../../lib/adminAxios";

/* =========================================
   GET ADMIN PROFILE
========================================= */

export const getAdminProfile = async () => {
  try {
    const response = await adminAxios.get(
      "/api/admin/profile"
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch admin profile"
    );
  }
};
/* =========================================
   UPDATE ADMIN PROFILE
========================================= */

export const updateAdminProfile = async ({
  fullName,
  email,
  phone,
}) => {
  try {
    const response = await adminAxios.patch(
      "/api/admin/profile",
      {
        fullName,
        email,
        phone,
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to update admin profile"
    );
  }
};