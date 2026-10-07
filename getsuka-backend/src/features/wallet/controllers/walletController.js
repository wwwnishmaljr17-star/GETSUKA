import mongoose from "mongoose";

import Wallet from "../models/wallet.js";

// =========================================================
// GET USER WALLET
// =========================================================

export const getWallet = async (
  req,
  res
) => {
  try {
    const userId =
      req.user.userId;

    let wallet =
      await Wallet.findOne({
        userId,
      });

    // -------------------------------------------------------
    // CREATE WALLET IF IT DOES NOT EXIST
    // -------------------------------------------------------

    if (!wallet) {
      wallet = await Wallet.create({
        userId,
        balance: 0,
        transactions: [],
      });
    }

    return res.status(200).json({
      success: true,

      wallet: {
        _id: wallet._id,
        userId: wallet.userId,
        balance: wallet.balance,
        transactions:
          wallet.transactions,
        createdAt:
          wallet.createdAt,
        updatedAt:
          wallet.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Get Wallet Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get wallet",
    });
  }
};

// =========================================================
// GET WALLET TRANSACTIONS
// =========================================================

export const getWalletTransactions =
  async (
    req,
    res
  ) => {
    try {
      const userId =
        req.user.userId;

      let wallet =
        await Wallet.findOne({
          userId,
        });

      // -----------------------------------------------------
      // CREATE WALLET IF IT DOES NOT EXIST
      // -----------------------------------------------------

      if (!wallet) {
        wallet =
          await Wallet.create({
            userId,
            balance: 0,
            transactions: [],
          });
      }

      const transactions = [
        ...wallet.transactions,
      ].reverse();

      return res.status(200).json({
        success: true,

        balance:
          wallet.balance,

        transactions,
      });
    } catch (error) {
      console.error(
        "Get Wallet Transactions Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get wallet transactions",
      });
    }
  };

// =========================================================
// CREDIT WALLET
// =========================================================
//
// Used for:
//
// 1. Razorpay wallet top-up
// 2. Order cancellation refund
// 3. Order return refund
// 4. Manual admin credit
//
// =========================================================

export const creditWallet = async ({
  userId,
  amount,
  reason,
  description = "",
  orderId = null,
  orderNumber = "",
  razorpayOrderId = "",
  razorpayPaymentId = "",
}) => {
  // -------------------------------------------------------
  // VALIDATE USER ID
  // -------------------------------------------------------

  if (
    !userId ||
    !mongoose.Types.ObjectId.isValid(
      userId
    )
  ) {
    throw new Error(
      "Invalid user ID"
    );
  }

  // -------------------------------------------------------
  // VALIDATE AMOUNT
  // -------------------------------------------------------

  const creditAmount =
    Number(amount);

  if (
    !Number.isFinite(
      creditAmount
    ) ||
    creditAmount <= 0
  ) {
    throw new Error(
      "Invalid wallet credit amount"
    );
  }

  // -------------------------------------------------------
  // VALIDATE CREDIT REASON
  // -------------------------------------------------------

  const allowedReasons = [
    "wallet_topup",
    "order_cancellation_refund",
    "order_return_refund",
    "manual_credit",
  ];

  if (
    !allowedReasons.includes(
      reason
    )
  ) {
    throw new Error(
      "Invalid wallet credit reason"
    );
  }

  // -------------------------------------------------------
  // PREVENT DUPLICATE RAZORPAY TOP-UP
  // -------------------------------------------------------
  //
  // If the same Razorpay payment has already
  // been credited, do not credit it again.
  //
  // This protects against:
  //
  // verify request
  //      ↓
  // network retry
  //      ↓
  // verify request again
  //
  // -------------------------------------------------------

  if (
    reason === "wallet_topup" &&
    razorpayPaymentId
  ) {
    const existingWallet =
      await Wallet.findOne({
        userId,
        "transactions.razorpayPaymentId":
          razorpayPaymentId,
      });

    if (existingWallet) {
      const existingTransaction =
        existingWallet.transactions.find(
          (transaction) =>
            transaction.razorpayPaymentId ===
            razorpayPaymentId
        );

      return {
        wallet:
          existingWallet,

        transaction:
          existingTransaction || null,

        alreadyCredited:
          true,
      };
    }
  }

  // -------------------------------------------------------
  // GET OR CREATE WALLET
  // -------------------------------------------------------

  let wallet =
    await Wallet.findOne({
      userId,
    });

  if (!wallet) {
    wallet =
      await Wallet.create({
        userId,
        balance: 0,
        transactions: [],
      });
  }

  // -------------------------------------------------------
  // CALCULATE NEW BALANCE
  // -------------------------------------------------------

  const newBalance =
    Number(
      wallet.balance
    ) +
    creditAmount;

  // -------------------------------------------------------
  // CREATE TRANSACTION
  // -------------------------------------------------------

  const transaction = {
    type: "credit",

    amount:
      creditAmount,

    reason,

    description,

    orderId,

    orderNumber,

    razorpayOrderId,

    razorpayPaymentId,

    balanceAfterTransaction:
      newBalance,
  };

  // -------------------------------------------------------
  // UPDATE WALLET
  // -------------------------------------------------------

  wallet.balance =
    newBalance;

  wallet.transactions.push(
    transaction
  );

  await wallet.save();

  // -------------------------------------------------------
  // GET CREATED TRANSACTION
  // -------------------------------------------------------

  const createdTransaction =
    wallet.transactions[
      wallet.transactions.length - 1
    ];

  return {
    wallet,

    transaction:
      createdTransaction,

    alreadyCredited:
      false,
  };
};

// =========================================================
// DEBIT WALLET
// =========================================================
//
// Used when wallet balance is used for an order.
//
// =========================================================

export const debitWallet = async ({
  userId,
  amount,
  reason = "wallet_payment",
  description = "",
  orderId = null,
  orderNumber = "",
}) => {
  // -------------------------------------------------------
  // VALIDATE USER ID
  // -------------------------------------------------------

  if (
    !userId ||
    !mongoose.Types.ObjectId.isValid(
      userId
    )
  ) {
    throw new Error(
      "Invalid user ID"
    );
  }

  // -------------------------------------------------------
  // VALIDATE AMOUNT
  // -------------------------------------------------------

  const debitAmount =
    Number(amount);

  if (
    !Number.isFinite(
      debitAmount
    ) ||
    debitAmount <= 0
  ) {
    throw new Error(
      "Invalid wallet debit amount"
    );
  }

  // -------------------------------------------------------
  // VALIDATE DEBIT REASON
  // -------------------------------------------------------

  const allowedReasons = [
    "wallet_payment",
    "manual_debit",
  ];

  if (
    !allowedReasons.includes(
      reason
    )
  ) {
    throw new Error(
      "Invalid wallet debit reason"
    );
  }

  // -------------------------------------------------------
  // FIND WALLET
  // -------------------------------------------------------

  const wallet =
    await Wallet.findOne({
      userId,
    });

  if (!wallet) {
    throw new Error(
      "Wallet not found"
    );
  }

  // -------------------------------------------------------
  // CHECK BALANCE
  // -------------------------------------------------------

  if (
    Number(wallet.balance) <
    debitAmount
  ) {
    throw new Error(
      "Insufficient wallet balance"
    );
  }

  // -------------------------------------------------------
  // CALCULATE NEW BALANCE
  // -------------------------------------------------------

  const newBalance =
    Number(
      wallet.balance
    ) -
    debitAmount;

  // -------------------------------------------------------
  // CREATE TRANSACTION
  // -------------------------------------------------------

  const transaction = {
    type: "debit",

    amount:
      debitAmount,

    reason,

    description,

    orderId,

    orderNumber,

    razorpayOrderId: "",

    razorpayPaymentId: "",

    balanceAfterTransaction:
      newBalance,
  };

  // -------------------------------------------------------
  // UPDATE WALLET
  // -------------------------------------------------------

  wallet.balance =
    newBalance;

  wallet.transactions.push(
    transaction
  );

  await wallet.save();

  // -------------------------------------------------------
  // GET CREATED TRANSACTION
  // -------------------------------------------------------

  const createdTransaction =
    wallet.transactions[
      wallet.transactions.length - 1
    ];

  return {
    wallet,

    transaction:
      createdTransaction,

    alreadyCredited:
      false,
  };
};