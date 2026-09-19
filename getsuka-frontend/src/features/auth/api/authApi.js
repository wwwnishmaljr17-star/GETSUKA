import axiosInstance from "../../../lib/axios";

// REGISTER
export const registerUser = async (userData) => {
  try {
    const response = await axiosInstance.post(
      "/api/auth/register",
      userData
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Registration failed"
    );
  }
};

// VERIFY OTP
export const verifyOtp = async (otpData) => {
  try {
    const response = await axiosInstance.post(
      "/api/auth/verify-otp",
      otpData
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "OTP verification failed"
    );
  }
};

// RESEND OTP
export const resendOtp = async (otpData) => {
  try {
    const response = await axiosInstance.post(
      "/api/auth/resend-otp",
      otpData
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to resend OTP"
    );
  }
};

// LOGIN USER
export const loginUser = async (loginData) => {
  try {
    const response = await axiosInstance.post(
      "/api/auth/login",
      loginData
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Login failed"
    );
  }
};

// FORGOT PASSWORD
export const forgotPassword = async (email) => {
  try {
    const response = await axiosInstance.post(
      "/api/auth/forgot-password",
      { email }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to send password reset OTP"
    );
  }
};

// RESET PASSWORD
export const resetPassword = async (resetData) => {
  try {
    const response = await axiosInstance.post(
      "/api/auth/reset-password",
      resetData
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to reset password"
    );
  }
};

// GOOGLE LOGIN
export const googleLogin = async (credential) => {
  try {
    const response = await axiosInstance.post(
      "/api/auth/google",
      {
        credential,
      }
    );

    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Google login failed"
    );
  }
};