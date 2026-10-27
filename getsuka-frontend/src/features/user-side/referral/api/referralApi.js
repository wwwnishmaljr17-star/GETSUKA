import axiosInstance from "../../../../lib/axios";

// =========================================================
// GET MY REFERRAL DETAILS
// =========================================================

export const getMyReferral = async () => {
  const response = await axiosInstance.get(
    "/api/user/referrals"
  );

  return response.data;
};

// =========================================================
// CREATE / GET REFERRAL LINK
// =========================================================

export const createReferral = async () => {
  const response = await axiosInstance.post(
    "/api/user/referrals/create"
  );

  return response.data;
};

// =========================================================
// APPLY REFERRAL CODE
// =========================================================

export const applyReferral = async (
  referralCode,
  referredUserId
) => {
  const response = await axiosInstance.post(
    "/api/user/referrals/apply",
    {
      referralCode,
      referredUserId,
    }
  );

  return response.data;
};

// =========================================================
// GET REFERRAL HISTORY
// =========================================================

export const getReferralHistory = async () => {
  const response = await axiosInstance.get(
    "/api/user/referrals/history"
  );

  return response.data;
};