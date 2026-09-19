import axiosInstance from "../../../../lib/axios";

// ============================================
// GET USER PROFILE
// ============================================

export const getUserProfile = async () => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axiosInstance.get(
    "/api/user/profile",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ============================================
// UPDATE USER PROFILE
// ============================================

export const updateUserProfile = async (
  profileData
) => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axiosInstance.put(
    "/api/user/profile",
    profileData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },

      transformRequest: [
        (data) => data,
      ],
    }
  );

  return response.data;
};

// ============================================
// SEND EMAIL CHANGE OTP
// ============================================

export const sendEmailChangeOtp = async (
  newEmail
) => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axiosInstance.post(
    "/api/user/profile/email/send-otp",
    {
      newEmail,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ============================================
// VERIFY EMAIL CHANGE OTP
// ============================================

export const verifyEmailChangeOtp = async (
  otp
) => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axiosInstance.post(
    "/api/user/profile/email/verify-otp",
    {
      otp,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};

// ============================================
// CHANGE PASSWORD
// ============================================

export const changePassword = async ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await axiosInstance.post(
    "/api/user/profile/change-password",
    {
      currentPassword,
      newPassword,
      confirmPassword,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return response.data;
};