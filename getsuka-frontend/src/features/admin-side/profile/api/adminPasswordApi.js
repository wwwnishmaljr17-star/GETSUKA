import adminAxios from "../../../../lib/adminAxios";

/* =========================================
   CHANGE ADMIN PASSWORD
========================================= */

export const changeAdminPassword = async ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  try {
    const response = await adminAxios.patch(
      "/api/admin/profile/change-password",
      {
        currentPassword,
        newPassword,
        confirmPassword,
      }
    );

    return response.data;

  } catch (error) {

    throw new Error(
      error.response?.data?.message ||
        "Failed to update password"
    );
  }
};