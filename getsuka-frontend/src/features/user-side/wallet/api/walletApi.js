import axiosInstance from "../../../../lib/axios";

// =========================================================
// GET WALLET
// =========================================================

export const getWallet = async () => {
  try {
    const response =
      await axiosInstance.get(
        "/api/user/wallet"
      );

    return response.data;
  } catch (error) {
    console.error(
      "Get Wallet Error:",
      error
    );

    throw error;
  }
};

// =========================================================
// GET WALLET TRANSACTIONS
// =========================================================

export const getWalletTransactions =
  async () => {
    try {
      const response =
        await axiosInstance.get(
          "/api/user/wallet/transactions"
        );

      return response.data;
    } catch (error) {
      console.error(
        "Get Wallet Transactions Error:",
        error
      );

      throw error;
    }
  };

// =========================================================
// CREATE WALLET TOP-UP RAZORPAY ORDER
// =========================================================

export const createWalletTopupOrder =
  async (amount) => {
    try {
      const response =
        await axiosInstance.post(
          "/api/payment/wallet/topup/create-order",
          {
            amount,
          }
        );

      return response.data;
    } catch (error) {
      console.error(
        "Create Wallet Top-Up Order Error:",
        error
      );

      throw error;
    }
  };

// =========================================================
// VERIFY WALLET TOP-UP RAZORPAY PAYMENT
// =========================================================

export const verifyWalletTopupPayment =
  async ({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  }) => {
    try {
      const response =
        await axiosInstance.post(
          "/api/payment/wallet/topup/verify-payment",
          {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
          }
        );

      return response.data;
    } catch (error) {
      console.error(
        "Verify Wallet Top-Up Payment Error:",
        error
      );

      throw error;
    }
  };