import axiosInstance from "../../../lib/axios";

export const adminLogin = async (loginData) => {
  try {
    const response = await axiosInstance.post(
      "/api/admin/auth/login",
      loginData
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Admin login failed"
    );
  }
};
export const adminForgotPassword = async (email) => {
  try {
    const response = await axiosInstance.post(
      "/api/admin/auth/forgot-password",
      {
        email,
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to send OTP"
    );
  }
};
export const adminVerifyOtp = async (email, otp) => {
  try {
    const response = await axiosInstance.post(
      "/api/admin/auth/verify-otp",
      {
        email,
        otp,
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "OTP verification failed"
    );
  }
};
export const adminResetPassword = async (
  resetToken,
  newPassword
) => {
  try {
    const response = await axiosInstance.post(
      "/api/admin/auth/reset-password",
      {
        resetToken,
        newPassword,
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to reset password"
    );
  }
};